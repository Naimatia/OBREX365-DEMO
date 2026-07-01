// services/firebase/SellerActivityService.js - Fixed version with correct ordering
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
  Timestamp,
  writeBatch,
  startAfter,
  endAt
} from 'firebase/firestore';

/**
 * Activity Types
 */
export const ActivityTypes = {
  LEAD_VIEWED: 'lead_viewed',
  LEAD_CREATED: 'lead_created',
  LEAD_UPDATED: 'lead_updated',
  LEAD_STATUS_CHANGED: 'lead_status_changed',
  LEAD_CONVERTED: 'lead_converted',
  LEAD_REVEALED: 'lead_revealed',
  LEAD_ASSIGNED: 'lead_assigned',
  LEAD_NOTE_ADDED: 'lead_note_added',
  CONTACT_CREATED: 'contact_created',
  CONTACT_UPDATED: 'contact_updated',
  CONTACT_STATUS_CHANGED: 'contact_status_changed',
  CONTACT_VIEWED: 'contact_viewed',
  CONTACT_NOTE_ADDED: 'contact_note_added',
  CONTACT_CONVERTED_TO_DEAL: 'contact_converted_to_deal',
  DEAL_CREATED: 'deal_created',
  DEAL_UPDATED: 'deal_updated',
  DEAL_STATUS_CHANGED: 'deal_status_changed',
  DEAL_VIEWED: 'deal_viewed',
  DEAL_NOTE_ADDED: 'deal_note_added',
  DEAL_WON: 'deal_won',
  DEAL_LOST: 'deal_lost',
};

export const EntityTypes = {
  LEAD: 'lead',
  CONTACT: 'contact',
  DEAL: 'deal',
};

class SellerActivityService {
  constructor() {
    this.collectionName = 'seller_activities';
  }

  /**
   * Log an activity
   */
  async logActivity({
    sellerId,
    companyId,
    activityType,
    entityType,
    entityId,
    entityName = null,
    details = {},
    metadata = {},
  }) {
    try {
      if (!sellerId || !companyId) {
        console.warn('Missing sellerId or companyId for activity logging');
        return null;
      }

      const now = new Date();
      
      const activity = {
        sellerId,
        companyId,
        activityType,
        entityType,
        entityId,
        entityName: entityName || details?.name || details?.entityName || null,
        timestamp: serverTimestamp(),
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        month: now.toISOString().slice(0, 7),
        week: this.getWeekNumber(now),
        year: now.getFullYear(),
        dayOfWeek: now.getDay(),
        hour: now.getHours(),
        details: {
          ...details,
          name: entityName || details?.name || details?.entityName,
        },
        metadata: {
          ...metadata,
          oldStatus: metadata?.oldStatus || null,
          newStatus: metadata?.newStatus || null,
          amount: metadata?.amount || details?.amount || null,
        },
        statusChange: !!(metadata?.oldStatus && metadata?.newStatus),
        hasAmount: !!(metadata?.amount || details?.amount),
        hasNote: !!(details?.note || details?.noteText),
      };

      Object.keys(activity).forEach(key => {
        if (activity[key] === undefined || activity[key] === null) {
          delete activity[key];
        }
      });

      const docRef = await addDoc(collection(db, this.collectionName), activity);
      return docRef.id;
    } catch (error) {
      console.error('Error logging activity:', error);
      return null;
    }
  }

