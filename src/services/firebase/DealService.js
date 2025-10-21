import BaseFirebaseService from './BaseFirebaseService';
import { convertToDealModel, DealStatus, DealSource } from 'models/DealModel';

/**
 * Service for managing deals with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class DealService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('deals', convertToDealModel);
  }

  /**
   * Get deals by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of deals
   */
  async getDealsByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  /**
   * Get deals by status
   * @param {string} companyId - Company ID
   * @param {string} status - Deal status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of deals
   */
  async getDealsByStatus(companyId, status, options = {}) {
    const statusFilter = ['Status', '==', status];
    const filters = options.filters ? [...options.filters, statusFilter] : [statusFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get deals by seller
   * @param {string} companyId - Company ID
   * @param {string} sellerId - Seller ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of deals
   */
  async getDealsBySeller(companyId, sellerId, options = {}) {
    const sellerFilter = ['seller_id', '==', sellerId];
    const filters = options.filters ? [...options.filters, sellerFilter] : [sellerFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get deals for a specific contact
   * @param {string} companyId - Company ID
   * @param {string} contactId - Contact ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of deals
   */
  async getDealsByContact(companyId, contactId, options = {}) {
    const contactFilter = ['contact_id', '==', contactId];
    const filters = options.filters ? [...options.filters, contactFilter] : [contactFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get deals for a specific property
   * @param {string} companyId - Company ID
   * @param {string} propertyId - Property ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of deals
   */
  async getDealsByProperty(companyId, propertyId, options = {}) {
    const propertyFilter = ['property_id', '==', propertyId];
    const filters = options.filters ? [...options.filters, propertyFilter] : [propertyFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get deals by value range
   * @param {string} companyId - Company ID
   * @param {number} minValue - Minimum deal value
   * @param {number} maxValue - Maximum deal value
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of deals
   */
  async getDealsByValueRange(companyId, minValue, maxValue, options = {}) {
    const minValueFilter = ['value', '>=', minValue];
    const maxValueFilter = ['value', '<=', maxValue];
    const filters = options.filters ? 
      [...options.filters, minValueFilter, maxValueFilter] : 
      [minValueFilter, maxValueFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Update deal status
   * @param {string} dealId - Deal ID
   * @param {string} status - New status (Opened, Gain, Loss)
   * @returns {Promise<Object>} - Updated deal
   */
  async updateStatus(dealId, status) {
    // Validate status
    if (!Object.values(DealStatus).includes(status)) {
      throw new Error(`Invalid deal status: ${status}`);
    }
    
    return this.update(dealId, { 
      Status: status,
      LastUpdateDate: new Date()
    });
  }

  /**
   * Assign deal to a user
   * @param {string} dealId - Deal ID
   * @param {Object} user - User object with id and name
   * @returns {Promise<Object>} - Updated deal
   */
  async assignTo(dealId, user) {
    return this.update(dealId, { 
      assignedTo: {
        id: user.id,
        name: user.firstName + ' ' + user.lastName
      }
    });
  }

  /**
   * Add an activity to a deal
   * @param {string} dealId - Deal ID
   * @param {Object} activity - Activity object
   * @returns {Promise<Object>} - Updated deal
   */
  async addActivity(dealId, activity) {
    const deal = await this.getById(dealId);
    
    if (!deal) {
      throw new Error('Deal not found');
    }
    
    const activities = deal.activities || [];
    activities.push({
      ...activity,
      createdAt: new Date()
    });
    
    return this.update(dealId, { activities });
  }

  /**
   * Update deal value
   * @param {string} dealId - Deal ID
   * @param {number} value - New deal value
   * @returns {Promise<Object>} - Updated deal
   */
  async updateValue(dealId, value) {
    if (typeof value !== 'number' || value < 0) {
      throw new Error('Invalid deal value');
    }
    
    return this.update(dealId, { value });
  }

  /**
   * Mark deal as won
   * @param {string} dealId - Deal ID
   * @returns {Promise<Object>} - Updated deal
   */
  async markAsWon(dealId) {
    return this.update(dealId, { 
      Status: DealStatus.GAIN,
      LastUpdateDate: new Date()
    });
  }

  /**
   * Mark deal as lost
   * @param {string} dealId - Deal ID
   * @param {string} reason - Reason for losing the deal
   * @returns {Promise<Object>} - Updated deal
   */
  async markAsLost(dealId, reason) {
    return this.update(dealId, { 
      Status: DealStatus.LOSS,
      Description: reason || undefined,
      LastUpdateDate: new Date()
    });
  }

  /**
   * Get recent deals for a company
   * @param {string} companyId - Company ID
   * @param {number} limit - Number of deals to return
   * @returns {Promise<Array>} - Array of deals
   */
  async getRecentDeals(companyId, limit = 5) {
    return this.getAllByCompany(companyId, {
      orderByFields: [['createdAt', 'desc']],
      limitCount: limit
    });
  }

  /**
   * Get deals by expected close date range
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of deals
   */
  async getDealsByCloseDateRange(companyId, startDate, endDate, options = {}) {
    const startFilter = ['expectedCloseDate', '>=', startDate];
    const endFilter = ['expectedCloseDate', '<=', endDate];
    const filters = options.filters ? 
      [...options.filters, startFilter, endFilter] : 
      [startFilter, endFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Calculate deal analytics for a company
   * @param {string} companyId - Company ID
   * @returns {Promise<Object>} - Deal analytics
   */
  async calculateDealAnalytics(companyId) {
    try {
      // Get all opened deals
      const openedDeals = await this.getAllByCompany(companyId, {
        filters: [
          ['Status', '==', DealStatus.OPENED]
        ]
      });
      
      // Get won deals
      const wonDeals = await this.getAllByCompany(companyId, {
        filters: [['Status', '==', DealStatus.GAIN]]
      });
      
      // Get lost deals
      const lostDeals = await this.getAllByCompany(companyId, {
        filters: [['Status', '==', DealStatus.LOSS]]
      });
      
      // Calculate total values
      const openedDealValue = openedDeals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
      const wonDealValue = wonDeals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
      const lostDealValue = lostDeals.reduce((sum, deal) => sum + (deal.Amount || 0), 0);
      
      // Calculate counts by status
      const dealsByStatus = {};
      Object.values(DealStatus).forEach(status => {
        dealsByStatus[status] = 0;
      });
      
      [...openedDeals, ...wonDeals, ...lostDeals].forEach(deal => {
        if (deal.Status) {
          dealsByStatus[deal.Status] = (dealsByStatus[deal.Status] || 0) + 1;
        }
      });

      // Return stats
      return {
        count: {
          total: openedDeals.length + wonDeals.length + lostDeals.length,
          opened: openedDeals.length,
          gain: wonDeals.length,
          loss: lostDeals.length,
        },
        value: {
          opened: openedDealValue,
          gain: wonDealValue,
          loss: lostDealValue,
          total: openedDealValue + wonDealValue + lostDealValue
        },
        winRate: wonDeals.length / (wonDeals.length + lostDeals.length) || 0,
        dealsByStatus
      };
    } catch (error) {
      console.error('Error calculating deal analytics:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const dealService = new DealService();
export default dealService;
