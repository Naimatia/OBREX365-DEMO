// services/firebase/ContactHistoryService.js
import { 
  db,
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot
} from 'configs/FirebaseConfig';

/**
 * Service for managing contact history/activity tracking
 */
class ContactHistoryService {
  /**
   * Add a history entry for a contact
   * @param {string} contactId - Contact ID
   * @param {Object} historyData - History data
   * @param {string} historyData.type - Type: 'note', 'status', 'whatsapp', 'email', 'call', 'edit'
   * @param {string} historyData.message - Message/description
   * @param {string} historyData.sellerId - Seller ID who performed the action
   * @param {Object} historyData.createdBy - { id, name }
   * @param {Object} historyData.metadata - Additional metadata
   * @returns {Promise<Object>} - Created history entry
   */
  async addHistory(contactId, historyData) {
    try {
      const historyEntry = {
        contactId: contactId,
        type: historyData.type || 'note',
        message: historyData.message || '',
        sellerId: historyData.sellerId || null,
        createdBy: historyData.createdBy || null,
        metadata: historyData.metadata || {},
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'contact_history'), historyEntry);
      return {
        id: docRef.id,
        ...historyEntry
      };
    } catch (error) {
      console.error('Error adding contact history:', error);
      throw error;
    }
  }

  /**
   * Get all history entries for a contact
   * @param {string} contactId - Contact ID
   * @param {Object} options - Query options
   * @param {number} options.limit - Max number of entries
   * @param {string} options.orderBy - Field to order by
   * @param {string} options.orderDirection - 'asc' or 'desc'
   * @returns {Promise<Array>} - Array of history entries
   */
  async getHistoryByContact(contactId, options = {}) {
    try {
      let q = query(
        collection(db, 'contact_history'),
        where('contactId', '==', contactId),
        orderBy(options.orderBy || 'createdAt', options.orderDirection || 'desc')
      );

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      const history = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null
        });
      });

      return history;
    } catch (error) {
      console.error('Error getting contact history:', error);
      // If there's an index error, try without orderBy
      try {
        const q = query(
          collection(db, 'contact_history'),
          where('contactId', '==', contactId)
        );
        const querySnapshot = await getDocs(q);
        const history = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null
          });
        });
        return history.sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
          const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
          return dateB - dateA;
        });
      } catch (fallbackError) {
        console.error('Error in fallback contact history query:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Get history entries by type
   * @param {string} contactId - Contact ID
   * @param {string} type - History type
   * @returns {Promise<Array>} - Array of history entries
   */
  async getHistoryByType(contactId, type) {
    try {
      const q = query(
        collection(db, 'contact_history'),
        where('contactId', '==', contactId),
        where('type', '==', type),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const history = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null
        });
      });

      return history;
    } catch (error) {
      console.error('Error getting contact history by type:', error);
      return [];
    }
  }

  /**
   * Get recent history for a contact
   * @param {string} contactId - Contact ID
   * @param {number} limitCount - Number of entries to return
   * @returns {Promise<Array>} - Array of recent history entries
   */
  async getRecentHistory(contactId, limitCount = 10) {
    return this.getHistoryByContact(contactId, { limit: limitCount });
  }

  /**
   * Get history for all contacts of a seller
   * @param {string} sellerId - Seller ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of history entries
   */
  async getHistoryBySeller(sellerId, options = {}) {
    try {
      let q = query(
        collection(db, 'contact_history'),
        where('sellerId', '==', sellerId),
        orderBy(options.orderBy || 'createdAt', options.orderDirection || 'desc')
      );

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const querySnapshot = await getDocs(q);
      const history = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        history.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
          updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null
        });
      });

      return history;
    } catch (error) {
      console.error('Error getting seller contact history:', error);
      return [];
    }
  }

  /**
   * Listen to real-time history updates for a contact
   * @param {string} contactId - Contact ID
   * @param {Function} callback - Callback function with history data
   * @returns {Function} - Unsubscribe function
   */
  listenToHistory(contactId, callback) {
    try {
      const q = query(
        collection(db, 'contact_history'),
        where('contactId', '==', contactId),
        orderBy('createdAt', 'desc')
      );

      return onSnapshot(q, (snapshot) => {
        const history = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          history.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() || data.createdAt || null,
            updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || null
          });
        });
        callback(history);
      }, (error) => {
        console.error('Error listening to contact history:', error);
        callback([]);
      });
    } catch (error) {
      console.error('Error setting up history listener:', error);
      return () => {};
    }
  }

  /**
   * Delete a history entry
   * @param {string} historyId - History entry ID
   * @returns {Promise<void>}
   */
  async deleteHistory(historyId) {
    try {
      const docRef = doc(db, 'contact_history', historyId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting contact history:', error);
      throw error;
    }
  }

  /**
   * Delete all history for a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<void>}
   */
  async deleteAllHistory(contactId) {
    try {
      const history = await this.getHistoryByContact(contactId);
      const deletePromises = history.map(entry => this.deleteHistory(entry.id));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting all contact history:', error);
      throw error;
    }
  }

  /**
   * Get history count for a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<number>} - Number of history entries
   */
  async getHistoryCount(contactId) {
    try {
      const history = await this.getHistoryByContact(contactId);
      return history.length;
    } catch (error) {
      console.error('Error getting contact history count:', error);
      return 0;
    }
  }

  /**
   * Get history summary for a contact
   * @param {string} contactId - Contact ID
   * @returns {Promise<Object>} - Summary statistics
   */
  async getHistorySummary(contactId) {
    try {
      const history = await this.getHistoryByContact(contactId);
      
      const summary = {
        total: history.length,
        byType: {},
        lastActivity: null,
        firstActivity: null
      };

      history.forEach(entry => {
        // Count by type
        summary.byType[entry.type] = (summary.byType[entry.type] || 0) + 1;
        
        // Track dates
        if (entry.createdAt) {
          const date = new Date(entry.createdAt);
          if (!summary.firstActivity || date < new Date(summary.firstActivity)) {
            summary.firstActivity = entry.createdAt;
          }
          if (!summary.lastActivity || date > new Date(summary.lastActivity)) {
            summary.lastActivity = entry.createdAt;
          }
        }
      });

      return summary;
    } catch (error) {
      console.error('Error getting contact history summary:', error);
      return { total: 0, byType: {}, lastActivity: null, firstActivity: null };
    }
  }

  /**
   * Mark a contact as contacted (adds a system history entry)
   * @param {string} contactId - Contact ID
   * @param {Object} user - User performing the action
   * @returns {Promise<Object>} - Created history entry
   */
  async markAsContacted(contactId, user) {
    return this.addHistory(contactId, {
      type: 'status',
      message: 'Contact was marked as contacted',
      sellerId: user?.id || null,
      createdBy: user ? {
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim()
      } : null,
      metadata: {
        action: 'mark_contacted',
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Log a status change
   * @param {string} contactId - Contact ID
   * @param {string} oldStatus - Previous status
   * @param {string} newStatus - New status
   * @param {Object} user - User performing the action
   * @returns {Promise<Object>} - Created history entry
   */
  async logStatusChange(contactId, oldStatus, newStatus, user) {
    return this.addHistory(contactId, {
      type: 'status',
      message: `Status changed from ${oldStatus || 'Unknown'} to ${newStatus}`,
      sellerId: user?.id || null,
      createdBy: user ? {
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim()
      } : null,
      metadata: {
        oldStatus: oldStatus,
        newStatus: newStatus,
        action: 'status_change'
      }
    });
  }

  /**
   * Log a contact edit
   * @param {string} contactId - Contact ID
   * @param {Object} changes - Fields that were changed
   * @param {Object} user - User performing the action
   * @returns {Promise<Object>} - Created history entry
   */
  async logContactEdit(contactId, changes, user) {
    const fields = Object.keys(changes).join(', ');
    return this.addHistory(contactId, {
      type: 'edit',
      message: `Contact updated: ${fields}`,
      sellerId: user?.id || null,
      createdBy: user ? {
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim()
      } : null,
      metadata: {
        changes: changes,
        action: 'edit'
      }
    });
  }

  /**
   * Log a WhatsApp message sent
   * @param {string} contactId - Contact ID
   * @param {string} message - WhatsApp message
   * @param {Object} user - User performing the action
   * @returns {Promise<Object>} - Created history entry
   */
  async logWhatsApp(contactId, message, user) {
    return this.addHistory(contactId, {
      type: 'whatsapp',
      message: message,
      sellerId: user?.id || null,
      createdBy: user ? {
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim()
      } : null,
      metadata: {
        action: 'whatsapp_sent'
      }
    });
  }

  /**
   * Log an email sent
   * @param {string} contactId - Contact ID
   * @param {string} subject - Email subject
   * @param {string} body - Email body
   * @param {Object} user - User performing the action
   * @returns {Promise<Object>} - Created history entry
   */
  async logEmail(contactId, subject, body, user) {
    return this.addHistory(contactId, {
      type: 'email',
      message: `Email sent: ${subject}`,
      sellerId: user?.id || null,
      createdBy: user ? {
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim()
      } : null,
      metadata: {
        subject: subject,
        body: body,
        action: 'email_sent'
      }
    });
  }

  /**
   * Log a call
   * @param {string} contactId - Contact ID
   * @param {number} duration - Call duration in minutes
   * @param {string} outcome - Call outcome (answered, no-answer, voicemail)
   * @param {Object} user - User performing the action
   * @returns {Promise<Object>} - Created history entry
   */
  async logCall(contactId, duration, outcome, user) {
    return this.addHistory(contactId, {
      type: 'call',
      message: `Call (${duration}min) - ${outcome}`,
      sellerId: user?.id || null,
      createdBy: user ? {
        id: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim()
      } : null,
      metadata: {
        duration: duration,
        outcome: outcome,
        action: 'call_logged'
      }
    });
  }
}

// Create and export a singleton instance
const contactHistoryService = new ContactHistoryService();
export default contactHistoryService;