  /**
   * Get week number
   */
  getWeekNumber(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    const week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  /**
   * Get activities for a specific seller with Firebase filtering
   */
  async getSellerActivities(sellerId, options = {}) {
    try {
      if (!sellerId) {
        console.warn('No sellerId provided');
        return [];
      }

      let constraints = [
        where('sellerId', '==', sellerId)
      ];

      // Date range filtering - FIXED: order by date first when using inequality
      if (options.startDate) {
        constraints.push(where('date', '>=', options.startDate));
      }
      if (options.endDate) {
        constraints.push(where('date', '<=', options.endDate));
      }

      // Activity type filter
      if (options.activityType) {
        constraints.push(where('activityType', '==', options.activityType));
      }

      // Entity type filter
      if (options.entityType) {
        constraints.push(where('entityType', '==', options.entityType));
      }

      // FIXED: Order by date desc first when using date filters, then by timestamp
      let q;
      if (options.startDate || options.endDate) {
        // When using date filters, order by date first (required by Firebase)
        q = query(
          collection(db, this.collectionName),
          ...constraints,
          orderBy('date', 'desc'),
          orderBy('timestamp', 'desc')
        );
      } else {
        // No date filters, order by timestamp
        q = query(
          collection(db, this.collectionName),
          ...constraints,
          orderBy('timestamp', 'desc')
        );
      }

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const snapshot = await getDocs(q);
      const activities = [];
      
      snapshot.forEach(doc => {
        activities.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return activities;
    } catch (error) {
      console.error('Error getting seller activities:', error);
      return [];
    }
  }

  /**
   * Get ALL activities for a company with Firebase filtering
   */
  async getAllActivities(companyId, options = {}) {
    try {
      if (!companyId) {
        console.warn('No companyId provided');
        return [];
      }

      let constraints = [
        where('companyId', '==', companyId)
      ];

      // Date range filtering
      if (options.startDate) {
        constraints.push(where('date', '>=', options.startDate));
      }
      if (options.endDate) {
        constraints.push(where('date', '<=', options.endDate));
      }

      // Activity type filter
      if (options.activityType && options.activityType !== 'all') {
        constraints.push(where('activityType', '==', options.activityType));
      }

      // Entity type filter
      if (options.entityType && options.entityType !== 'all') {
        constraints.push(where('entityType', '==', options.entityType));
      }

      // Seller filter
      if (options.sellerId && options.sellerId !== 'all') {
        constraints.push(where('sellerId', '==', options.sellerId));
      }

      // FIXED: Order by date desc first when using date filters, then by timestamp
      let q;
      if (options.startDate || options.endDate) {
        // When using date filters, order by date first (required by Firebase)
        q = query(
          collection(db, this.collectionName),
          ...constraints,
          orderBy('date', 'desc'),
          orderBy('timestamp', 'desc')
        );
      } else {
        // No date filters, order by timestamp
        q = query(
          collection(db, this.collectionName),
          ...constraints,
          orderBy('timestamp', 'desc')
        );
      }

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      const snapshot = await getDocs(q);
      const activities = [];
      
      snapshot.forEach(doc => {
        activities.push({
          id: doc.id,
          ...doc.data()
        });
      });

      return activities;
    } catch (error) {
      console.error('Error getting all activities:', error);
      return [];
    }
  }

  /**
   * Get all activities with seller info (joined with users)
   */
  async getAllActivitiesWithSellers(companyId, options = {}) {
    try {
      const activities = await this.getAllActivities(companyId, options);
      
      if (!activities || activities.length === 0) {
        return [];
      }
      
      // Get unique seller IDs
      const sellerIds = [...new Set(activities.map(a => a.sellerId).filter(Boolean))];
      
      // Fetch seller info for each seller
      const sellerMap = {};
      for (const sellerId of sellerIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', sellerId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            sellerMap[sellerId] = {
              id: sellerId,
              name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || 'Unknown Seller',
              email: userData.email || '',
              phone: userData.phoneNumber || userData.phone || '',
            };
          } else {
            sellerMap[sellerId] = {
              id: sellerId,
              name: `Seller ${sellerId.slice(-6)}`,
              email: '',
              phone: '',
            };
          }
        } catch (e) {
          console.warn(`Could not fetch seller info for ${sellerId}:`, e);
          sellerMap[sellerId] = {
            id: sellerId,
            name: `Seller ${sellerId.slice(-6)}`,
            email: '',
            phone: '',
          };
        }
      }

      // Attach seller info to activities
      return activities.map(activity => ({
        ...activity,
        seller: sellerMap[activity.sellerId] || {
          id: activity.sellerId,
          name: `Seller ${activity.sellerId?.slice(-6) || 'Unknown'}`,
          email: '',
          phone: '',
        }
      }));
    } catch (error) {
      console.error('Error getting activities with sellers:', error);
      return [];
    }
  }

