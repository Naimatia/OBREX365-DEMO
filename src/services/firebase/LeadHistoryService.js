// services/firebase/LeadHistoryService.js
import { db } from 'configs/FirebaseConfig';
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';

class LeadHistoryService {
  static async addHistory(leadId, history, currentUserId) {
    return await addDoc(collection(db, 'leads', leadId, 'leadHistory'), {
      ...history,
      createdAt: serverTimestamp()
    });
  }

  static listenToHistory(leadId, callback) {
    const q = query(
      collection(db, 'leads', leadId, 'leadHistory'),
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

  // NEW: Get seller name by ID
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

  // NEW: Get company data
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

  /** Mark the lead as contacted (idempotent) */
  static async markAsContacted(leadId) {
    const leadRef = doc(db, 'leads', leadId);
    try {
      await updateDoc(leadRef, { contacted: true });
    } catch (err) {
      console.error('Failed to mark lead as contacted:', err);
    }
  }
}

export default LeadHistoryService;