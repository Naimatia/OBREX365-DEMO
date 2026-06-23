import { db } from 'configs/FirebaseConfig';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  serverTimestamp,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { convertToContactModel, ContactStatus } from 'models/ContactModel';
import dealService from './DealService';
import sellerActivityService, { ActivityTypes, EntityTypes } from './SellerActivityService';

class ContactService {
  /**
   * Get a contact by ID
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} - Contact data
   */
  async getById(contactId) {
    try {
      const docRef = doc(db, 'contacts', contactId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return convertToContactModel(docSnap);
      }
      return null;
    } catch (error) {
      console.error('Error getting contact:', error);
      throw error;
    }
  }

  async logContactActivity(sellerId, companyId, activityType, contactId, contactData, details = {}, metadata = {}) {
  return sellerActivityService.logActivity({
    sellerId,
    companyId,
    activityType,
    entityType: EntityTypes.CONTACT,
    entityId: contactId,
    entityName: contactData?.name || details?.name || 'Unknown Contact',
    details: {
      ...details,
      name: contactData?.name || details?.name,
      email: contactData?.email || details?.email,
      phone: contactData?.phoneNumber || details?.phone,
      status: contactData?.status || details?.status,
    },
    metadata,
  });
}

  /**
   * Get contacts by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of contacts
   */
  async getContactsByCompany(companyId, options = {}) {
    try {
      let q = query(collection(db, 'contacts'), where('company_id', '==', companyId));
      
      if (options.status) {
        q = query(q, where('status', '==', options.status));
      }
      
      if (options.orderBy) {
        q = query(q, orderBy(options.orderBy.field, options.orderBy.direction || 'desc'));
      } else {
        q = query(q, orderBy('createdAt', 'desc'));
      }

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      const contacts = [];

      querySnapshot.forEach((doc) => {
        contacts.push(convertToContactModel(doc));
      });

      return contacts;
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  }

  /**
   * Get contacts by lead ID
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} - Contact data
   */
  async getByLeadId(leadId) {
    try {
      const q = query(collection(db, 'contacts'), where('leadId', '==', leadId));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return convertToContactModel(doc);
      }
      return null;
    } catch (error) {
      console.error('Error getting contact by lead ID:', error);
      throw error;
    }
  }

