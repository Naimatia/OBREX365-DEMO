// @ts-nocheck
/**
 * Service for handling property-related operations with Firestore
 */
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp, 
  Timestamp, 
  orderBy 
} from 'firebase/firestore';
import { db as firestore } from 'configs/FirebaseConfig';

/**
 * @typedef {Object} Property
 * @property {string} id - Property ID
 * @property {string} company_id - Company ID
 * @property {string} creator_id - Creator ID
 * @property {string} title - Property title
 * @property {string} description - Property description
 * @property {number} SellPrice - Sell / Rent price (AED)
 * @property {number} [Cheques] - Number of cheques (for Rent)
 * @property {string[]} Features - List of features
 * @property {string} Location - City / General location
 * @property {string} BuildingName - Building name
 * @property {string} UnitNumber - Unit number
 * @property {number|string} FloorNumber - Floor number
 * @property {number} Area - Area in Sq Ft
 * @property {string[]} Images - List of image URLs
 * @property {string} [Source] - Property source
 * @property {number} NbrBedRooms - Number of bedrooms
 * @property {number} NbrBathRooms - Number of bathrooms
 * @property {string} Type - Property type
 * @property {string} Status - Property status
 * @property {string} Category - Property category
 * @property {Date|Timestamp} CreationDate - Creation date
 * @property {Date|Timestamp} LastUpdateDateTime - Last update date/time
 * @property {Array<{note: string, CreationDate: Date|Timestamp}>} [Notes]
 */

class PropertyService {

  /**
   * Remove undefined, null, or empty values from object (Firestore compatible)
   */
  static #cleanData(data) {
    const cleaned = { ...data };

    Object.keys(cleaned).forEach(key => {
      const value = cleaned[key];
      
      // Remove undefined and null
      if (value === undefined || value === null) {
        delete cleaned[key];
      }
      // Remove empty strings (optional - you can keep them if you want)
      else if (typeof value === 'string' && value.trim() === '') {
        delete cleaned[key];
      }
      // Clean arrays
      else if (Array.isArray(value)) {
        if (value.length === 0) {
          delete cleaned[key]; // or keep as [] if you prefer
        }
      }
    });

    return cleaned;
  }

  /**
   * Fetch all properties for a specific company
   */
  static async fetchProperties(companyId) {
    try {
      const propertiesRef = collection(firestore, 'properties');
      const q = query(
        propertiesRef,
        where('company_id', '==', companyId),
        orderBy('CreationDate', 'desc')
      );

      const querySnapshot = await getDocs(q);
      
      const properties = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return properties.map(property => ({
        ...property,
        CreationDate: property.CreationDate instanceof Timestamp 
          ? property.CreationDate.toDate() 
          : property.CreationDate,
        LastUpdateDateTime: property.LastUpdateDateTime instanceof Timestamp 
          ? property.LastUpdateDateTime.toDate() 
          : property.LastUpdateDateTime,
        Notes: Array.isArray(property.Notes) 
          ? property.Notes.map(note => ({
              ...note,
              CreationDate: note.CreationDate instanceof Timestamp 
                ? note.CreationDate.toDate() 
                : note.CreationDate
            }))
          : []
      }));
    } catch (error) {
      console.error('Error fetching properties:', error);
      throw error;
    }
  }

  /**
   * Create a new property
   */
  static async createProperty(propertyData) {
    try {
      const cleanedData = this.#cleanData(propertyData);
      
      const timestamp = serverTimestamp();

      const dataWithTimestamps = {
        ...cleanedData,
        CreationDate: timestamp,
        LastUpdateDateTime: timestamp,
        Features: Array.isArray(cleanedData.Features) ? cleanedData.Features : [],
        Images: Array.isArray(cleanedData.Images) ? cleanedData.Images : [],
        Notes: Array.isArray(cleanedData.Notes) ? cleanedData.Notes : [],
      };

      const docRef = await addDoc(collection(firestore, 'properties'), dataWithTimestamps);
      return docRef.id;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  /**
   * Update an existing property
   */
  static async updateProperty(propertyId, propertyData) {
    try {
      const cleanedData = this.#cleanData(propertyData);

      const dataWithTimestamp = {
        ...cleanedData,
        LastUpdateDateTime: serverTimestamp()
      };

      const propertyRef = doc(firestore, 'properties', propertyId);
      await updateDoc(propertyRef, dataWithTimestamp);
    } catch (error) {
      console.error('Error updating property:', error);
      throw error;
    }
  }

  /**
   * Fetch a single property by ID
   * @param {string} propertyId - The property ID to fetch
   * @returns {Promise<Object>} - The property object
   */
  static async fetchPropertyById(propertyId) {
    try {
      const propertyRef = doc(firestore, 'properties', propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (!propertySnap.exists()) {
        throw new Error('Property not found');
      }

      const property = {
        id: propertySnap.id,
        ...propertySnap.data()
      };

      return {
        ...property,
        CreationDate: property.CreationDate instanceof Timestamp 
          ? property.CreationDate.toDate() 
          : property.CreationDate,
        LastUpdateDateTime: property.LastUpdateDateTime instanceof Timestamp 
          ? property.LastUpdateDateTime.toDate() 
          : property.LastUpdateDateTime,
        Notes: Array.isArray(property.Notes) 
          ? property.Notes.map(note => ({
              ...note,
              CreationDate: note.CreationDate instanceof Timestamp 
                ? note.CreationDate.toDate() 
                : note.CreationDate
            }))
          : []
      };
    } catch (error) {
      console.error('Error fetching property:', error);
      throw error;
    }
  }



  /**
   * Delete a property
   * @param {string} propertyId - The ID of the property to delete
   * @returns {Promise<void>}
   */
  static async deleteProperty(propertyId) {
    try {
      const propertyRef = doc(firestore, 'properties', propertyId);
      await deleteDoc(propertyRef);
    } catch (error) {
      console.error('Error deleting property:', error);
      throw error;
    }
  }

  /**
   * Add a note to a property
   * @param {string} propertyId - The ID of the property
   * @param {string} noteText - The note text
   * @returns {Promise<void>}
   */
  static async addPropertyNote(propertyId, noteText) {
    try {
      const propertyRef = doc(firestore, 'properties', propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (!propertySnap.exists()) {
        throw new Error('Property not found');
      }

      const propertyData = propertySnap.data();
      const notes = Array.isArray(propertyData.Notes) ? propertyData.Notes : [];

      const newNote = {
        note: noteText,
        CreationDate: serverTimestamp()
      };

      notes.push(newNote);

      await updateDoc(propertyRef, {
        Notes: notes,
        LastUpdateDateTime: serverTimestamp()
      });
    } catch (error) {
      console.error('Error adding property note:', error);
      throw error;
    }
  }
}

export default PropertyService;