// services/firebase/LeadHistoryService.js

import { db } from 'configs/FirebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, where, limit, getDocs, getCountFromServer, startAfter } from 'firebase/firestore';
import LeadsService from 'services/LeadsService';

class LeadHistoryService {

  static async addHistory(leadId, history) {
    return await addDoc(collection(db, 'leads', leadId, 'leadHistory'), {
      ...history,
      sellerId: history.sellerId || history.createdBy?.id,
      createdAt: serverTimestamp()
    });
  }

  static listenToHistory(leadId, sellerId, callback) {
    if (!leadId || !sellerId) {
      callback([]);
      return () => {};
    }

    const q = query(
      collection(db, 'leads', leadId, 'leadHistory'),
      where('sellerId', '==', sellerId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, snapshot => {
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      }));
      callback(history);
    });
  }

  static async getSellerName(sellerId) {
    if (!sellerId) return 'Unknown Seller';
    try {
      const userDoc = await getDoc(doc(db, 'users', sellerId));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return `${data.firstname || ''} ${data.lastname || ''}`.trim();
      }
      return 'Unknown Seller';
    } catch (error) {
      console.error('Error fetching seller:', error);
      return 'Unknown Seller';
    }
  }

  static async getCompanyData(companyId) {
    if (!companyId) return { name: '[Your Company]', email: 'info@company.com', phone: 'your phone' };
    try {
      const compDoc = await getDoc(doc(db, 'companies', companyId));
      if (compDoc.exists()) {
        return compDoc.data();
      }
      return { name: '[Your Company]', email: 'info@company.com', phone: 'your phone' };
    } catch (error) {
      console.error('Error fetching company:', error);
      return { name: '[Your Company]', email: 'info@company.com', phone: 'your phone' };
    }
  }

  static async markAsContacted(leadId) {
    const leadRef = doc(db, 'leads', leadId);
    try {
      await updateDoc(leadRef, { contacted: true });
    } catch (err) {
      console.error('Failed to mark lead as contacted:', err);
    }
  }

  static async hasSellerContactedLead(leadId, sellerId) {
    if (!leadId || !sellerId) return false;

    try {
      const q = query(
        collection(db, 'leads', leadId, 'leadHistory'),
        where('sellerId', '==', sellerId),
        where('type', 'in', ['whatsapp', 'email', 'call']),
        limit(1)
      );

      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (err) {
      console.error('Error checking history for contact:', err);
      return false;
    }
  }

  // ✅ ADD THIS METHOD - Fixes the error
  static async getLeadHistory(leadId, options = {}) {
    const { limit: limitCount = 100 } = options;
    
    if (!leadId) {
      console.warn("getLeadHistory: No leadId provided");
      return [];
    }

    try {
      const q = query(
        collection(db, 'leads', leadId, 'leadHistory'),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
      
      return history;
    } catch (err) {
      console.error(`Failed to fetch history for lead ${leadId}:`, err);
      return [];
    }
  }

  // ✅ ADD THIS METHOD - Get seller view event
  static async getSellerViewEvent(leadId, sellerId) {
    if (!leadId || !sellerId) return null;

    try {
      const q = query(
        collection(db, 'leads', leadId, 'leadHistory'),
        where('sellerId', '==', sellerId),
        where('type', '==', 'view'),
        orderBy('createdAt', 'desc'),
        limit(1)
      );
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return null;
      
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      };
    } catch (err) {
      console.error(`Failed to fetch view event for lead ${leadId}:`, err);
      return null;
    }
  }

  static async getSellerAllHistory(sellerId, options = {}) {
    const { 
      pageSize = 500,
      startAfter: startAfterTimestamp,
      companyId 
    } = options;

    if (!sellerId) {
      console.warn("getSellerAllHistory: No sellerId provided");
      return { items: [], total: 0, hasMore: false };
    }

    try {
      let leads = [];
      try {
        leads = await LeadsService.getSellerLeadsByDateRange(
          companyId || null,
          sellerId
        );
      } catch (e) {
        console.warn("Failed to fetch leads for seller history:", e);
      }

      if (!leads?.length) {
        return { items: [], total: 0, hasMore: false };
      }

      console.log(`Fetching history for ${leads.length} leads of seller ${sellerId}`);

      const historyPromises = leads.slice(0, 100).map(async (lead) => {
        try {
          let q = query(
            collection(db, 'leads', lead.id, 'leadHistory'),
            where('sellerId', '==', sellerId),
            orderBy('createdAt', 'desc'),
            limit(40)
          );

          if (startAfterTimestamp) {
            q = query(q, startAfter(startAfterTimestamp));
          }

          const snapshot = await getDocs(q);

          return snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              leadId: lead.id,
              leadName: lead.name || lead.fullName || lead.FirstName || lead.LastName || 'Unknown Lead',
              ...data,
              createdAt: data.createdAt?.toDate?.() || new Date(),
            };
          });
        } catch (err) {
          console.warn(`Failed to fetch history for lead ${lead.id}:`, err);
          return [];
        }
      });

      const results = await Promise.all(historyPromises);
      let allItems = results.flat();

      allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      const finalPageSize = Math.min(pageSize, allItems.length);
      const hasMore = allItems.length > pageSize;

      return {
        items: allItems.slice(0, finalPageSize),
        total: allItems.length,
        hasMore,
      };
    } catch (err) {
      console.error('getSellerAllHistory failed:', err);
      return { items: [], total: 0, hasMore: false };
    }
  }

  static async logLeadEvent(leadId, eventData) {
    try {
      await addDoc(collection(db, 'leadHistory'), {
        leadId: leadId,
        ...eventData,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error logging lead event:', error);
    }
  }
}

export default LeadHistoryService;