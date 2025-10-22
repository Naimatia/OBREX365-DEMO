import { 
  db,
  auth
} from '../auth/FirebaseAuth';
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
  orderBy, 
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';

/**
 * Service for handling contacts-related operations with Firebase
 */
const ContactsService = {
  /**
   * Get all contacts for a specific company
   * @param {string} companyId - ID of the company
   * @returns {Promise<Array>} - List of contacts
   */
  async getCompanyContacts(companyId) {
    try {
      const contactsRef = collection(db, 'contacts');
      const q = query(
        contactsRef,
        where('company_id', '==', companyId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const contacts = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
         // Helper function to safely convert a value to a JavaScript Date
      const safeToDate = (value) => {
        if (value && typeof value.toDate === 'function') {
          return value.toDate(); // Firebase Timestamp
        }
        if (value instanceof Date) {
          return value; // Already a Date object
        }
        if (typeof value === 'string' || typeof value === 'number') {
          const parsedDate = new Date(value);
          return isNaN(parsedDate.getTime()) ? null : parsedDate; // Valid date string or timestamp
        }
        return null; // Fallback for invalid or missing values
      };
    contacts.push({
        id: doc.id,
        ...data,
        // Convert Firestore timestamps to JavaScript Date objects
        CreationDate: safeToDate(data.CreationDate),
        AffectingDate: safeToDate(data.AffectingDate),
        LastUpdateDate: safeToDate(data.LastUpdateDate),
        Notes: Array.isArray(data.Notes)
          ? data.Notes.map(note => ({
              ...note,
              CreationDate: safeToDate(note.CreationDate)
            }))
          : []
      });
      });
      
      return contacts;
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw error;
    }
  },

  /**
   * Get all contacts assigned to a specific seller
   * @param {string} sellerId - ID of the seller
   * @returns {Promise<Array>} - List of contacts assigned to the seller
   */
  async getSellerContacts(sellerId) {
    try {
      const contactsRef = collection(db, 'contacts');
      const q = query(
        contactsRef,
        where('seller_id', '==', sellerId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const contacts = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        contacts.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JavaScript Date objects
          CreationDate: data.CreationDate ? data.CreationDate.toDate() : null,
          AffectingDate: data.AffectingDate ? data.AffectingDate.toDate() : null,
          LastUpdateDate: data.LastUpdateDate ? data.LastUpdateDate.toDate() : null,
        });
      });
      
      return contacts;
    } catch (error) {
      console.error('Error getting seller contacts:', error);
      throw error;
    }
  },

  /**
   * Get contacts by seller_id and date range
   * @param {string} sellerId - ID of the seller
   * @param {Date} startDate - Start date for filtering
   * @param {Date} endDate - End date for filtering
   * @returns {Promise<Array>} - List of contacts in the date range
   */
  async getSellerContactsByDateRange(sellerId, startDate, endDate) {
    try {
      const contactsRef = collection(db, 'contacts');
      const q = query(
        contactsRef,
        where('seller_id', '==', sellerId),
        where('CreationDate', '>=', Timestamp.fromDate(startDate)),
        where('CreationDate', '<=', Timestamp.fromDate(endDate)),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const contacts = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        contacts.push({
          id: doc.id,
          ...data,
          CreationDate: data.CreationDate ? data.CreationDate.toDate() : null,
          AffectingDate: data.AffectingDate ? data.AffectingDate.toDate() : null,
          LastUpdateDate: data.LastUpdateDate ? data.LastUpdateDate.toDate() : null,
        });
      });
      
      return contacts;
    } catch (error) {
      console.error('Error getting seller contacts by date range:', error);
      throw error;
    }
  },

  /**
   * Get sellers for a specific company (for dropdown selection)
   * @param {string} companyId - ID of the company
   * @returns {Promise<Array>} - List of sellers
   */
  async getCompanySellers(companyId) {
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('company_id', '==', companyId),
        where('Role', '==', 'Seller')
      );
      
      const querySnapshot = await getDocs(q);
      const sellers = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        sellers.push({
          id: doc.id,
          name: `${data.firstname} ${data.lastname}`,
          email: data.email
        });
      });
      
      return sellers;
    } catch (error) {
      console.error('Error getting sellers:', error);
      throw error;
    }
  },

  /**
   * Create a new contact
   * @param {Object} contactData - Contact data
   * @returns {Promise<string>} - ID of created contact
   */
  async createContact(contactData) {
    try {
      // Add timestamps
      const contactWithTimestamps = {
        ...contactData,
        CreationDate: serverTimestamp(),
        LastUpdateDate: serverTimestamp(),
        AffectingDate: contactData.AffectingDate || null,
        Notes: contactData.Notes || []
      };

      const docRef = await addDoc(collection(db, 'contacts'), contactWithTimestamps);
      return docRef.id;
    } catch (error) {
      console.error('Error creating contact:', error);
      throw error;
    }
  },

  /**
   * Update an existing contact
   * @param {string} contactId - ID of the contact
   * @param {Object} contactData - Updated contact data
   * @returns {Promise<void>}
   */
  async updateContact(contactId, contactData) {
    try {
      const contactRef = doc(db, 'contacts', contactId);
      
      // Update timestamp
      const updatedData = {
        ...contactData,
        LastUpdateDate: serverTimestamp()
      };
      
      await updateDoc(contactRef, updatedData);
    } catch (error) {
      console.error('Error updating contact:', error);
      throw error;
    }
  },

  /**
   * Delete a contact
   * @param {string} contactId - ID of the contact
   * @returns {Promise<void>}
   */
  async deleteContact(contactId) {
    try {
      const contactRef = doc(db, 'contacts', contactId);
      await deleteDoc(contactRef);
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw error;
    }
  },

  /**
   * Add a note to a contact
   * @param {string} contactId - ID of the contact
   * @param {string} noteText - Note text
   * @returns {Promise<void>}
   */
  async addNote(contactId, noteText) {
    try {
      const contactRef = doc(db, 'contacts', contactId);
      const contactDoc = await getDoc(contactRef);
      
      if (contactDoc.exists()) {
        const contactData = contactDoc.data();
        const notes = contactData.Notes || [];
        
        const newNote = {
          note: noteText,
          CreationDate: new Date()
        };
        
        await updateDoc(contactRef, {
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
   * Bulk update contacts (for multi-select operations)
   * @param {Array<string>} contactIds - IDs of contacts to update
   * @param {Object} updateData - Data to update
   * @returns {Promise<void>}
   */
  async bulkUpdateContacts(contactIds, updateData) {
    try {
      const batch = writeBatch(db);
      
      contactIds.forEach(id => {
        const contactRef = doc(db, 'contacts', id);
        batch.update(contactRef, {
          ...updateData,
          LastUpdateDate: serverTimestamp()
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error bulk updating contacts:', error);
      throw error;
    }
  },

  /**
   * Parse date strings into Firestore timestamps for querying
   * @param {string} dateString - Date string in format YYYY-MM-DD
   * @returns {Timestamp} Firestore timestamp
   */
  parseDate(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    return Timestamp.fromDate(date);
  }
};

export default ContactsService;
