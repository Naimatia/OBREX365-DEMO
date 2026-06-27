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
  writeBatch,
  getDoc,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';
import BaseFirebaseService from './BaseFirebaseService';
import { convertToLeadModel, LeadStatus, LeadInterestLevel } from 'models/LeadModel';
import ContactService from './ContactService';
import { ContactStatus, ContactType } from 'models/ContactModel';
import sellerActivityService, { ActivityTypes, EntityTypes } from './SellerActivityService';

/**
 * Service for managing leads with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class LeadService extends BaseFirebaseService {
  constructor() {
    super('leads', convertToLeadModel);
    this.contactService = ContactService;
  }

  /**
   * Create a new lead with automatic contact creation
   */
  async create(leadData, createContact = false) {
    try {
      const lead = {
        ...leadData,
        status: leadData.status || LeadStatus.NEW,
        convertedContactId: null,
        convertedAt: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: leadData.createdBy || leadData.seller_id || null, // Track who created the lead
      };

      const leadRef = await addDoc(collection(db, 'leads'), lead);
      const leadId = leadRef.id;
      let contactId = null;

      if (createContact || leadData.status === LeadStatus.CONVERTED) {
        contactId = await this.createContactFromLead(leadId, lead);
      }

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
   */
  async createContactFromLead(leadId, leadData) {
    try {
      const contactData = {
        leadId: leadId,
        name: leadData.name || 'Unknown',
        firstName: leadData.name?.split(' ')[0] || '',
        lastName: leadData.name?.split(' ').slice(1).join(' ') || '',
        phone: leadData.phoneNumber || '',
        phoneNumber: leadData.phoneNumber || '',
        email: leadData.email || '',
        status: ContactStatus.ACTIVE,
        company_id: leadData.company_id || '',
        region: leadData.region || '',
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
        type: ContactType.LEAD,
      };

      Object.keys(contactData).forEach(key => {
        if (contactData[key] === undefined) {
          delete contactData[key];
        }
      });

      const contactRef = await addDoc(collection(db, 'contacts'), contactData);
      const contactId = contactRef.id;

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
   * Convert a lead to contact
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

      const contactId = await this.createContactFromLead(leadId, lead);
      
      await this.update(leadId, {
        status: LeadStatus.CONVERTED,
        convertedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const contact = await this.contactService.getById(contactId);
      return contact;
    } catch (error) {
      console.error('Error converting lead to contact:', error);
      throw error;
    }
  }

  /**
   * Bulk convert leads to contacts
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
   */
  async updateStatus(leadId, newStatus, additionalData = {}) {
    try {
      const lead = await this.getById(leadId);
      
      if (!lead) {
        throw new Error('Lead not found');
      }

      const oldStatus = lead.status;

      if (newStatus === LeadStatus.CONVERTED && !lead.convertedContactId) {
        await this.convertToContact(leadId);
      }

      const updateData = {
        status: newStatus,
        ...additionalData,
        updatedAt: serverTimestamp()
      };

      await this.update(leadId, updateData);
      
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
      
      return this.getById(leadId);
    } catch (error) {
      console.error('Error updating lead status:', error);
      throw error;
    }
  }

  /**
   * Get leads with their contact info (if converted)
   */
  async getLeadsWithContacts(companyId) {
    try {
      const leads = await this.getLeadsByCompany(companyId);
      
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
   * Get leads by seller ID (both created AND assigned)
   */
  async getLeadsBySeller(companyId, sellerId, options = {}) {
    try {
      // Get leads created by this seller
      const createdLeads = await this.getLeadsCreatedBySeller(companyId, sellerId, options);
      
      // Get leads assigned to this seller
      const assignedLeads = await this.getLeadsAssignedToSeller(companyId, sellerId, options);
      
      // Combine and deduplicate
      const allLeads = [...createdLeads, ...assignedLeads];
      const uniqueLeads = Array.from(
        new Map(allLeads.map(lead => [lead.id, lead])).values()
      );
      
      return uniqueLeads;
    } catch (error) {
      console.error('Error getting leads by seller:', error);
      throw error;
    }
  }

  /**
   * Get leads created by a specific seller
   */
  async getLeadsCreatedBySeller(companyId, sellerId, options = {}) {
    return this.getAllByCompany(companyId, {
      ...options,
      filters: [...(options.filters || []), ['createdBy', '==', sellerId]]
    });
  }

  /**
   * Get leads assigned to a specific seller
   */
  async getLeadsAssignedToSeller(companyId, sellerId, options = {}) {
    return this.getAllByCompany(companyId, {
      ...options,
      filters: [...(options.filters || []), ['seller_id', '==', sellerId]]
    });
  }

  /**
   * Search leads by name, email, or phone
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
   */
  async getRecentLeads(companyId, limit = 5) {
    return this.getAllByCompany(companyId, {
      orderByFields: [['createdAt', 'desc']],
      limitCount: limit
    });
  }

  /**
   * Get lead statistics by status
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
        const status = lead.status || LeadStatus.NEW;
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        const interest = lead.InterestLevel || LeadInterestLevel.MEDIUM;
        stats.byInterest[interest] = (stats.byInterest[interest] || 0) + 1;

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
   */
  async getLeadsByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  /**
   * Get a single lead by ID
   */
  async getById(leadId, sellerId = null) {
    try {
      const docRef = doc(db, 'leads', leadId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const lead = convertToLeadModel(docSnap);
        
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
   */
  async delete(leadId) {
    try {
      const lead = await this.getById(leadId);
      const docRef = doc(db, 'leads', leadId);
      await deleteDoc(docRef);
      
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
 * Get all leads for a company with advanced filtering
 * @param {string} companyId - Company ID
 * @param {Object} options - Options including:
 *   - filters: Array of [field, operator, value] filters
 *   - orderByFields: Array of [field, direction] 
 *   - limitCount: Number to limit results
 *   - dateRange: { field: 'createdAt'|'CreationDate', start: Date, end: Date }
 */
async getAllByCompany(companyId, options = {}) {
  try {
    // Start with base query - only company_id filter
    let q = query(collection(db, 'leads'), where('company_id', '==', companyId));
    
    // Apply additional filters (but avoid date filters here - handle them client-side)
    if (options.filters && options.filters.length > 0) {
      // Only add filters that are NOT date range filters
      const nonDateFilters = options.filters.filter(filter => {
        // Skip date range filters (they'll be handled client-side)
        return filter[0] !== 'createdAt' && filter[0] !== 'CreationDate';
      });
      
      nonDateFilters.forEach(filter => {
        q = query(q, where(filter[0], filter[1], filter[2]));
      });
    }
    
    // Apply order by
    if (options.orderByFields && options.orderByFields.length > 0) {
      options.orderByFields.forEach(field => {
        q = query(q, orderBy(field[0], field[1] || 'asc'));
      });
    } else {
      // Default order by createdAt
      q = query(q, orderBy('createdAt', 'desc'));
    }
    
    // Apply limit
    if (options.limitCount) {
      q = query(q, limit(options.limitCount));
    }
    
    const querySnapshot = await getDocs(q);
    let leads = [];
    
    querySnapshot.forEach((doc) => {
      leads.push(convertToLeadModel(doc));
    });
    
    // Apply date range filter client-side (if provided)
    if (options.dateRange) {
      const { field = 'createdAt', start, end } = options.dateRange;
      leads = leads.filter(lead => {
        if (!lead[field]) return false;
        const date = lead[field]?.toDate ? lead[field].toDate() : new Date(lead[field]);
        return date >= start && date <= end;
      });
    }
    
    return leads;
  } catch (error) {
    console.error('Error getting leads by company:', error);
    throw error;
  }
}
/**
   * Migrate all leads with "pending" status to "new" status
   * @param {string} companyId - The company ID to filter leads
   * @returns {Promise<{success: number, failed: number, total: number, skipped: number}>}
   */
   async migratePendingToNew(companyId) {
    try {
      // Validate companyId
      if (!companyId) {
        throw new Error('Company ID is required');
      }

      console.log(`🔍 Searching for leads with 'pending' status in company: ${companyId}`);
      
      // Get all leads with status "pending"
      const pendingQuery = query(
        collection(db, 'leads'),
        where('company_id', '==', companyId),
        where('status', '==', 'Pending')
      );
      
      const snapshot = await getDocs(pendingQuery);
      const total = snapshot.size;
      
      if (total === 0) {
        console.log('✅ No pending leads found to migrate');
        return { success: 0, failed: 0, total: 0, skipped: 0 };
      }
      
      console.log(`🔄 Found ${total} leads with 'pending' status. Migrating to 'new'...`);
      
      // Use batch writes for better performance
      const batch = writeBatch(db);
      let successCount = 0;
      let failedCount = 0;
      
      snapshot.docs.forEach((docSnapshot) => {
        try {
          const leadRef = doc(db, 'leads', docSnapshot.id);
          batch.update(leadRef, {
            status: LeadStatus.NEW,
            updatedAt: serverTimestamp(),
          });
          successCount++;
        } catch (error) {
          console.error(`❌ Failed to update lead ${docSnapshot.id}:`, error);
          failedCount++;
        }
      });
      
      // Commit the batch if there are successful updates
      if (successCount > 0) {
        await batch.commit();
        console.log(`✅ Successfully migrated ${successCount} leads from 'pending' to 'new'`);
      }
      
      if (failedCount > 0) {
        console.warn(`⚠️ Failed to update ${failedCount} leads`);
      }
      
      return { 
        success: successCount, 
        failed: failedCount, 
        total,
        skipped: 0 
      };
      
    } catch (error) {
      console.error('❌ Error migrating pending leads:', error);
      throw new Error(`Migration failed: ${error.message}`);
    }
  }


}

// Create and export a singleton instance
const leadService = new LeadService();
export default leadService;