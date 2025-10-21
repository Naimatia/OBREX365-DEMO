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
 * Service for managing leads in Firestore
 */
const LeadsService = {
  /**
   * Get all leads for a company
   * @param {string} companyId - Company ID
   * @returns {Promise<Array>} Array of leads
   */
  async getCompanyLeads(companyId) {
    try {
      const q = query(
        collection(db, 'leads'),
        where('company_id', '==', companyId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const leads = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leads.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JS Date objects
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          LastUpdateDate: data.LastUpdateDate?.toDate ? data.LastUpdateDate.toDate() : data.LastUpdateDate,
          // Ensure Notes array has proper date conversion
          Notes: data.Notes?.map(note => ({
            ...note,
            CreationDate: note.CreationDate?.toDate ? note.CreationDate.toDate() : note.CreationDate
          })) || []
        });
      });
      
      return leads;
    } catch (error) {
      console.error('Error fetching company leads:', error);
      throw error;
    }
  },

  /**
   * Get leads assigned to a specific seller
   * @param {string} companyId - Company ID
   * @param {string} sellerId - Seller ID
   * @returns {Promise<Array>} Array of leads
   */
  async getSellerLeads(companyId, sellerId) {
    try {
      const q = query(
        collection(db, 'leads'),
        where('company_id', '==', companyId),
        where('seller_id', '==', sellerId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const leads = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leads.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JS Date objects
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          LastUpdateDate: data.LastUpdateDate?.toDate ? data.LastUpdateDate.toDate() : data.LastUpdateDate,
          // Ensure Notes array has proper date conversion
          Notes: data.Notes?.map(note => ({
            ...note,
            CreationDate: note.CreationDate?.toDate ? note.CreationDate.toDate() : note.CreationDate
          })) || []
        });
      });
      
      return leads;
    } catch (error) {
      console.error('Error fetching seller leads:', error);
      throw error;
    }
  },

  /**
   * Get leads by seller_id and date range
   * @param {string} companyId - Company ID
   * @param {string} sellerId - ID of the seller
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @returns {Promise<Array>} - List of leads in the date range
   */
  async getSellerLeadsByDateRange(companyId, sellerId, startDate, endDate) {
    try {
      const q = query(
        collection(db, 'leads'),
        where('company_id', '==', companyId),
        where('seller_id', '==', sellerId),
        where('CreationDate', '>=', Timestamp.fromDate(startDate)),
        where('CreationDate', '<=', Timestamp.fromDate(endDate)),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const leads = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        leads.push({
          id: doc.id,
          ...data,
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          LastUpdateDate: data.LastUpdateDate?.toDate ? data.LastUpdateDate.toDate() : data.LastUpdateDate,
          Notes: data.Notes?.map(note => ({
            ...note,
            CreationDate: note.CreationDate?.toDate ? note.CreationDate.toDate() : note.CreationDate
          })) || []
        });
      });
      
      return leads;
    } catch (error) {
      console.error('Error fetching seller leads by date range:', error);
      throw error;
    }
  },

  /**
   * Create a new lead
   * @param {Object} leadData - Lead data
   * @returns {Promise<string>} Created lead ID
   */
  async createLead(leadData) {
    try {
      const leadToCreate = {
        ...leadData,
        CreationDate: serverTimestamp(),
        LastUpdateDate: serverTimestamp(),
        Notes: leadData.Notes || []
      };

      const docRef = await addDoc(collection(db, 'leads'), leadToCreate);
      return docRef.id;
    } catch (error) {
      console.error('Error creating lead:', error);
      throw error;
    }
  },

  /**
   * Update an existing lead
   * @param {string} leadId - Lead ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateLead(leadId, updateData) {
    try {
      const leadRef = doc(db, 'leads', leadId);
      await updateDoc(leadRef, {
        ...updateData,
        LastUpdateDate: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating lead:', error);
      throw error;
    }
  },

  /**
   * Delete a lead
   * @param {string} leadId - Lead ID
   * @returns {Promise<void>}
   */
  async deleteLead(leadId) {
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
      console.error('Error deleting lead:', error);
      throw error;
    }
  },

  /**
   * Get a single lead by ID
   * @param {string} leadId - Lead ID
   * @returns {Promise<Object|null>} Lead data or null if not found
   */
  async getLeadById(leadId) {
    try {
      const leadDoc = await getDoc(doc(db, 'leads', leadId));
      
      if (leadDoc.exists()) {
        const data = leadDoc.data();
        return {
          id: leadDoc.id,
          ...data,
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          LastUpdateDate: data.LastUpdateDate?.toDate ? data.LastUpdateDate.toDate() : data.LastUpdateDate,
          Notes: data.Notes?.map(note => ({
            ...note,
            CreationDate: note.CreationDate?.toDate ? note.CreationDate.toDate() : note.CreationDate
          })) || []
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching lead:', error);
      throw error;
    }
  },

  /**
   * Add a note to a lead
   * @param {string} leadId - Lead ID
   * @param {string} noteText - Note text
   * @returns {Promise<void>}
   */
  async addNote(leadId, noteText) {
    try {
      const leadRef = doc(db, 'leads', leadId);
      const leadDoc = await getDoc(leadRef);
      
      if (leadDoc.exists()) {
        const leadData = leadDoc.data();
        const notes = leadData.Notes || [];
        
        const newNote = {
          note: noteText,
          CreationDate: new Date()
        };
        
        await updateDoc(leadRef, {
          Notes: [...notes, newNote],
          LastUpdateDate: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  },

  /**
   * Bulk update leads (for multi-select operations)
   * @param {Array<string>} leadIds - IDs of leads to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async bulkUpdateLeads(leadIds, updateData) {
    try {
      const batch = writeBatch(db);
      
      leadIds.forEach(leadId => {
        const leadRef = doc(db, 'leads', leadId);
        batch.update(leadRef, {
          ...updateData,
          LastUpdateDate: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error bulk updating leads:', error);
      throw error;
    }
  }
};

export default LeadsService;
