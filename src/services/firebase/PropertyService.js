import BaseFirebaseService from './BaseFirebaseService';
import { convertToPropertyModel, PropertyStatus } from '../../models/PropertyModel';
import { db, storage, storageRef as ref, uploadBytes, getDownloadURL, deleteObject } from '../../configs/FirebaseConfig';

/**
 * Service for managing properties with Firebase
 * Extends BaseFirebaseService for common CRUD operations
 */
class PropertyService extends BaseFirebaseService {
  /**
   * Constructor
   */
  constructor() {
    super('properties', convertToPropertyModel);
  }

  /**
   * Get properties by company ID
   * @param {string} companyId - Company ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of properties
   */
  async getPropertiesByCompany(companyId, options = {}) {
    return this.getAllByCompany(companyId, options);
  }

  /**
   * Get properties by status
   * @param {string} companyId - Company ID
   * @param {string} status - Property status
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of properties
   */
  async getPropertiesByStatus(companyId, status, options = {}) {
    const statusFilter = ['status', '==', status];
    const filters = options.filters ? [...options.filters, statusFilter] : [statusFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get properties by type
   * @param {string} companyId - Company ID
   * @param {string} propertyType - Property type
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of properties
   */
  async getPropertiesByType(companyId, propertyType, options = {}) {
    const typeFilter = ['propertyType', '==', propertyType];
    const filters = options.filters ? [...options.filters, typeFilter] : [typeFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get properties by agent
   * @param {string} companyId - Company ID
   * @param {string} agentId - Agent ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of properties
   */
  async getPropertiesByAgent(companyId, agentId, options = {}) {
    const agentFilter = ['assignedTo.id', '==', agentId];
    const filters = options.filters ? [...options.filters, agentFilter] : [agentFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Get properties by price range
   * @param {string} companyId - Company ID
   * @param {number} minPrice - Minimum price
   * @param {number} maxPrice - Maximum price
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of properties
   */
  async getPropertiesByPriceRange(companyId, minPrice, maxPrice, options = {}) {
    const minPriceFilter = ['price', '>=', minPrice];
    const maxPriceFilter = ['price', '<=', maxPrice];
    const filters = options.filters ? 
      [...options.filters, minPriceFilter, maxPriceFilter] : 
      [minPriceFilter, maxPriceFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Search properties by location
   * @param {string} companyId - Company ID
   * @param {string} location - Location to search (city, state, zip, or address)
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Array of properties
   */
  async searchPropertiesByLocation(companyId, location, options = {}) {
    // For a basic implementation, we'll just search by city
    // A more robust solution would use a dedicated search service or multiple queries
    const cityFilter = ['city', '>=', location];
    const cityEndFilter = ['city', '<=', location + '\uf8ff'];
    
    const filters = options.filters ? 
      [...options.filters, cityFilter, cityEndFilter] : 
      [cityFilter, cityEndFilter];
    
    return this.getAllByCompany(companyId, {
      ...options,
      filters
    });
  }

  /**
   * Upload property images
   * @param {string} propertyId - Property ID
   * @param {File|Blob} imageFile - Image file to upload
   * @param {string} fileName - File name
   * @returns {Promise<string>} - Download URL
   */
  async uploadPropertyImage(propertyId, imageFile, fileName) {
    try {
      const path = `properties/${propertyId}/images/${fileName}`;
      const storageRef = ref(storage, path);
      
      // Upload file
      const uploadResult = await uploadBytes(storageRef, imageFile);
      
      // Get download URL
      const downloadURL = await getDownloadURL(uploadResult.ref);
      
      // Update property with new image URL
      const property = await this.getById(propertyId);
      
      if (property) {
        const images = property.images || [];
        images.push({
          url: downloadURL,
          path: path,
          name: fileName,
          uploadedAt: new Date()
        });
        
        await this.update(propertyId, { images });
      }
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading property image:', error);
      throw error;
    }
  }

  /**
   * Delete property image
   * @param {string} propertyId - Property ID
   * @param {string} imagePath - Storage path of the image
   * @returns {Promise<boolean>} - Success status
   */
  async deletePropertyImage(propertyId, imagePath) {
    try {
      // Delete from storage
      const storageRef = ref(storage, imagePath);
      await deleteObject(storageRef);
      
      // Update property
      const property = await this.getById(propertyId);
      
      if (property && property.images) {
        const updatedImages = property.images.filter(img => img.path !== imagePath);
        await this.update(propertyId, { images: updatedImages });
      }
      
      return true;
    } catch (error) {
      console.error('Error deleting property image:', error);
      throw error;
    }
  }

  /**
   * Set property as featured
   * @param {string} propertyId - Property ID
   * @param {boolean} featured - Featured status
   * @returns {Promise<Object>} - Updated property
   */
  async setFeatured(propertyId, featured) {
    return this.update(propertyId, { featured });
  }

  /**
   * Change property status
   * @param {string} propertyId - Property ID
   * @param {string} status - New status
   * @returns {Promise<Object>} - Updated property
   */
  async changeStatus(propertyId, status) {
    // Validate status
    if (!Object.values(PropertyStatus).includes(status)) {
      throw new Error(`Invalid property status: ${status}`);
    }
    
    return this.update(propertyId, { status });
  }

  /**
   * Add property amenity
   * @param {string} propertyId - Property ID
   * @param {string} amenity - Amenity to add
   * @returns {Promise<Object>} - Updated property
   */
  async addAmenity(propertyId, amenity) {
    const property = await this.getById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    const amenities = property.amenities || [];
    
    if (!amenities.includes(amenity)) {
      amenities.push(amenity);
      return this.update(propertyId, { amenities });
    }
    
    return property;
  }

  /**
   * Remove property amenity
   * @param {string} propertyId - Property ID
   * @param {string} amenity - Amenity to remove
   * @returns {Promise<Object>} - Updated property
   */
  async removeAmenity(propertyId, amenity) {
    const property = await this.getById(propertyId);
    
    if (!property) {
      throw new Error('Property not found');
    }
    
    const amenities = property.amenities || [];
    const updatedAmenities = amenities.filter(a => a !== amenity);
    
    return this.update(propertyId, { amenities: updatedAmenities });
  }

  /**
   * Assign property to an agent
   * @param {string} propertyId - Property ID
   * @param {Object} agent - Agent object with id and name
   * @returns {Promise<Object>} - Updated property
   */
  async assignToAgent(propertyId, agent) {
    return this.update(propertyId, { 
      assignedTo: {
        id: agent.id,
        name: agent.firstName + ' ' + agent.lastName
      }
    });
  }

  /**
   * Get featured properties
   * @param {string} companyId - Company ID
   * @param {number} limit - Maximum number of properties to return
   * @returns {Promise<Array>} - Array of featured properties
   */
  async getFeaturedProperties(companyId, limit = 10) {
    const featuredFilter = ['featured', '==', true];
    
    return this.getAllByCompany(companyId, {
      filters: [featuredFilter],
      orderByFields: [['updatedAt', 'desc']],
      limitCount: limit
    });
  }

  /**
   * Get recent properties
   * @param {string} companyId - Company ID
   * @param {number} limit - Maximum number of properties to return
   * @returns {Promise<Array>} - Array of recent properties
   */
  async getRecentProperties(companyId, limit = 5) {
    return this.getAllByCompany(companyId, {
      orderByFields: [['createdAt', 'desc']],
      limitCount: limit
    });
  }
}

// Create and export a singleton instance
const propertyService = new PropertyService();
export default propertyService;
