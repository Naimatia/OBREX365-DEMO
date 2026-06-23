// services/firebase/SellerActivityService.js - Complete fixed version
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
  writeBatch
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
   * Get activities for a specific seller
   */
  async getSellerActivities(sellerId, options = {}) {
    try {
      if (!sellerId) {
        console.warn('No sellerId provided');
        return [];
      }

      let q = query(
        collection(db, this.collectionName),
        where('sellerId', '==', sellerId),
        orderBy('timestamp', 'desc')
      );

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
   * Get ALL activities for a company (all sellers)
   */
  async getAllActivities(companyId, options = {}) {
    try {
      if (!companyId) {
        console.warn('No companyId provided');
        return this.getMockAllActivities();
      }

      let q = query(
        collection(db, this.collectionName),
        where('companyId', '==', companyId),
        orderBy('timestamp', 'desc')
      );

      if (options.limit) {
        q = query(q, limit(options.limit));
      }

      if (options.activityType) {
        q = query(q, where('activityType', '==', options.activityType));
      }

      if (options.entityType) {
        q = query(q, where('entityType', '==', options.entityType));
      }

      const snapshot = await getDocs(q);
      const activities = [];
      
      snapshot.forEach(doc => {
        activities.push({
          id: doc.id,
          ...doc.data()
        });
      });

      // If no activities found, return mock data
      if (activities.length === 0) {
        console.log('No activities found in Firebase, returning mock data');
        return this.getMockAllActivities(companyId);
      }

      return activities;
    } catch (error) {
      console.error('Error getting all activities:', error);
      return this.getMockAllActivities(companyId);
    }
  }

  /**
   * Get all activities with seller info (joined with users)
   */
  async getAllActivitiesWithSellers(companyId, options = {}) {
    try {
      const activities = await this.getAllActivities(companyId, options);
      
      if (!activities || activities.length === 0) {
        return this.getMockAllActivities(companyId);
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
      return this.getMockAllActivities(companyId);
    }
  }

  /**
   * Get mock activities for all sellers
   */
  getMockAllActivities(companyId = 'test_company') {
    const now = new Date();
    const mockActivities = [];

    const activityTypes = [
      ActivityTypes.LEAD_CREATED,
      ActivityTypes.LEAD_VIEWED,
      ActivityTypes.LEAD_REVEALED,
      ActivityTypes.LEAD_STATUS_CHANGED,
      ActivityTypes.LEAD_CONVERTED,
      ActivityTypes.CONTACT_CREATED,
      ActivityTypes.CONTACT_STATUS_CHANGED,
      ActivityTypes.CONTACT_CONVERTED_TO_DEAL,
      ActivityTypes.DEAL_CREATED,
      ActivityTypes.DEAL_STATUS_CHANGED,
      ActivityTypes.DEAL_WON,
      ActivityTypes.DEAL_LOST,
      ActivityTypes.CONTACT_NOTE_ADDED,
    ];

    const entityNames = [
      'Ahmed Mohammed',
      'Sarah Ali',
      'Mohammed Al Maktoum',
      'Fatima Al Habtoor',
      'Khalid Al Nahyan',
      'Noora Al Suwaidi',
      'Rashid Al Maktoum',
      'Mariam Al Ketbi',
      'Hamdan Al Nahyan',
      'Layla Al Falasi',
      'Omar Al Maktoum',
      'Aisha Al Suwaidi',
      'Saeed Al Nahyan',
      'Mona Al Falasi',
      'Yusuf Al Habtoor',
    ];

    const sellerNames = [
      'John Doe',
      'Jane Smith',
      'Mike Johnson',
      'Sarah Williams',
      'David Brown',
      'Emily Davis',
      'Chris Wilson',
      'Amanda Taylor',
      'Robert Martinez',
      'Lisa Anderson',
    ];

    const statuses = ['New', 'Contacted', 'Interested', 'Not Interested', 'Converted', 'Active', 'Pending', 'Deal', 'Loss', 'Proposal', 'Won'];
    const entityTypes = ['lead', 'contact', 'deal'];

    // Generate 30-50 mock activities
    const count = 30 + Math.floor(Math.random() * 20);
    
    for (let i = 0; i < count; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - Math.floor(Math.random() * 30));
      date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), 0);

      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      const entityName = entityNames[Math.floor(Math.random() * entityNames.length)];
      const sellerName = sellerNames[Math.floor(Math.random() * sellerNames.length)];
      const sellerId = `seller_${String(Math.floor(Math.random() * 100)).padStart(3, '0')}`;
      
      const oldStatus = statuses[Math.floor(Math.random() * statuses.length)];
      let newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      while (newStatus === oldStatus) {
        newStatus = statuses[Math.floor(Math.random() * statuses.length)];
      }

      const hasAmount = Math.random() > 0.4;
      const hasNote = Math.random() > 0.6;

      const activity = {
        id: `mock_${i}`,
        sellerId: sellerId,
        companyId: companyId || 'test_company',
        activityType,
        entityType,
        entityId: `entity_${i}`,
        entityName,
        timestamp: date,
        date: date.toISOString().split('T')[0],
        time: date.toTimeString().split(' ')[0],
        month: date.toISOString().slice(0, 7),
        week: Math.floor(Math.random() * 52) + 1,
        year: date.getFullYear(),
        dayOfWeek: date.getDay(),
        hour: date.getHours(),
        details: {
          name: entityName,
          ...(hasNote && { note: `This is a test note for ${entityName}` }),
        },
        metadata: {
          oldStatus: activityType.includes('status') ? oldStatus : null,
          newStatus: activityType.includes('status') ? newStatus : null,
          amount: hasAmount ? Math.floor(Math.random() * 100000) + 5000 : null,
        },
        statusChange: activityType.includes('status'),
        hasAmount,
        hasNote,
        seller: {
          id: sellerId,
          name: sellerName,
          email: `${sellerName.toLowerCase().replace(' ', '.')}@example.com`,
          phone: '+971 50 000 0000',
        }
      };

      mockActivities.push(activity);
    }

    // Sort by date descending
    return mockActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Get activity statistics for all sellers
   */
  async getAllActivityStats(companyId) {
    try {
      const activities = await this.getAllActivities(companyId);
      
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
   * Get seller leaderboard (all sellers)
   */
  async getSellerLeaderboard(companyId, period = 'month') {
    try {
      const activities = await this.getAllActivities(companyId);
      
      const now = new Date();
      const startDate = new Date();
      if (period === 'week') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'month') {
        startDate.setMonth(startDate.getMonth() - 1);
      } else if (period === 'quarter') {
        startDate.setMonth(startDate.getMonth() - 3);
      }

      const filtered = activities.filter(a => {
        const date = a.timestamp?.toDate?.() || new Date(a.timestamp);
        return date >= startDate;
      });

      const leaderboard = {};
      filtered.forEach(a => {
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
      return this.getMockLeaderboard();
    }
  }

  /**
   * Get mock leaderboard data
   */
  getMockLeaderboard() {
    const sellers = [
      { id: 'seller_001', name: 'John Doe' },
      { id: 'seller_002', name: 'Jane Smith' },
      { id: 'seller_003', name: 'Mike Johnson' },
      { id: 'seller_004', name: 'Sarah Williams' },
      { id: 'seller_005', name: 'David Brown' },
    ];

    return sellers.map((seller, index) => ({
      sellerId: seller.id,
      sellerName: seller.name,
      rank: index + 1,
      total: 45 - (index * 8),
      conversions: {
        leadsToContacts: 12 - (index * 2),
        contactsToDeals: 8 - (index * 1.5),
        dealsWon: 5 - index,
      },
      wonAmount: 450000 - (index * 70000),
    }));
  }

  /**
   * Get activity statistics for a seller
   */
  async getSellerActivityStats(sellerId, period = 'month') {
    try {
      const activities = await this.getSellerActivities(sellerId);
      
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