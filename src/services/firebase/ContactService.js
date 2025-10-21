import BaseFirebaseService from './BaseFirebaseService';
import { convertToContactModel, ContactType } from 'models/ContactModel';

/**
 * Service for managing contacts with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class ContactService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('contacts', convertToContactModel);
  }

  /**
   * Get contacts by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of contacts
   */
  async getContactsByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  /**
   * Get contacts by type
   * @param {string} companyId - Company ID
   * @param {string} type - Contact type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of contacts
   */
  async getContactsByType(companyId, type, options = {}) {
    const typeFilter = ['type', '==', type];
    const filters = options.filters ? [...options.filters, typeFilter] : [typeFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get contacts assigned to a specific user
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of contacts
   */
  async getContactsByAssignedUser(companyId, userId, options = {}) {
    const userFilter = ['assignedTo.id', '==', userId];
    const filters = options.filters ? [...options.filters, userFilter] : [userFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Search contacts by name, email or phone
   * @param {string} companyId - Company ID
   * @param {string} searchTerm - Search term
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of contacts
   * 
   * Note: This is a limited implementation as Firestore doesn't support
   * OR conditions across different fields in a single query.
   * For more complex search, consider using a dedicated search service or
   * implementing client-side filtering.
   */
  async searchContacts(companyId, searchTerm, options = {}) {
    // For simplicity, we'll just search by email
    // A more comprehensive approach would involve multiple queries and merging results
    const emailFilter = ['email', '>=', searchTerm];
    const emailEndFilter = ['email', '<=', searchTerm + '\uf8ff'];
    
    const filters = options.filters ? 
      [...options.filters, emailFilter, emailEndFilter] : 
      [emailFilter, emailEndFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Add a note to a contact
   * @param {string} contactId - Contact ID
   * @param {Object} note - Note object
   * @returns {Promise<Object>} - Updated contact
   */
  async addNote(contactId, note) {
    const contact = await this.getById(contactId);
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    const notes = contact.notes || [];
    notes.push({
      ...note,
      createdAt: new Date()
    });
    
    return this.update(contactId, { notes });
  }

  /**
   * Add a tag to a contact
   * @param {string} contactId - Contact ID
   * @param {string} tag - Tag to add
   * @returns {Promise<Object>} - Updated contact
   */
  async addTag(contactId, tag) {
    const contact = await this.getById(contactId);
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    const tags = contact.tags || [];
    
    if (!tags.includes(tag)) {
      tags.push(tag);
      return this.update(contactId, { tags });
    }
    
    return contact;
  }

  /**
   * Remove a tag from a contact
   * @param {string} contactId - Contact ID
   * @param {string} tag - Tag to remove
   * @returns {Promise<Object>} - Updated contact
   */
  async removeTag(contactId, tag) {
    const contact = await this.getById(contactId);
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    const tags = contact.tags || [];
    const updatedTags = tags.filter(t => t !== tag);
    
    return this.update(contactId, { tags: updatedTags });
  }

  /**
   * Change contact type
   * @param {string} contactId - Contact ID
   * @param {string} type - New type
   * @returns {Promise<Object>} - Updated contact
   */
  async changeType(contactId, type) {
    // Validate type
    if (!Object.values(ContactType).includes(type)) {
      throw new Error(`Invalid contact type: ${type}`);
    }
    
    return this.update(contactId, { type });
  }

  /**
   * Assign contact to a user
   * @param {string} contactId - Contact ID
   * @param {Object} user - User object with id and name
   * @returns {Promise<Object>} - Updated contact
   */
  async assignTo(contactId, user) {
    return this.update(contactId, { 
      assignedTo: {
        id: user.id,
        name: user.firstName + ' ' + user.lastName
      }
    });
  }

  /**
   * Get contacts related to a specific property
   * @param {string} companyId - Company ID
   * @param {string} propertyId - Property ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of contacts
   */
  async getContactsByProperty(companyId, propertyId, options = {}) {
    const propertyFilter = ['relatedProperties', 'array-contains', propertyId];
    const filters = options.filters ? [...options.filters, propertyFilter] : [propertyFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Add related property to contact
   * @param {string} contactId - Contact ID
   * @param {string} propertyId - Property ID
   * @returns {Promise<Object>} - Updated contact
   */
  async addRelatedProperty(contactId, propertyId) {
    const contact = await this.getById(contactId);
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    const relatedProperties = contact.relatedProperties || [];
    
    if (!relatedProperties.includes(propertyId)) {
      relatedProperties.push(propertyId);
      return this.update(contactId, { relatedProperties });
    }
    
    return contact;
  }

  /**
   * Remove related property from contact
   * @param {string} contactId - Contact ID
   * @param {string} propertyId - Property ID
   * @returns {Promise<Object>} - Updated contact
   */
  async removeRelatedProperty(contactId, propertyId) {
    const contact = await this.getById(contactId);
    
    if (!contact) {
      throw new Error('Contact not found');
    }
    
    const relatedProperties = contact.relatedProperties || [];
    const updatedProperties = relatedProperties.filter(id => id !== propertyId);
    
    return this.update(contactId, { relatedProperties: updatedProperties });
  }

  /**
   * Get recent contacts for a company
   * @param {string} companyId - Company ID
   * @param {number} limit - Number of contacts to return
   * @returns {Promise<Array>} - Array of contacts
   */
  async getRecentContacts(companyId, limit = 5) {
    return this.getAllByCompany(companyId, {
      orderByFields: [['createdAt', 'desc']],
      limitCount: limit
    });
  }
}

// Create and export a singleton instance
const contactService = new ContactService();
export default contactService;
