import { where } from 'configs/FirebaseConfig';
import { collection, query, getDocs, doc, addDoc, updateDoc, deleteDoc, serverTimestamp, getFirestore } from 'firebase/firestore';
import BaseFirebaseService from './BaseFirebaseService';
import { convertToLeadModel, LeadStatus, LeadInterestLevel, LeadRedirectionSource } from 'models/LeadModel';

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
   * Get leads by status
   * @param {string} companyId - Company ID
   * @param {string} status - Lead status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of leads
   */
  async getLeadsByStatus(companyId, status, options = {}) {
    const statusFilter = ['status', '==', status];
    const filters = options.filters ? [...options.filters, statusFilter] : [statusFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
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
   * Get leads by redirection source
   * @param {string} companyId - Company ID
   * @param {string} source - Redirection source
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of leads
   */
  async getLeadsBySource(companyId, source, options = {}) {
    const sourceFilter = ['RedirectedFrom', '==', source];
    const filters = options.filters ? [...options.filters, sourceFilter] : [sourceFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }
  
  /**
   * Get leads by interest level
   * @param {string} companyId - Company ID
   * @param {string} interestLevel - Interest level (Low, Medium, High)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of leads
   */
  async getLeadsByInterestLevel(companyId, interestLevel, options = {}) {
    const interestFilter = ['InterestLevel', '==', interestLevel];
    const filters = options.filters ? [...options.filters, interestFilter] : [interestFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }
  
  /**
   * Get leads by region
   * @param {string} companyId - Company ID
   * @param {string} region - Region
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of leads
   */
  async getLeadsByRegion(companyId, region, options = {}) {
    const regionFilter = ['region', '==', region];
    const filters = options.filters ? [...options.filters, regionFilter] : [regionFilter];
    
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
    
    // Unfortunately, Firestore doesn't support OR conditions directly in queries
    // We'll need to do multiple queries and combine the results
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
      
      // Combine results and remove duplicates
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
   * Get leads assigned to a specific user
   * @param {string} companyId - Company ID
   * @param {string} assignedToId - User ID the leads are assigned to
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of leads
   */
  async getLeadsByAssignedUser(companyId, assignedToId, options = {}) {
    const assignedFilter = ['assignedTo.id', '==', assignedToId];
    const filters = options.filters ? [...options.filters, assignedFilter] : [assignedFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Convert a lead to a contact
   * @param {string} leadId - Lead ID
   * @param {Object} contactService - Contact service instance
   * @returns {Promise<Object>} - Created contact
   */
  async convertToContact(leadId, contactService) {
    // Get the lead data
    const lead = await this.getById(leadId);
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    // Create a new contact based on lead data
    const contactData = {
      companyId: lead.companyId,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      mobile: lead.mobile,
      address: lead.address,
      city: lead.city,
      state: lead.state,
      zipCode: lead.zipCode,
      country: lead.country,
      source: lead.source,
      notes: lead.notes ? [...lead.notes] : [],
      tags: lead.tags ? [...lead.tags] : [],
      assignedTo: lead.assignedTo,
      convertedFromLeadId: leadId
    };
    
    // Create the contact
    const contact = await contactService.create(contactData);
    
    // Update the lead to mark as converted
    await this.update(leadId, {
      status: LeadStatus.CONVERTED,
      convertedToContactId: contact.id,
      convertedAt: new Date()
    });
    
    return contact;
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
   * Add a note to a lead
   * @param {string} leadId - Lead ID
   * @param {Object} note - Note object
   * @returns {Promise<Object>} - Updated lead
   */
  async addNote(leadId, note) {
    const lead = await this.getById(leadId);
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    const notes = lead.notes || [];
    notes.push({
      ...note,
      createdAt: new Date()
    });
    
    return this.update(leadId, { notes });
  }

  /**
   * Add a tag to a lead
   * @param {string} leadId - Lead ID
   * @param {string} tag - Tag to add
   * @returns {Promise<Object>} - Updated lead
   */
  async addTag(leadId, tag) {
    const lead = await this.getById(leadId);
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    const tags = lead.tags || [];
    
    if (!tags.includes(tag)) {
      tags.push(tag);
      return this.update(leadId, { tags });
    }
    
    return lead;
  }

  /**
   * Remove a tag from a lead
   * @param {string} leadId - Lead ID
   * @param {string} tag - Tag to remove
   * @returns {Promise<Object>} - Updated lead
   */
  async removeTag(leadId, tag) {
    const lead = await this.getById(leadId);
    
    if (!lead) {
      throw new Error('Lead not found');
    }
    
    const tags = lead.tags || [];
    const updatedTags = tags.filter(t => t !== tag);
    
    return this.update(leadId, { tags: updatedTags });
  }

  /**
   * Change lead status
   * @param {string} leadId - Lead ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated lead
   */
  async changeStatus(leadId, status) {
    // Validate status
    if (!Object.values(LeadStatus).includes(status)) {
      throw new Error(`Invalid lead status: ${status}`);
    }
    
    return this.update(leadId, { status });
  }

  /**
   * Assign lead to a user
   * @param {string} leadId - Lead ID
   * @param {Object} user - User object with id and name
   * @returns {Promise<Object>} - Updated lead
   */
  async assignTo(leadId, user) {
    return this.update(leadId, { 
      assignedTo: {
        id: user.id,
        name: user.firstName + ' ' + user.lastName
      }
    });
  }
}

// Create and export a singleton instance
const leadService = new LeadService();
export default leadService;
