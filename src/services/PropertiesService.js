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
 * Remove undefined, null, or empty values (Firestore doesn't allow undefined)
 */
const cleanData = (data) => {
  const cleaned = { ...data };

  Object.keys(cleaned).forEach(key => {
    const value = cleaned[key];

    // Remove undefined and null
    if (value === undefined || value === null) {
      delete cleaned[key];
    }
    // Remove empty strings (optional - you can keep them if needed)
    else if (typeof value === 'string' && value.trim() === '') {
      delete cleaned[key];
    }
    // Clean arrays
    else if (Array.isArray(value)) {
      if (value.length === 0) {
        delete cleaned[key]; // or set to [] if you prefer to keep empty arrays
      }
    }
  });

  return cleaned;
};

/**
 * Service for managing properties in Firestore
 */
const PropertiesService = {

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
   */
  async createProperty(propertyData) {
    try {
      const cleanedData = cleanData(propertyData);
      
      const now = serverTimestamp();
      
      const propertyToCreate = {
        ...cleanedData,
        CreationDate: now,
        LastUpdateDateTime: now,
        Notes: Array.isArray(cleanedData.Notes) ? cleanedData.Notes : [],
        Features: Array.isArray(cleanedData.Features) ? cleanedData.Features : [],
        Images: Array.isArray(cleanedData.Images) ? cleanedData.Images : [],
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
   */
  async updateProperty(propertyId, updates) {
    try {
      const cleanedUpdates = cleanData(updates);
      
      const updateData = {
        ...cleanedUpdates,
        LastUpdateDateTime: serverTimestamp()
      };

      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, updateData);
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  },

  async deleteProperty(propertyId) {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      await deleteDoc(propertyRef);
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  },

  async addNote(propertyId, noteText) {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertyDoc = await getDoc(propertyRef);
      
      if (!propertyDoc.exists()) throw new Error('Property not found');

      const currentNotes = propertyDoc.data().Notes || [];
      
      const newNote = {
        note: noteText,
        CreationDate: new Date()
      };

      await updateDoc(propertyRef, {
        Notes: [...currentNotes, newNote],
        LastUpdateDateTime: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding note:', error);
      throw error;
    }
  },

  // ... keep other methods as they are
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

  async getPropertyById(propertyId) {
    try {
      const propertyRef = doc(db, 'properties', propertyId);
      const propertyDoc = await getDoc(propertyRef);
      
      if (!propertyDoc.exists()) throw new Error('Property not found');
      
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
  }
};

export default PropertiesService;