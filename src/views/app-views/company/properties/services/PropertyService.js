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
 * @property {string} title - Property title
 * @property {string} description - Property description
 * @property {number} OriginalPrice - Original price
 * @property {number} SellPrice - Selling price
 * @property {string[]} Features - List of features
 * @property {string} Location - Property location
 * @property {string} address - Property address
 * @property {string[]} Images - List of image URLs
 * @property {string} Source - Property source
 * @property {number} NbrBedRooms - Number of bedrooms
 * @property {number} NbrBathRooms - Number of bathrooms
 * @property {string} Type - Property type
 * @property {string} Status - Property status
 * @property {string} Category - Property category
 * @property {Date|Timestamp} CreationDate - Creation date
 * @property {Date|Timestamp} LastUpdateDateTime - Last update date/time
 * @property {string} creator_id - Creator ID
 * @property {Array<{text: string, CreationDate: Date|Timestamp}>} Notes - List of notes
 */

class PropertyService {
  /**
   * Fetch all properties for a specific company
   * @param {string} companyId - The company ID to fetch properties for
   * @returns {Promise<Array<Property>>} - Array of property objects
   */
  static async fetchProperties(companyId) {
    try {
      // Create query to get all properties for this company, ordered by creation date
      const propertiesRef = collection(firestore, 'properties');
      const q = query(
        propertiesRef,
        where('company_id', '==', companyId),
        orderBy('CreationDate', 'desc')
      );

      // Execute query
      const querySnapshot = await getDocs(q);
      
      // Map results to array
      /** @type {Array<Property>} */
      const properties = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Convert Firestore timestamps to JavaScript Date objects
      return properties.map(/** @param {Property} property */ property => ({
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

      // Convert Firestore timestamps to JavaScript Date objects
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
   * Create a new property
   * @param {Object} propertyData - The property data to create
   * @returns {Promise<string>} - The new property ID
   */
  static async createProperty(propertyData) {
    try {
      // Add timestamps
      const timestamp = serverTimestamp();
      const dataWithTimestamps = {
        ...propertyData,
        CreationDate: timestamp,
        LastUpdateDateTime: timestamp
      };

      // Ensure arrays are properly initialized
      if (!dataWithTimestamps.Features) dataWithTimestamps.Features = [];
      if (!dataWithTimestamps.Images) dataWithTimestamps.Images = [];
      if (!dataWithTimestamps.Notes) dataWithTimestamps.Notes = [];

      // Add document to Firestore
      const docRef = await addDoc(collection(firestore, 'properties'), dataWithTimestamps);
      return docRef.id;
    } catch (error) {
      console.error('Error creating property:', error);
      throw error;
    }
  }

  /**
   * Update an existing property
   * @param {string} propertyId - The ID of the property to update
   * @param {Object} propertyData - The new property data
   * @returns {Promise<void>}
   */
  static async updateProperty(propertyId, propertyData) {
    try {
      // Add update timestamp
      const dataWithTimestamp = {
        ...propertyData,
        LastUpdateDateTime: serverTimestamp()
      };

      // Update document in Firestore
      const propertyRef = doc(firestore, 'properties', propertyId);
      await updateDoc(propertyRef, dataWithTimestamp);
    } catch (error) {
      console.error('Error updating property:', error);
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
      // Delete document from Firestore
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
      // Get current property data
      const propertyRef = doc(firestore, 'properties', propertyId);
      const propertySnap = await getDoc(propertyRef);

      if (!propertySnap.exists()) {
        throw new Error('Property not found');
      }

      const propertyData = propertySnap.data();
      const notes = Array.isArray(propertyData.Notes) ? propertyData.Notes : [];

      // Create new note
      const newNote = {
        note: noteText,
        CreationDate: serverTimestamp()
      };

      // Add note to array
      notes.push(newNote);

      // Update property
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