  /**
   * Get activity statistics for all sellers with date filtering
   */
  async getAllActivityStats(companyId, options = {}) {
    try {
      // Get activities with filters
      const activities = await this.getAllActivities(companyId, options);
      
      const stats = {
        total: activities.length,
        byType: {},
        byEntity: {},
        bySeller: {},
        conversions: {
          leadsToContacts: 0,
          contactsToDeals: 0,
        },
        statusChanges: {
          leads: {},
          contacts: {},
          deals: {},
        },
        totalAmount: 0,
        wonAmount: 0,
        byHour: Array(24).fill(0),
        byDayOfWeek: Array(7).fill(0),
      };

      activities.forEach(a => {
        stats.byType[a.activityType] = (stats.byType[a.activityType] || 0) + 1;
        stats.byEntity[a.entityType] = (stats.byEntity[a.entityType] || 0) + 1;
        
        if (a.sellerId) {
          stats.bySeller[a.sellerId] = (stats.bySeller[a.sellerId] || 0) + 1;
        }

        if (a.activityType === ActivityTypes.LEAD_CONVERTED) {
          stats.conversions.leadsToContacts++;
        }
        if (a.activityType === ActivityTypes.CONTACT_CONVERTED_TO_DEAL) {
          stats.conversions.contactsToDeals++;
        }

        if (a.metadata?.newStatus) {
          const entity = a.entityType || 'unknown';
          if (!stats.statusChanges[entity]) {
            stats.statusChanges[entity] = {};
          }
          stats.statusChanges[entity][a.metadata.newStatus] = 
            (stats.statusChanges[entity][a.metadata.newStatus] || 0) + 1;
        }

        if (a.metadata?.amount) {
          stats.totalAmount += a.metadata.amount;
          if (a.activityType === ActivityTypes.DEAL_WON) {
            stats.wonAmount += a.metadata.amount;
          }
        }

        if (a.hour !== undefined && a.hour >= 0 && a.hour < 24) {
          stats.byHour[a.hour] = (stats.byHour[a.hour] || 0) + 1;
        }

        if (a.dayOfWeek !== undefined && a.dayOfWeek >= 0 && a.dayOfWeek < 7) {
          stats.byDayOfWeek[a.dayOfWeek] = (stats.byDayOfWeek[a.dayOfWeek] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting all activity stats:', error);
      return {
        total: 0,
        byType: {},
        byEntity: {},
        bySeller: {},
        conversions: { leadsToContacts: 0, contactsToDeals: 0 },
        statusChanges: { leads: {}, contacts: {}, deals: {} },
        totalAmount: 0,
        wonAmount: 0,
        byHour: Array(24).fill(0),
        byDayOfWeek: Array(7).fill(0),
      };
    }
  }

  /**
   * Get seller leaderboard with date filtering
   */
  async getSellerLeaderboard(companyId, options = {}) {
    try {
      const period = options.period || 'month';
      const now = new Date();
      const startDate = new Date();
      
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(startDate.getMonth() - 3);
      } else if (period === 'year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
      }

      // Add date filter to options
      const filterOptions = {
        ...options,
        startDate: startDate.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
      };

      const activities = await this.getAllActivities(companyId, filterOptions);

      const leaderboard = {};
      activities.forEach(a => {
        if (!leaderboard[a.sellerId]) {
          leaderboard[a.sellerId] = {
            sellerId: a.sellerId,
            sellerName: a.seller?.name || `Seller ${a.sellerId?.slice(-6) || 'Unknown'}`,
            total: 0,
            byType: {},
            byEntity: {},
            conversions: {
              leadsToContacts: 0,
              contactsToDeals: 0,
              dealsWon: 0,
            },
            totalAmount: 0,
            wonAmount: 0,
          };
        }
        
        const seller = leaderboard[a.sellerId];
        seller.total++;
        seller.byType[a.activityType] = (seller.byType[a.activityType] || 0) + 1;
        seller.byEntity[a.entityType] = (seller.byEntity[a.entityType] || 0) + 1;

        if (a.activityType === ActivityTypes.LEAD_CONVERTED) {
          seller.conversions.leadsToContacts++;
        }
        if (a.activityType === ActivityTypes.CONTACT_CONVERTED_TO_DEAL) {
          seller.conversions.contactsToDeals++;
        }
        if (a.activityType === ActivityTypes.DEAL_WON) {
          seller.conversions.dealsWon++;
        }

        const amount = a.metadata?.amount || 0;
        if (amount > 0) {
          seller.totalAmount += amount;
          if (a.activityType === ActivityTypes.DEAL_WON) {
            seller.wonAmount += amount;
          }
        }
      });

      // Convert to array and sort
      const result = Object.values(leaderboard).sort((a, b) => b.total - a.total);
      
      // Add rank
      result.forEach((item, index) => {
        item.rank = index + 1;
      });

      return result;
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  /**
   * Get activity statistics for a seller with filtering
   */
  async getSellerActivityStats(sellerId, options = {}) {
    try {
      const activities = await this.getSellerActivities(sellerId, options);
      
      const stats = {
        total: activities.length,
        byType: {},
        byEntity: {},
        conversions: {
          leadsToContacts: 0,
          contactsToDeals: 0,
        },
        statusChanges: {
          leads: {},
          contacts: {},
          deals: {},
        },
        totalAmount: 0,
        dailyAverage: 0,
        byHour: Array(24).fill(0),
      };

      activities.forEach(a => {
        stats.byType[a.activityType] = (stats.byType[a.activityType] || 0) + 1;
        stats.byEntity[a.entityType] = (stats.byEntity[a.entityType] || 0) + 1;

        if (a.activityType === ActivityTypes.LEAD_CONVERTED) {
          stats.conversions.leadsToContacts++;
        }
        if (a.activityType === ActivityTypes.CONTACT_CONVERTED_TO_DEAL) {
          stats.conversions.contactsToDeals++;
        }

        if (a.metadata?.newStatus) {
          const entity = a.entityType || 'unknown';
          if (!stats.statusChanges[entity]) {
            stats.statusChanges[entity] = {};
          }
          stats.statusChanges[entity][a.metadata.newStatus] = 
            (stats.statusChanges[entity][a.metadata.newStatus] || 0) + 1;
        }

        if (a.metadata?.amount) {
          stats.totalAmount += a.metadata.amount;
        }

        if (a.hour !== undefined && a.hour >= 0 && a.hour < 24) {
          stats.byHour[a.hour] = (stats.byHour[a.hour] || 0) + 1;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        total: 0,
        byType: {},
        byEntity: {},
        conversions: { leadsToContacts: 0, contactsToDeals: 0 },
        statusChanges: { leads: {}, contacts: {}, deals: {} },
        totalAmount: 0,
        dailyAverage: 0,
        byHour: Array(24).fill(0),
      };
    }
  }
}

// Create and export singleton
const sellerActivityService = new SellerActivityService();
export default sellerActivityService;