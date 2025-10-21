import BaseFirebaseService from './BaseFirebaseService';
import { convertToHistoryModel, HistoryType } from 'models/HistoryModel';
import { serverTimestamp } from 'configs/FirebaseConfig';

/**
 * Service for managing activity history with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class HistoryService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('history', convertToHistoryModel);
  }

  /**
   * Log an activity in history
   * @param {Object} activityData - Activity data
   * @returns {Promise<Object>} - Created history entry
   */
  async logActivity(activityData) {
    // Ensure required fields
    if (!activityData.type || !activityData.entityId || !activityData.companyId) {
      throw new Error('History entry requires type, entityId, and companyId');
    }
    
    const historyEntry = {
      ...activityData,
      timestamp: serverTimestamp(),
    };
    
    return this.create(historyEntry);
  }

  /**
   * Get history for a specific entity
   * @param {string} companyId - Company ID
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of history entries
   */
  async getHistoryByEntity(companyId, entityType, entityId, options = {}) {
    const entityTypeFilter = ['entityType', '==', entityType];
    const entityIdFilter = ['entityId', '==', entityId];
    
    const filters = options.filters ? 
      [...options.filters, entityTypeFilter, entityIdFilter] : 
      [entityTypeFilter, entityIdFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['timestamp', 'desc']]
    });
  }

  /**
   * Get history entries by user
   * @param {string} companyId - Company ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of history entries
   */
  async getHistoryByUser(companyId, userId, options = {}) {
    const userFilter = ['userId', '==', userId];
    const filters = options.filters ? [...options.filters, userFilter] : [userFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['timestamp', 'desc']]
    });
  }

  /**
   * Get history entries by type
   * @param {string} companyId - Company ID
   * @param {string} type - History type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of history entries
   */
  async getHistoryByType(companyId, type, options = {}) {
    const typeFilter = ['type', '==', type];
    const filters = options.filters ? [...options.filters, typeFilter] : [typeFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['timestamp', 'desc']]
    });
  }

  /**
   * Get recent activity history for a company
   * @param {string} companyId - Company ID
   * @param {number} limit - Number of entries to return
   * @returns {Promise<Array>} - Array of history entries
   */
  async getRecentActivity(companyId, limit = 20) {
    return this.getAllByCompany(companyId, {
      orderByFields: [['timestamp', 'desc']],
      limitCount: limit
    });
  }

  /**
   * Get activity history for a date range
   * @param {string} companyId - Company ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of history entries
   */
  async getHistoryByDateRange(companyId, startDate, endDate, options = {}) {
    const startFilter = ['timestamp', '>=', startDate];
    const endFilter = ['timestamp', '<=', endDate];
    
    const filters = options.filters ? 
      [...options.filters, startFilter, endFilter] : 
      [startFilter, endFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters,
      orderByFields: [['timestamp', 'desc']]
    });
  }

  /**
   * Get activity feed for dashboard
   * @param {string} companyId - Company ID
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} - Array of history entries
   */
  async getActivityFeed(companyId, options = {}) {
    const { entityTypes = [], userIds = [], limit = 10 } = options;
    
    const filters = [];
    
    // Add company filter
    filters.push(['companyId', '==', companyId]);
    
    // Process filters
    const queryOptions = {
      orderByFields: [['timestamp', 'desc']],
      limitCount: limit
    };
    
    // If we have entity types to filter by
    if (entityTypes && entityTypes.length > 0) {
      // Firestore doesn't support OR queries across fields
      // For simplicity, we'll just filter for a single entity type
      if (entityTypes.length === 1) {
        filters.push(['entityType', '==', entityTypes[0]]);
        queryOptions.filters = filters;
        return this.getAll(queryOptions);
      } else {
        // For multiple entity types, we need to do separate queries and merge
        const promises = entityTypes.map(type => {
          return this.getAll({
            ...queryOptions,
            filters: [...filters, ['entityType', '==', type]]
          });
        });
        
        const results = await Promise.all(promises);
        
        // Merge and sort by timestamp
        const mergedResults = [].concat(...results);
        return mergedResults
          .sort((a, b) => {
            const aTime = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            const bTime = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            return bTime - aTime;
          })
          .slice(0, limit);
      }
    }
    
    // If we have user IDs to filter by
    if (userIds && userIds.length > 0) {
      // Handle similar to entity types
      if (userIds.length === 1) {
        filters.push(['userId', '==', userIds[0]]);
        queryOptions.filters = filters;
        return this.getAll(queryOptions);
      } else {
        const promises = userIds.map(userId => {
          return this.getAll({
            ...queryOptions,
            filters: [...filters, ['userId', '==', userId]]
          });
        });
        
        const results = await Promise.all(promises);
        const mergedResults = [].concat(...results);
        return mergedResults
          .sort((a, b) => {
            const aTime = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            const bTime = b.timestamp instanceof Date ? b.timestamp : new Date(b.timestamp);
            return bTime - aTime;
          })
          .slice(0, limit);
      }
    }
    
    // If no special filters, just get recent activity
    queryOptions.filters = filters;
    return this.getAll(queryOptions);
  }

  /**
   * Log entity creation
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} companyId - Company ID
   * @param {Object} user - User who performed the action
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} - Created history entry
   */
  async logCreation(entityType, entityId, companyId, user, data = {}) {
    return this.logActivity({
      type: HistoryType.CREATED,
      entityType,
      entityId,
      companyId,
      userId: user.id,
      userName: user.firstName + ' ' + user.lastName,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Log entity update
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} companyId - Company ID
   * @param {Object} user - User who performed the action
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} - Created history entry
   */
  async logUpdate(entityType, entityId, companyId, user, data = {}) {
    return this.logActivity({
      type: HistoryType.UPDATED,
      entityType,
      entityId,
      companyId,
      userId: user.id,
      userName: user.firstName + ' ' + user.lastName,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Log entity deletion
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} companyId - Company ID
   * @param {Object} user - User who performed the action
   * @param {Object} data - Additional data
   * @returns {Promise<Object>} - Created history entry
   */
  async logDeletion(entityType, entityId, companyId, user, data = {}) {
    return this.logActivity({
      type: HistoryType.DELETED,
      entityType,
      entityId,
      companyId,
      userId: user.id,
      userName: user.firstName + ' ' + user.lastName,
      data,
      timestamp: new Date()
    });
  }

  /**
   * Log entity status change
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} companyId - Company ID
   * @param {Object} user - User who performed the action
   * @param {string} oldStatus - Old status
   * @param {string} newStatus - New status
   * @returns {Promise<Object>} - Created history entry
   */
  async logStatusChange(entityType, entityId, companyId, user, oldStatus, newStatus) {
    return this.logActivity({
      type: HistoryType.STATUS_CHANGED,
      entityType,
      entityId,
      companyId,
      userId: user.id,
      userName: user.firstName + ' ' + user.lastName,
      data: {
        oldStatus,
        newStatus
      },
      timestamp: new Date()
    });
  }

  /**
   * Log user assignment
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} companyId - Company ID
   * @param {Object} user - User who performed the action
   * @param {Object} assignedTo - User who was assigned
   * @returns {Promise<Object>} - Created history entry
   */
  async logAssignment(entityType, entityId, companyId, user, assignedTo) {
    return this.logActivity({
      type: HistoryType.ASSIGNED,
      entityType,
      entityId,
      companyId,
      userId: user.id,
      userName: user.firstName + ' ' + user.lastName,
      data: {
        assignedToId: assignedTo.id,
        assignedToName: assignedTo.firstName + ' ' + assignedTo.lastName
      },
      timestamp: new Date()
    });
  }

  /**
   * Log email sent
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} companyId - Company ID
   * @param {Object} user - User who performed the action
   * @param {string} recipient - Email recipient
   * @param {string} subject - Email subject
   * @returns {Promise<Object>} - Created history entry
   */
  async logEmailSent(entityType, entityId, companyId, user, recipient, subject) {
    return this.logActivity({
      type: HistoryType.EMAIL_SENT,
      entityType,
      entityId,
      companyId,
      userId: user.id,
      userName: user.firstName + ' ' + user.lastName,
      data: {
        recipient,
        subject
      },
      timestamp: new Date()
    });
  }

  /**
   * Log note added
   * @param {string} entityType - Entity type
   * @param {string} entityId - Entity ID
   * @param {string} companyId - Company ID
   * @param {Object} user - User who performed the action
   * @param {string} noteContent - Note content (may be truncated)
   * @returns {Promise<Object>} - Created history entry
   */
  async logNoteAdded(entityType, entityId, companyId, user, noteContent) {
    // Truncate note content if too long
    const truncatedContent = noteContent.length > 100 ? 
      noteContent.substring(0, 97) + '...' : noteContent;
      
    return this.logActivity({
      type: HistoryType.NOTE_ADDED,
      entityType,
      entityId,
      companyId,
      userId: user.id,
      userName: user.firstName + ' ' + user.lastName,
      data: {
        noteContent: truncatedContent
      },
      timestamp: new Date()
    });
  }
}

// Create and export a singleton instance
const historyService = new HistoryService();
export default historyService;
