import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  writeBatch,
  Timestamp 
} from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

/**
 * Service for managing deals in Firestore
 */
const DealsService = {

  /**
   * Get all deals for a specific seller
   * @param {string} sellerId - The seller's ID
   * @returns {Promise<Array>} Array of deals
   */
  async getSellerDeals(sellerId) {
    try {
      const dealsQuery = query(
        collection(db, 'deals'),
        where('seller_id', '==', sellerId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(dealsQuery);
      const deals = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        deals.push({
          id: doc.id,
          ...data,
          // Convert timestamps to Date objects for easier handling
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          LastUpdateDate: data.LastUpdateDate?.toDate ? data.LastUpdateDate.toDate() : data.LastUpdateDate
        });
      });
      
      return deals;
    } catch (error) {
      console.error('Error fetching seller deals:', error);
      throw error;
    }
  },

  /**
   * Get deals by seller_id and date range
   * @param {string} sellerId - ID of the seller
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @returns {Promise<Array>} - List of deals in the date range
   */
  async getSellerDealsByDateRange(sellerId, startDate, endDate) {
    try {
      const dealsQuery = query(
        collection(db, 'deals'),
        where('seller_id', '==', sellerId),
        where('CreationDate', '>=', Timestamp.fromDate(startDate)),
        where('CreationDate', '<=', Timestamp.fromDate(endDate)),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(dealsQuery);
      const deals = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        deals.push({
          id: doc.id,
          ...data,
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          LastUpdateDate: data.LastUpdateDate?.toDate ? data.LastUpdateDate.toDate() : data.LastUpdateDate
        });
      });
      
      return deals;
    } catch (error) {
      console.error('Error fetching seller deals by date range:', error);
      throw error;
    }
  },

  /**
   * Create a new deal
   * @param {Object} dealData - Deal data
   * @returns {Promise<string>} ID of created deal
   */
  async createDeal(dealData) {
    try {
      const now = serverTimestamp();
      const dealToCreate = {
        ...dealData,
        CreationDate: now,
        LastUpdateDate: now,
        // Ensure these fields are properly set
        contact_id: dealData.contact_id || null,
        lead_id: dealData.lead_id || null,
        property_id: dealData.property_id || null,
        Notes: dealData.Notes || []
      };
      
      const docRef = await addDoc(collection(db, 'deals'), dealToCreate);
      return docRef.id;
    } catch (error) {
      console.error('Error creating deal:', error);
      throw error;
    }
  },

  /**
   * Update an existing deal
   * @param {string} dealId - Deal ID
   * @param {Object} updates - Deal updates
   * @returns {Promise<void>}
   */
  async updateDeal(dealId, updates) {
    try {
      const dealRef = doc(db, 'deals', dealId);
      const updateData = {
        ...updates,
        LastUpdateDate: serverTimestamp()
      };
      
      await updateDoc(dealRef, updateData);
    } catch (error) {
      console.error('Error updating deal:', error);
      throw error;
    }
  },

  /**
   * Delete a deal
   * @param {string} dealId - Deal ID
   * @returns {Promise<void>}
   */
  async deleteDeal(dealId) {
    try {
      const dealRef = doc(db, 'deals', dealId);
      await deleteDoc(dealRef);
    } catch (error) {
      console.error('Error deleting deal:', error);
      throw error;
    }
  },

  /**
   * Add a note to a deal
   * @param {string} dealId - Deal ID
   * @param {string} noteText - Note text
   * @returns {Promise<void>}
   */
  async addNote(dealId, noteText) {
    try {
      const dealRef = doc(db, 'deals', dealId);
      const dealDoc = await getDoc(dealRef);
      
      if (!dealDoc.exists()) {
        throw new Error('Deal not found');
      }
      
      const dealData = dealDoc.data();
      const currentNotes = dealData.Notes || [];
      
      const newNote = {
        note: noteText,
        CreationDate: new Date() // Use Date instead of serverTimestamp for arrays
      };
      
      const updatedNotes = [...currentNotes, newNote];
      
      await updateDoc(dealRef, {
        Notes: updatedNotes,
        LastUpdateDate: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding note to deal:', error);
      throw error;
    }
  },

  /**
   * Bulk update deals status
   * @param {Array<string>} dealIds - Array of deal IDs
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async bulkUpdateDeals(dealIds, status) {
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();
      
      dealIds.forEach(dealId => {
        const dealRef = doc(db, 'deals', dealId);
        batch.update(dealRef, {
          Status: status,
          LastUpdateDate: now
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error bulk updating deals:', error);
      throw error;
    }
  },

  /**
   * Get deals by company for property selection
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} Array of deals
   */
  async getCompanyDeals(companyId) {
    try {
      const dealsQuery = query(
        collection(db, 'deals'),
        where('company_id', '==', companyId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(dealsQuery);
      const deals = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        deals.push({
          id: doc.id,
          ...data,
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          LastUpdateDate: data.LastUpdateDate?.toDate ? data.LastUpdateDate.toDate() : data.LastUpdateDate
        });
      });
      
      return deals;
    } catch (error) {
      console.error('Error fetching company deals:', error);
      throw error;
    }
  }
};

export default DealsService;
