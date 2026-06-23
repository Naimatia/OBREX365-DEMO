// services/firebase/LeadService.js
import { where } from 'configs/FirebaseConfig';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  getFirestore,
  writeBatch ,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig'; // Add this import
import BaseFirebaseService from './BaseFirebaseService';
import { convertToLeadModel, LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import ContactService from './ContactService';
import { ContactStatus, ContactType  } from 'models/ContactModel';
import sellerActivityService, { ActivityTypes, EntityTypes } from './SellerActivityService';

// Remove CrmModels import - we'll use 'leads', 'contacts' directly

/**
 * Service for managing leads with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class LeadService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('leads', convertToLeadModel);
    this.contactService = ContactService;
  }

  /**
   * Create a new lead with automatic contact creation
   * @param {Object} leadData - Lead data
   * @param {boolean} createContact - Whether to auto-create contact
   * @returns {Promise<Object>} - Created lead with contact info
   */
  async create(leadData, createContact = false) {
    try {
      // Prepare lead data
      const lead = {
        ...leadData,
        status: leadData.status || LeadStatus.NEW,
        convertedContactId: null,
        convertedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Create lead
      const leadRef = await addDoc(collection(db, 'leads'), lead);
      const leadId = leadRef.id;
      let contactId = null;

      // Auto-create contact if requested
      if (createContact || leadData.status === LeadStatus.CONVERTED) {
        contactId = await this.createContactFromLead(leadId, lead);
      }

          // Log activity
    if (leadData.seller_id || leadData.createdBy) {
      const sellerId = leadData.seller_id || leadData.createdBy;
      await this.logLeadActivity(
        sellerId,
        leadData.company_id,
        ActivityTypes.LEAD_CREATED,
        leadId,
        leadData,
        { name: leadData.name, email: leadData.email },
        { status: leadData.status || LeadStatus.NEW, source: leadData.source }
      );
    }


      return {
        id: leadId,
        ...lead,
        contactId: contactId
      };
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  }

  async logLeadActivity(sellerId, companyId, activityType, leadId, leadData, details = {}, metadata = {}) {
  return sellerActivityService.logActivity({
    sellerId,
    companyId,
    activityType,
    entityType: EntityTypes.LEAD,
    entityId: leadId,
    entityName: leadData?.name || details?.name || 'Unknown Lead',
    details: {
      ...details,
      name: leadData?.name || details?.name,
      email: leadData?.email || details?.email,
      phone: leadData?.phoneNumber || details?.phone,
      status: leadData?.status || details?.status,
    },
    metadata,
  });
}


  /**
   * Create a contact from lead data
   * @param {string} leadId - Lead ID
   * @param {Object} leadData - Lead data
   * @returns {Promise<string>} - Created contact ID
   */
async createContactFromLead(leadId, leadData) {
  try {
    // Ensure all required fields have values
    const contactData = {
      leadId: leadId,
      name: leadData.name || 'Unknown',
      firstName: leadData.name?.split(' ')[0] || '',
      lastName: leadData.name?.split(' ').slice(1).join(' ') || '',
      phone: leadData.phoneNumber || '',
      phoneNumber: leadData.phoneNumber || '',
      email: leadData.email || '',
      status: ContactStatus.ACTIVE, // Now this will work
      company_id: leadData.company_id || '',
      region: leadData.region || '',
      // Additional fields from lead
      secondaryEmail: leadData.secondaryEmail || '',
      phoneNumber2: leadData.phoneNumber2 || '',
      lookingFor: leadData.lookingFor || '',
      Budget: leadData.Budget || null,
      InterestLevel: leadData.InterestLevel || 'Medium',
      source: leadData.RedirectedFrom || leadData.source || 'direct',
      assignedTo: leadData.assignedTo || null,
      assignedAt: leadData.assignedAt || null,
      Notes: leadData.Notes || [],
      CreationDate: leadData.CreationDate || serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // Contact specific fields
      type: ContactType.LEAD,
    };

    // Remove any undefined values to prevent Firebase errors
    Object.keys(contactData).forEach(key => {
      if (contactData[key] === undefined) {
        delete contactData[key];
      }
    });

    const contactRef = await addDoc(collection(db, 'contacts'), contactData);
    const contactId = contactRef.id;

    // Update lead with contact ID
    await this.update(leadId, {
      convertedContactId: contactId,
      convertedAt: serverTimestamp(),
      status: LeadStatus.CONVERTED,
      updatedAt: serverTimestamp()
    });

    return contactId;
  } catch (error) {
    console.error('Error creating contact from lead:', error);
    throw error;
  }
}

  /**
   * Convert a lead to contact (manual conversion)
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} - Created contact
   */
  async convertToContact(leadId) {
    try {
      const lead = await this.getById(leadId);
      
      if (!lead) {
        throw new Error('Lead not found');
      }

      if (lead.convertedContactId) {
        throw new Error('Lead already converted to contact');
      }

      // Create contact from lead
      const contactId = await this.createContactFromLead(leadId, lead);
      
      // Update lead status
      await this.update(leadId, {
        status: LeadStatus.CONVERTED,
        convertedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Return the created contact
      const contact = await this.contactService.getById(contactId);
      return contact;
    } catch (error) {
      console.error('Error converting lead to contact:', error);
      throw error;
    }
  }

  /**
   * Bulk convert leads to contacts
   * @param {Array<string>} leadIds - Array of lead IDs
   * @returns {Promise<Object>} - Results of conversion
   */
  async bulkConvertToContacts(leadIds) {
    const results = {
      converted: [],
      failed: [],
      skipped: []
    };

    for (const leadId of leadIds) {
      try {
        const lead = await this.getById(leadId);
        
        if (!lead) {
          results.failed.push({ leadId, error: 'Lead not found' });
          continue;
        }

        if (lead.convertedContactId) {
          results.skipped.push({ leadId, reason: 'Already converted' });
          continue;
        }

        if (lead.status === LeadStatus.CONVERTED) {
          results.skipped.push({ leadId, reason: 'Already converted status' });
          continue;
        }

        // Convert to contact
        const contact = await this.convertToContact(leadId);
        results.converted.push({ leadId, contactId: contact.id });
      } catch (error) {
        results.failed.push({ leadId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Get leads by status
   * @param {string} companyId - Company ID
   * @param {string} status - Lead status
   * @returns {Promise<Array>} - Array of leads
   */
  async getLeadsByStatus(companyId, status) {
    try {
      const q = query(
        collection(db, 'leads'),
        where('company_id', '==', companyId),
        where('status', '==', status)
      );
      
      const querySnapshot = await getDocs(q);
      const leads = [];
      
      querySnapshot.forEach((doc) => {
        leads.push({ id: doc.id, ...doc.data() });
      });
      
      return leads;
    } catch (error) {
      console.error('Error getting leads by status:', error);
      throw error;
    }
  }

  /**
   * Update lead status and optionally create contact
   * @param {string} leadId - Lead ID
   * @param {string} newStatus - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} - Updated lead
   */
async updateStatus(leadId, newStatus, additionalData = {}) {
  try {
    const lead = await this.getById(leadId);
    
    if (!lead) {
      throw new Error('Lead not found');
    }

    const oldStatus = lead.status;

    // If converting to CONVERTED, automatically create contact if not exists
    if (newStatus === LeadStatus.CONVERTED && !lead.convertedContactId) {
      await this.convertToContact(leadId);
    }

    // Update lead
    const updateData = {
      status: newStatus,
      ...additionalData,
      updatedAt: serverTimestamp()
    };

    await this.update(leadId, updateData);
    
    // Log status change
    await this.logLeadActivity(
      lead.seller_id || lead.createdBy,
      lead.company_id,
      ActivityTypes.LEAD_STATUS_CHANGED,
      leadId,
      lead,
      { 
        name: lead.name,
        previousStatus: oldStatus,
        newStatus: newStatus,
      },
      { 
        oldStatus: oldStatus, 
        newStatus: newStatus,
        converted: newStatus === LeadStatus.CONVERTED,
      }
    );

    // If converted, log conversion
    if (newStatus === LeadStatus.CONVERTED && lead.convertedContactId) {
      await this.logLeadActivity(
        lead.seller_id || lead.createdBy,
        lead.company_id,
        ActivityTypes.LEAD_CONVERTED,
        leadId,
        lead,
        { 
          name: lead.name,
          contactId: lead.convertedContactId,
        },
        { 
          convertedAt: new Date().toISOString(),
        }
      );
    }
    
    // Return updated lead
    return this.getById(leadId);
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
}

  /**
   * Get leads with their contact info (if converted)
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} - Array of leads with contact info
   */
  async getLeadsWithContacts(companyId) {
    try {
      const leads = await this.getLeadsByCompany(companyId);
      
      // Get contacts for converted leads
      const leadsWithContacts = await Promise.all(
        leads.map(async (lead) => {
          if (lead.convertedContactId) {
            try {
              const contact = await this.contactService.getById(lead.convertedContactId);
              return { ...lead, contact };
            } catch (error) {
              return { ...lead, contact: null };
            }
          }
          return lead;
        })
      );

      return leadsWithContacts;
    } catch (error) {
      console.error('Error getting leads with contacts:', error);
      throw error;
    }
  }

  /**
   * Get leads by seller ID
   * @param {string} companyId - Company ID
   * @param {string} sellerId - Seller ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of leads
   */
  async getLeadsBySeller(companyId, sellerId, options = {}) {
    const sellerFilter = ['seller_id', '==', sellerId];
    const filters = options.filters ? [...options.filters, sellerFilter] : [sellerFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Search leads by name, email, or phone
   * @param {string} companyId - Company ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of leads
   */
  async searchLeads(companyId, searchTerm, options = {}) {
    if (!searchTerm) {
      return this.getAllByCompany(companyId, options);
    }
    
    const db = getFirestore();
    const leadsRef = collection(db, 'leads');
    
    const nameQuery = query(
      leadsRef,
      where('company_id', '==', companyId),
      where('name', '>=', searchTerm),
      where('name', '<=', searchTerm + '\uf8ff')
    );
    
    const emailQuery = query(
      leadsRef,
      where('company_id', '==', companyId),
      where('email', '>=', searchTerm),
      where('email', '<=', searchTerm + '\uf8ff')
    );
    
    const phoneQuery = query(
      leadsRef,
      where('company_id', '==', companyId),
      where('phoneNumber', '>=', searchTerm),
      where('phoneNumber', '<=', searchTerm + '\uf8ff')
    );
    
    try {
      const [nameSnapshot, emailSnapshot, phoneSnapshot] = await Promise.all([
        getDocs(nameQuery),
        getDocs(emailQuery),
        getDocs(phoneQuery)
      ]);
      
      const results = new Map();
      
      const processSnapshot = (snapshot) => {
        snapshot.forEach(doc => {
          if (!results.has(doc.id)) {
            results.set(doc.id, convertToLeadModel(doc));
          }
        });
      };
      
      processSnapshot(nameSnapshot);
      processSnapshot(emailSnapshot);
      processSnapshot(phoneSnapshot);
      
      return Array.from(results.values());
    } catch (error) {
      console.error('Error searching leads:', error);
      throw error;
    }
  }

  /**
   * Get recent leads for a company
   * @param {string} companyId - Company ID
   * @param {number} limit - Number of leads to return
   * @returns {Promise<Array>} - Array of leads
   */
  async getRecentLeads(companyId, limit = 5) {
    return this.getAllByCompany(companyId, {
      orderByFields: [['createdAt', 'desc']],
      limitCount: limit
    });
  }

  /**
   * Get lead statistics by status
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} - Statistics by status
   */
  async getLeadStats(companyId) {
    try {
      const leads = await this.getLeadsByCompany(companyId);
      
      const stats = {
        total: leads.length,
        byStatus: {},
        byInterest: {},
        converted: 0,
        notConverted: 0
      };

      leads.forEach(lead => {
        // Status stats
        const status = lead.status || LeadStatus.NEW;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Interest stats
        const interest = lead.InterestLevel || LeadInterestLevel.MEDIUM;
        stats.byInterest[interest] = (stats.byInterest[interest] || 0) + 1;

        // Conversion stats
        if (lead.convertedContactId || status === LeadStatus.CONVERTED) {
          stats.converted++;
        } else {
          stats.notConverted++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting lead stats:', error);
      throw error;
    }
  }

  /**
   * Assign or reassign a lead to a user/seller
   * @param {string} leadId - Lead document ID
   * @param {Object} user - User/seller object
   * @returns {Promise<Object>} - Updated lead data
   */
async assignTo(leadId, user) {
  if (!leadId || !user?.id) {
    throw new Error('Missing leadId or user.id');
  }

  const now = serverTimestamp();
  const lead = await this.getById(leadId);

  const updateData = {
    seller_id: user.id,
    assignedAt: now,
    updatedAt: now,
    assignedTo: {
      id: user.id,
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }
  };

  try {
    await this.update(leadId, updateData);
    const updatedLead = await this.getById(leadId);
    
    // Log assignment
    if (lead) {
      await this.logLeadActivity(
        user.id,
        lead.company_id,
        ActivityTypes.LEAD_ASSIGNED,
        leadId,
        lead,
        { 
          name: lead.name,
          assignedTo: user.id,
          assignedByName: `${user.firstName || ''} ${user.lastName || ''}`.trim()
        },
        { 
          previousSellerId: lead.seller_id,
          newSellerId: user.id,
        }
      );
    }
    
    return updatedLead;
  } catch (error) {
    console.error('Failed to assign lead:', error);
    throw error;
  }
}

  /**
   * Get leads by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of leads
   */
  async getLeadsByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  /**
   * Get a single lead by ID
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object>} - Lead data
   */
 async getById(leadId, sellerId = null) {
  try {
    const docRef = doc(db, 'leads', leadId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const lead = convertToLeadModel(docSnap);
      
      // Log view if sellerId provided
      if (sellerId) {
        await this.logLeadActivity(
          sellerId,
          lead.company_id,
          ActivityTypes.LEAD_VIEWED,
          leadId,
          lead,
          { name: lead.name },
          { status: lead.status }
        );
      }
      
      return lead;
    }
    return null;
  } catch (error) {
    console.error('Error getting lead by ID:', error);
    throw error;
  }
}

  /**
   * Update a lead
   * @param {string} leadId - Lead ID
   * @param {Object} data - Data to update
   * @returns {Promise<void>}
   */
  async update(leadId, data) {
    try {
      const docRef = doc(db, 'leads', leadId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  }

  /**
   * Delete a lead
   * @param {string} leadId - Lead ID
   * @returns {Promise<void>}
   */
async delete(leadId) {
  try {
    const lead = await this.getById(leadId);
    const docRef = doc(db, 'leads', leadId);
    await deleteDoc(docRef);
    
    // Log deletion
    if (lead) {
      await this.logLeadActivity(
        lead.seller_id || lead.createdBy,
        lead.company_id,
        'lead_deleted',
        leadId,
        lead,
        { name: lead.name },
        { deletedAt: new Date().toISOString() }
      );
    }
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}

  /**
   * Get all leads for a company (with filters)
   * @param {string} companyId - Company ID
   * @param {Object} options - Options including filters, orderBy, limit
   * @returns {Promise<Array>} - Array of leads
   */
  async getAllByCompany(companyId, options = {}) {
    try {
      let q = query(collection(db, 'leads'), where('company_id', '==', companyId));
      
      // Apply additional filters
      if (options.filters && options.filters.length > 0) {
        options.filters.forEach(filter => {
          q = query(q, where(filter[0], filter[1], filter[2]));
        });
      }
      
      // Apply order by
      if (options.orderByFields && options.orderByFields.length > 0) {
        options.orderByFields.forEach(field => {
          q = query(q, orderBy(field[0], field[1] || 'asc'));
        });
      } else {
        q = query(q, orderBy('createdAt', 'desc'));
      }
      
      // Apply limit
      if (options.limitCount) {
        q = query(q, limit(options.limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const leads = [];
      
      querySnapshot.forEach((doc) => {
        leads.push(convertToLeadModel(doc));
      });
      
      return leads;
    } catch (error) {
      console.error('Error getting leads by company:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const leadService = new LeadService();
export default leadService;