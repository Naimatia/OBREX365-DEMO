// @ts-nocheck
import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  getDoc,
  arrayUnion,
  Timestamp 
} from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

/**
 * Service for managing invoices in Firestore
 */
class InvoicesService {
  constructor() {
    this.collectionName = 'invoices';
  }

  /**
   * Get all invoices for a specific creator (seller)
   * @param {string} creatorId - Creator user ID
   * @returns {Promise<Array>} Array of invoices
   */
  async getSellerInvoices(creatorId) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('creator_id', '==', creatorId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const invoices = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        invoices.push({
          id: doc.id,
          ...data,
          CreationDate: data.CreationDate?.toDate?.() || data.CreationDate,
          LastUpdate: data.LastUpdate?.toDate?.() || data.LastUpdate,
          DateLimit: data.DateLimit?.toDate?.() || data.DateLimit
        });
      });
      
      return invoices;
    } catch (error) {
      console.error('Error fetching seller invoices:', error);
      throw error;
    }
  }

  /**
   * Get invoices by creator_id and date range
   * @param {string} creatorId - ID of the creator
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @returns {Promise<Array>} - List of invoices in the date range
   */
  async getSellerInvoicesByDateRange(creatorId, startDate, endDate) {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('creator_id', '==', creatorId),
        where('CreationDate', '>=', Timestamp.fromDate(startDate)),
        where('CreationDate', '<=', Timestamp.fromDate(endDate)),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const invoices = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        invoices.push({
          id: doc.id,
          ...data,
          CreationDate: data.CreationDate?.toDate?.() || data.CreationDate,
          LastUpdate: data.LastUpdate?.toDate?.() || data.LastUpdate,
          DateLimit: data.DateLimit?.toDate?.() || data.DateLimit
        });
      });
      
      return invoices;
    } catch (error) {
      console.error('Error fetching seller invoices by date range:', error);
      throw error;
    }
  }

  /**
   * Get invoice by ID
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<Object>} Invoice object
   */
  async getInvoiceById(invoiceId) {
    try {
      const docRef = doc(db, this.collectionName, invoiceId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          CreationDate: data.CreationDate?.toDate?.() || data.CreationDate,
          LastUpdate: data.LastUpdate?.toDate?.() || data.LastUpdate,
          DateLimit: data.DateLimit?.toDate?.() || data.DateLimit
        };
      } else {
        throw new Error('Invoice not found');
      }
    } catch (error) {
      console.error('Error fetching invoice:', error);
      throw error;
    }
  }

  /**
   * Create a new invoice
   * @param {Object} invoiceData - Invoice data
   * @returns {Promise<string>} Created invoice ID
   */
  async createInvoice(invoiceData) {
    try {
      const now = new Date();
      const invoice = {
        ...invoiceData,
        CreationDate: Timestamp.fromDate(now),
        LastUpdate: Timestamp.fromDate(now),
        DateLimit: invoiceData.DateLimit ? Timestamp.fromDate(new Date(invoiceData.DateLimit)) : null,
        Status: invoiceData.Status || 'Pending',
        Notes: invoiceData.Notes || []
      };
      
      const docRef = await addDoc(collection(db, this.collectionName), invoice);
      return docRef.id;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  /**
   * Update an existing invoice
   * @param {string} invoiceId - Invoice ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async updateInvoice(invoiceId, updateData) {
    try {
      const docRef = doc(db, this.collectionName, invoiceId);
      const updateFields = {
        ...updateData,
        LastUpdate: Timestamp.fromDate(new Date())
      };

      // Convert DateLimit to Timestamp if provided
      if (updateData.DateLimit) {
        updateFields.DateLimit = Timestamp.fromDate(new Date(updateData.DateLimit));
      }
      
      await updateDoc(docRef, updateFields);
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  /**
   * Update invoice status
   * @param {string} invoiceId - Invoice ID
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async updateInvoiceStatus(invoiceId, status) {
    try {
      const docRef = doc(db, this.collectionName, invoiceId);
      await updateDoc(docRef, {
        Status: status,
        LastUpdate: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error updating invoice status:', error);
      throw error;
    }
  }

  /**
   * Delete an invoice
   * @param {string} invoiceId - Invoice ID
   * @returns {Promise<void>}
   */
  async deleteInvoice(invoiceId) {
    try {
      const docRef = doc(db, this.collectionName, invoiceId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  /**
   * Add a note to an invoice
   * @param {string} invoiceId - Invoice ID
   * @param {string} noteText - Note text
   * @returns {Promise<void>}
   */
  async addNote(invoiceId, noteText) {
    try {
      const docRef = doc(db, this.collectionName, invoiceId);
      const note = {
        text: noteText,
        timestamp: Timestamp.fromDate(new Date()),
        id: Date.now().toString()
      };
      
      await updateDoc(docRef, {
        Notes: arrayUnion(note),
        LastUpdate: Timestamp.fromDate(new Date())
      });
    } catch (error) {
      console.error('Error adding note to invoice:', error);
      throw error;
    }
  }

  /**
   * Bulk update multiple invoices
   * @param {Array} invoiceIds - Array of invoice IDs
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async bulkUpdateInvoices(invoiceIds, updateData) {
    try {
      const promises = invoiceIds.map(id => this.updateInvoice(id, updateData));
      await Promise.all(promises);
    } catch (error) {
      console.error('Error bulk updating invoices:', error);
      throw error;
    }
  }
}

export default new InvoicesService();
