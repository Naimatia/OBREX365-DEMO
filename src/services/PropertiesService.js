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
  writeBatch 
} from 'firebase/firestore';
import { db } from 'configs/FirebaseConfig';

/**
 * Service for managing properties in Firestore
 */
const PropertiesService = {

  /**
   * Get all properties for a specific company
   * @param {string} companyId - The company's ID
   * @returns {Promise<Array>} Array of properties
   */
  async getCompanyProperties(companyId) {
    try {
      const propertiesQuery = query(
        collection(db, 'properties'),
        where('company_id', '==', companyId),
        orderBy('CreationDate', 'desc')
      );
      
      const querySnapshot = await getDocs(propertiesQuery);
      const properties = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        properties.push({
          id: doc.id,
          ...data,
          // Convert timestamps to Date objects for easier handling
          CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
          LastUpdateDateTime: data.LastUpdateDateTime?.toDate ? data.LastUpdateDateTime.toDate() : data.LastUpdateDateTime
        });
      });
      
      return properties;
    } catch (error) {
      console.error('Error fetching company properties:', error);
      throw error;
    }
  },

  /**
   * Create a new property
   * @param {Object} propertyData - Property data
   * @returns {Promise<string>} ID of created property
   */
  async createProperty(propertyData) {
    try {
      const now = serverTimestamp();
      const propertyToCreate = {
        ...propertyData,
        CreationDate: now,
        LastUpdateDateTime: now,
        // Ensure these fields are properly set
        Notes: propertyData.Notes || [],
        Features: propertyData.Features || [],
        Images: propertyData.Images || []
      };
      
      const docRef = await addDoc(collection(db, 'properties'), propertyToCreate);
      return docRef.id;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  },

  /**
   * Update an existing property
   * @param {string} propertyId - Property ID
   * @param {Object} updates - Property updates
   * @returns {Promise<void>}
   */
  async updateProperty(propertyId, updates) {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const updateData = {
        ...updates,
        LastUpdateDateTime: serverTimestamp()
      };
      
      await updateDoc(propertyRef, updateData);
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  /**
   * Delete a property
   * @param {string} propertyId - Property ID
   * @returns {Promise<void>}
   */
  async deleteProperty(propertyId) {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      await deleteDoc(propertyRef);
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  },

  /**
   * Add a note to a property
   * @param {string} propertyId - Property ID
   * @param {string} noteText - Note text
   * @returns {Promise<void>}
   */
  async addNote(propertyId, noteText) {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertyDoc = await getDoc(propertyRef);
      
      if (!propertyDoc.exists()) {
        throw new Error('Property not found');
      }
      
      const propertyData = propertyDoc.data();
      const currentNotes = propertyData.Notes || [];
      
      const newNote = {
        note: noteText,
        CreationDate: new Date() // Use Date instead of serverTimestamp for arrays
      };
      
      const updatedNotes = [...currentNotes, newNote];
      
      await updateDoc(propertyRef, {
        Notes: updatedNotes,
        LastUpdateDateTime: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding note to property:', error);
      throw error;
    }
  },

  /**
   * Bulk update properties status
   * @param {Array<string>} propertyIds - Array of property IDs
   * @param {string} status - New status
   * @returns {Promise<void>}
   */
  async bulkUpdateProperties(propertyIds, status) {
    try {
      const batch = writeBatch(db);
      const now = serverTimestamp();
      
      propertyIds.forEach(propertyId => {
        const propertyRef = doc(db, 'properties', propertyId);
        batch.update(propertyRef, {
          Status: status,
          LastUpdateDateTime: now
        });
      });
      
      await batch.commit();
    } catch (error) {
      console.error('Error bulk updating properties:', error);
      throw error;
    }
  },

  /**
   * Get property by ID
   * @param {string} propertyId - Property ID
   * @returns {Promise<Object>} Property data
   */
  async getPropertyById(propertyId) {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertyDoc = await getDoc(propertyRef);
      
      if (!propertyDoc.exists()) {
        throw new Error('Property not found');
      }
      
      const data = propertyDoc.data();
      return {
        id: propertyDoc.id,
        ...data,
        CreationDate: data.CreationDate?.toDate ? data.CreationDate.toDate() : data.CreationDate,
        LastUpdateDateTime: data.LastUpdateDateTime?.toDate ? data.LastUpdateDateTime.toDate() : data.LastUpdateDateTime
      };
    } catch (error) {
      console.error('Error getting property:', error);
      throw error;
    }
  },

  /**
   * Update property images
   * @param {string} propertyId - Property ID
   * @param {Array<string>} imageUrls - Array of image URLs
   * @returns {Promise<void>}
   */
  async updatePropertyImages(propertyId, imageUrls) {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      
      await updateDoc(propertyRef, {
        Images: imageUrls,
        LastUpdateDateTime: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating property images:', error);
      throw error;
    }
  }
};

export default PropertiesService;