  /**
   * Create a new contact
   * @param {Object} contactData - Contact data
   * @returns {Promise<Object>} - Created contact
   */
async create(contactData) {
  try {
    const contact = {
      ...contactData,
      status: contactData.status || ContactStatus.ACTIVE,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    Object.keys(contact).forEach(key => {
      if (contact[key] === undefined) {
        delete contact[key];
      }
    });
    
    const docRef = await addDoc(collection(db, 'contacts'), contact);
    const contactId = docRef.id;
    
    // Log activity
    if (contactData.seller_id || contactData.createdBy) {
      const sellerId = contactData.seller_id || contactData.createdBy;
      await this.logContactActivity(
        sellerId,
        contactData.company_id,
        ActivityTypes.CONTACT_CREATED,
        contactId,
        contactData,
        { 
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phoneNumber,
        },
        { 
          status: contactData.status || ContactStatus.ACTIVE,
          source: contactData.source,
        }
      );
    }
    
    return {
      id: contactId,
      ...contact
    };
  } catch (error) {
    console.error('Error creating contact:', error);
    throw error;
  }
}

  /**
   * Update a contact
   * @param {string} contactId - Contact ID
   * @param {Object} data - Data to update
   * @returns {Promise<void>}
   */
  async update(contactId, data) {
    try {
      const docRef = doc(db, 'contacts', contactId);
      
      Object.keys(data).forEach(key => {
        if (data[key] === undefined) {
          delete data[key];
        }
      });
      
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  }

  /**
   * Delete a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<void>}
   */
  async delete(contactId) {
    try {
      const docRef = doc(db, 'contacts', contactId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  }

  /**
   * Add a note to a contact
   * @param {string} contactId - Contact ID
   * @param {string} noteText - Note text
   * @returns {Promise<void>}
   */
async addNote(contactId, noteText) {
  try {
    const contactRef = doc(db, 'contacts', contactId);
    const contact = await this.getById(contactId);
    
    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      note: noteText.trim(),
      CreationDate: new Date(),
      CreatedBy: null,
    };

    await updateDoc(contactRef, {
      Notes: arrayUnion(newNote),
      updatedAt: serverTimestamp()
    });
    
    // Log note addition
    if (contact) {
      await this.logContactActivity(
        contact.seller_id || contact.createdBy,
        contact.company_id,
        ActivityTypes.CONTACT_NOTE_ADDED,
        contactId,
        contact,
        { 
          name: contact.name,
          note: noteText.substring(0, 100) + (noteText.length > 100 ? '...' : ''),
          noteId: newNote.id,
        },
        { 
          noteLength: noteText.length,
        }
      );
    }
  } catch (error) {
    console.error('Error adding note:', error);
    throw error;
  }
}

  /**
   * Update a note
   * @param {string} contactId - Contact ID
   * @param {string} noteId - Note ID
   * @param {string} newNoteText - New note text
   * @returns {Promise<void>}
   */
  async updateNote(contactId, noteId, newNoteText) {
    try {
      const contactRef = doc(db, 'contacts', contactId);
      const contactDoc = await getDoc(contactRef);

      if (!contactDoc.exists()) {
        throw new Error('Contact not found');
      }

      const data = contactDoc.data();
      const notes = Array.isArray(data.Notes) ? [...data.Notes] : [];

      const noteIndex = notes.findIndex(n => n.id === noteId);
      if (noteIndex === -1) {
        throw new Error('Note not found');
      }

      notes[noteIndex] = {
        ...notes[noteIndex],
        note: newNoteText.trim(),
        LastUpdateDate: new Date()
      };

      await updateDoc(contactRef, {
        Notes: notes,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  /**
   * Delete a note
   * @param {string} contactId - Contact ID
   * @param {string} noteId - Note ID
   * @returns {Promise<void>}
   */
  async deleteNote(contactId, noteId) {
    try {
      const contactRef = doc(db, 'contacts', contactId);
      const contactDoc = await getDoc(contactRef);

      if (!contactDoc.exists()) {
        throw new Error('Contact not found');
      }

      const data = contactDoc.data();
      const notes = Array.isArray(data.Notes) ? data.Notes : [];
      
      const noteToRemove = notes.find(n => n.id === noteId);
      if (!noteToRemove) {
        throw new Error('Note not found');
      }

      await updateDoc(contactRef, {
        Notes: arrayRemove(noteToRemove),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  /**
   * Search contacts by name, email, or phone
   * @param {string} companyId - Company ID
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} - Array of contacts
   */
  async searchContacts(companyId, searchTerm) {
    try {
      if (!searchTerm) {
        return this.getContactsByCompany(companyId);
      }

      const contactsRef = collection(db, 'contacts');
      
      const nameQuery = query(
        contactsRef,
        where('company_id', '==', companyId),
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff')
      );
      
      const nameSnapshot = await getDocs(nameQuery);
      const results = [];
      
      nameSnapshot.forEach((doc) => {
        results.push(convertToContactModel(doc));
      });
      
      return results;
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw error;
    }
  }

  /**
   * Get recent contacts for a company
   * @param {string} companyId - Company ID
   * @param {number} limit - Number of contacts to return
   * @returns {Promise<Array>} - Array of contacts
   */
  async getRecentContacts(companyId, limit = 5) {
    return this.getContactsByCompany(companyId, {
      orderBy: { field: 'createdAt', direction: 'desc' },
      limit: limit
    });
  }

  /**
   * Get contacts by status
   * @param {string} companyId - Company ID
   * @param {string} status - Contact status
   * @returns {Promise<Array>} - Array of contacts
   */
  async getContactsByStatus(companyId, status) {
    return this.getContactsByCompany(companyId, { status });
  }

  /**
   * Assign a contact to a seller
   * @param {string} contactId - Contact ID
   * @param {Object} seller - Seller object with id and name
   * @returns {Promise<void>}
   */
  async assignToSeller(contactId, seller) {
    return this.update(contactId, {
      seller_id: seller.id,
      assignedTo: {
        id: seller.id,
        name: seller.name
      },
      assignedAt: serverTimestamp(),
      AffectingDate: serverTimestamp()
    });
  }

// services/firebase/ContactService.js - Complete updateStatusWithDeal method

/**
 * Update contact status and auto-create deal with full data
 * @param {string} contactId - Contact ID
 * @param {string} newStatus - New status (proposal, deal, etc.)
 * @param {Object} additionalData - Additional data for deal creation
 * @returns {Promise<Object>} - Updated contact with deal info
 */
async updateStatusWithDeal(contactId, newStatus, additionalData = {}) {
  try {
    // 1. Get the contact
    const contact = await this.getById(contactId);
    if (!contact) {
      throw new Error('Contact not found');
    }

    const oldStatus = contact.status;
    const sellerId = contact.seller_id || contact.createdBy || additionalData.seller_id;
    const companyId = contact.company_id;

    // 2. Check if status is PROPOSAL or DEAL
    const isProposal = newStatus === 'proposal' || newStatus === 'Proposal' || 
                       newStatus === ContactStatus.PROPOSAL;
    const isDeal = newStatus === 'deal' || newStatus === 'Deal' || 
                   newStatus === ContactStatus.DEAL;

    let dealId = null;
    let deal = null;

    // 3. If status is PROPOSAL or DEAL and no deal exists, create one
    if ((isProposal || isDeal) && !contact.dealId) {
      // 3a. Extract seller ID from various sources
      let sellerIdFromContact = null;
      let sellerName = '';
      let sellerEmail = '';
      let sellerPhone = '';
      let assignedTo = null;
      let assignedAt = null;

      // Check assignedTo object
      if (contact.assignedTo) {
        if (contact.assignedTo.id) {
          sellerIdFromContact = contact.assignedTo.id;
          sellerName = contact.assignedTo.name || '';
          sellerEmail = contact.assignedTo.email || '';
          sellerPhone = contact.assignedTo.phone || '';
          assignedTo = {
            id: sellerIdFromContact,
            name: sellerName,
            email: sellerEmail,
            phone: sellerPhone
          };
          assignedAt = contact.assignedAt || serverTimestamp();
        } else if (typeof contact.assignedTo === 'string') {
          sellerIdFromContact = contact.assignedTo;
        }
      }

      // Check seller_id
      if (!sellerIdFromContact && contact.seller_id) {
        sellerIdFromContact = contact.seller_id;
      }

      // Check additionalData
      if (!sellerIdFromContact && additionalData.seller_id) {
        sellerIdFromContact = additionalData.seller_id;
      }

      // 3b. Fetch seller info if we have sellerId but no name
      if (sellerIdFromContact && !sellerName) {
        try {
          const sellerDoc = await getDoc(doc(db, 'users', sellerIdFromContact));
          if (sellerDoc.exists()) {
            const sellerData = sellerDoc.data();
            sellerName = `${sellerData.firstname || ''} ${sellerData.lastname || ''}`.trim();
            sellerEmail = sellerData.email || '';
            sellerPhone = sellerData.phoneNumber || sellerData.phone || '';
            assignedTo = {
              id: sellerIdFromContact,
              name: sellerName,
              email: sellerEmail,
              phone: sellerPhone
            };
            assignedAt = serverTimestamp();
          }
        } catch (e) {
          console.warn('Could not fetch seller info:', e);
        }
      }

      // 3c. Prepare contact data for deal
      const contactData = {
        id: contact.id,
        name: contact.name || 'Unknown',
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        email: contact.email || '',
        phoneNumber: contact.phoneNumber || '',
        phone: contact.phone || '',
        region: contact.region || '',
        lookingFor: contact.lookingFor || '',
        Budget: contact.Budget || 0,
        InterestLevel: contact.InterestLevel || '',
        source: contact.source || '',
        company_id: contact.company_id || '',
        createdBy: contact.createdBy || '',
        Notes: contact.Notes || [],
        secondaryEmail: contact.secondaryEmail || '',
        phoneNumber2: contact.phoneNumber2 || '',
        assignedTo: contact.assignedTo || null,
        assignedAt: contact.assignedAt || null,
        status: contact.status || '',
        leadId: contact.leadId || '',
        type: contact.type || '',
        address: contact.address || '',
        city: contact.city || '',
        state: contact.state || '',
        country: contact.country || '',
        tags: contact.tags || [],
        socialMedia: contact.socialMedia || {},
        createdAt: contact.createdAt || null,
        updatedAt: contact.updatedAt || null
      };

      // 3d. Create deal data
      const dealData = {
        // Core deal fields
        Amount: additionalData.Amount || additionalData.Budget || contact.Budget || 0,
        Description: additionalData.Description || `Deal from contact: ${contact.name}`,
        Status: 'Opened',
        Source: 'Contacts',
        
        // References
        contact_id: contactId,
        lead_id: contact.leadId || '',
        seller_id: sellerIdFromContact || '',
        company_id: contact.company_id || '',
        property_id: additionalData.property_id || '',
        
        // Contact data (flat fields for easy access)
        contact_name: contact.name || 'Unknown',
        contact_email: contact.email || '',
        contact_phone: contact.phoneNumber || contact.phone || '',
        region: contact.region || '',
        lookingFor: contact.lookingFor || '',
        interestLevel: contact.InterestLevel || '',
        source: contact.source || '',
        
        // Seller data
        seller_name: sellerName || '',
        seller_email: sellerEmail || '',
        seller_phone: sellerPhone || '',
        
        // Assignment
        assignedTo: assignedTo,
        assignedAt: assignedAt,
        createdBy: contact.createdBy || '',
        
        // Additional fields for pipeline
        priority: additionalData.priority || 'medium',
        tags: additionalData.tags || [],
        expected_close_date: additionalData.expected_close_date || null,
        source_url: additionalData.source_url || '',
        
        // Store FULL contact data as backup
        contact_data: contactData,
        
        // Notes (copy from contact if any)
        Notes: contact.Notes || [],
        
        // Timestamps
        CreationDate: serverTimestamp(),
        LastUpdateDate: serverTimestamp()
      };

      // Clean undefined/null values
      Object.keys(dealData).forEach(key => {
        if (dealData[key] === undefined || dealData[key] === null) {
          delete dealData[key];
        }
      });

      // 3e. Create the deal
      deal = await dealService.create(dealData);
      dealId = deal.id;

      // 3f. Log DEAL_CREATED activity
      if (sellerIdFromContact || contact.createdBy) {
        await sellerActivityService.logActivity({
          sellerId: sellerIdFromContact || contact.createdBy,
          companyId: contact.company_id,
          activityType: ActivityTypes.DEAL_CREATED,
          entityType: EntityTypes.DEAL,
          entityId: dealId,
          entityName: deal.Description || 'Untitled Deal',
          details: {
            name: deal.Description,
            amount: deal.Amount,
            contactName: contact.name,
            contactId: contactId,
            source: 'Contact Conversion',
          },
          metadata: {
            status: deal.Status,
            amount: deal.Amount,
            source: 'Contacts',
            contactId: contactId,
          }
        });
      }

      // 3g. Log CONTACT_CONVERTED_TO_DEAL activity
      if (sellerIdFromContact || contact.createdBy) {
        await sellerActivityService.logActivity({
          sellerId: sellerIdFromContact || contact.createdBy,
          companyId: contact.company_id,
          activityType: ActivityTypes.CONTACT_CONVERTED_TO_DEAL,
          entityType: EntityTypes.CONTACT,
          entityId: contactId,
          entityName: contact.name,
          details: {
            contactName: contact.name,
            contactId: contactId,
            dealId: dealId,
            amount: deal.Amount,
            dealName: deal.Description,
          },
          metadata: {
            oldStatus: oldStatus,
            newStatus: newStatus,
            dealId: dealId,
            amount: deal.Amount,
            convertedAt: new Date().toISOString(),
          }
        });
      }

      console.log('Deal created successfully with ID:', dealId, 'and seller_id:', deal.seller_id);
    }

    // 4. Update contact with new status and dealId
    const updateData = {
      status: newStatus,
      ...additionalData,
      updatedAt: serverTimestamp()
    };

    if (dealId) {
      updateData.dealId = dealId;
      updateData.dealCreatedAt = serverTimestamp();
      updateData.dealAmount = deal?.Amount || 0;
      updateData.dealStatus = 'Opened';
    }

    await this.update(contactId, updateData);

    // 5. Log CONTACT_STATUS_CHANGED activity
    if (sellerId || contact.createdBy) {
      await sellerActivityService.logActivity({
        sellerId: sellerId || contact.createdBy,
        companyId: companyId || contact.company_id,
        activityType: ActivityTypes.CONTACT_STATUS_CHANGED,
        entityType: EntityTypes.CONTACT,
        entityId: contactId,
        entityName: contact.name,
        details: {
          name: contact.name,
          previousStatus: oldStatus,
          newStatus: newStatus,
          dealCreated: !!dealId,
          dealId: dealId,
        },
        metadata: {
          oldStatus: oldStatus,
          newStatus: newStatus,
          dealId: dealId,
          amount: deal?.Amount || 0,
          statusChangedAt: new Date().toISOString(),
        }
      });
    }

    // 6. If deal was created, also log the deal status (Opened)
    if (dealId && (sellerId || contact.createdBy)) {
      await sellerActivityService.logActivity({
        sellerId: sellerId || contact.createdBy,
        companyId: companyId || contact.company_id,
        activityType: ActivityTypes.DEAL_STATUS_CHANGED,
        entityType: EntityTypes.DEAL,
        entityId: dealId,
        entityName: deal?.Description || 'Untitled Deal',
        details: {
          name: deal?.Description,
          amount: deal?.Amount,
          previousStatus: null,
          newStatus: 'Opened',
          contactName: contact.name,
        },
        metadata: {
          oldStatus: null,
          newStatus: 'Opened',
          amount: deal?.Amount,
          contactId: contactId,
        }
      });
    }

    // 7. Return the updated contact with deal info
    const updatedContact = await this.getById(contactId);
    
    return {
      ...updatedContact,
      deal: deal, // Return the created deal data
      dealCreated: !!dealId,
      statusChanged: true,
      previousStatus: oldStatus,
      newStatus: newStatus,
    };

  } catch (error) {
    console.error('Error updating contact status with deal:', error);
    
    // Log error activity
    try {
      const contact = await this.getById(contactId);
      if (contact && (contact.seller_id || contact.createdBy)) {
        await sellerActivityService.logActivity({
          sellerId: contact.seller_id || contact.createdBy,
          companyId: contact.company_id,
          activityType: 'error',
          entityType: EntityTypes.CONTACT,
          entityId: contactId,
          entityName: contact.name || 'Unknown',
          details: {
            error: error.message,
            attemptedStatus: newStatus,
          },
          metadata: {
            error: error.message,
            timestamp: new Date().toISOString(),
          }
        });
      }
    } catch (logError) {
      console.error('Failed to log error activity:', logError);
    }
    
    throw error;
  }
}

  /**
   * Create a deal from contact manually (for pipeline)
   * @param {string} contactId - Contact ID
   * @param {Object} dealData - Deal data
   * @returns {Promise<Object>} - Created deal
   */
  async createDealFromContact(contactId, dealData = {}) {
    try {
      const contact = await this.getById(contactId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      // Get seller info
      let sellerName = '';
      let sellerEmail = '';
      let sellerPhone = '';
      let sellerId = contact.seller_id || dealData.seller_id || null;
      let assignedTo = null;
      let assignedAt = null;

      if (sellerId) {
        try {
          const sellerDoc = await getDoc(doc(db, 'users', sellerId));
          if (sellerDoc.exists()) {
            const sellerData = sellerDoc.data();
            sellerName = `${sellerData.firstname || ''} ${sellerData.lastname || ''}`.trim();
            sellerEmail = sellerData.email || '';
            sellerPhone = sellerData.phoneNumber || sellerData.phone || '';
            assignedTo = {
              id: sellerId,
              name: sellerName,
              email: sellerEmail,
              phone: sellerPhone
            };
            assignedAt = serverTimestamp();
          }
        } catch (e) {
          console.warn('Could not fetch seller info:', e);
        }
      }

      // Get ALL contact data
      const contactData = {
        id: contact.id,
        name: contact.name || 'Unknown',
        email: contact.email || '',
        phoneNumber: contact.phoneNumber || '',
        region: contact.region || '',
        lookingFor: contact.lookingFor || '',
        Budget: contact.Budget || 0,
        InterestLevel: contact.InterestLevel || '',
        source: contact.source || '',
        company_id: contact.company_id || '',
        createdBy: contact.createdBy || '',
        Notes: contact.Notes || [],
        assignedTo: contact.assignedTo || null,
        assignedAt: contact.assignedAt || null,
        status: contact.status || '',
        leadId: contact.leadId || '',
        tags: contact.tags || [],
        socialMedia: contact.socialMedia || {}
      };

      // Create deal
      const deal = await dealService.create({
        // Core fields
        Amount: dealData.Amount || contact.Budget || 0,
        Description: dealData.Description || `Deal from contact: ${contact.name}`,
        Status: dealData.Status || 'Opened',
        Source: dealData.Source || 'Contacts',
        
        // References
        contact_id: contactId,
        lead_id: contact.leadId || '',
        seller_id: sellerId || '',
        company_id: contact.company_id || '',
        property_id: dealData.property_id || '',
        
        // Contact data
        contact_name: contact.name || 'Unknown',
        contact_email: contact.email || '',
        contact_phone: contact.phoneNumber || contact.phone || '',
        region: contact.region || '',
        lookingFor: contact.lookingFor || '',
        interestLevel: contact.InterestLevel || '',
        source: contact.source || '',
        
        // Seller data
        seller_name: sellerName || '',
        seller_email: sellerEmail || '',
        seller_phone: sellerPhone || '',
        
        // Assignment
        assignedTo: assignedTo,
        assignedAt: assignedAt,
        createdBy: contact.createdBy || '',
        
        // Additional
        priority: dealData.priority || 'medium',
        tags: dealData.tags || [],
        expected_close_date: dealData.expected_close_date || null,
        contact_data: contactData,
        Notes: contact.Notes || [],
        ...dealData
      });

      // Update contact with deal reference
      await this.update(contactId, {
        dealId: deal.id,
        dealCreatedAt: serverTimestamp(),
        dealAmount: deal.Amount,
        dealStatus: deal.Status,
        status: ContactStatus.PROPOSAL,
        updatedAt: serverTimestamp()
      });

      return deal;
    } catch (error) {
      console.error('Error creating deal from contact:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const contactService = new ContactService();
export default contactService;