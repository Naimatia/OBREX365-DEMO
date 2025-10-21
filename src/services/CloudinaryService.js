/**
 * Service for handling Cloudinary file uploads
 * Uses unsigned uploads with an upload preset
 */

// Cloudinary configuration
/*
const CLOUDINARY_CONFIG = {
  cloudName: 'dop2pji6u', // Replace with your actual cloud name if different
  apiKey: '926411419356193',
  uploadPreset: 'ml_default' // Ensure this preset supports raw files
};
*/
const CLOUDINARY_CONFIG = {
  cloudName: 'danzhiaqf', // Replace with your actual cloud name if different
  apiKey: '778899288798383',
  uploadPreset: 'ORBREX365' // Ensure this preset supports raw files
};

// Cloudinary upload URL
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/auto/upload`;

class CloudinaryService {
  /**
   * Upload a file to Cloudinary (supports images, PDFs, DOC, DOCX)
   * 
   * @param {File} file - The file to upload
   * @param {Object} options - Upload options
   * @param {string} [options.folder] - Folder to store the file (optional)
   * @param {string|string[]} [options.tags] - Tags to add to the file (optional)
   * @param {string} [options.resource_type] - Resource type (auto, image, raw, etc.)
   * @param {string} [options.access_mode] - Access mode for the file (e.g., 'public')
   * @returns {Promise<Object>} - Upload response with file URL and details
   */
  async uploadFile(file, options = {}) {
    try {
      // Create form data for upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      
      // Add folder if specified
      if (options.folder) {
        formData.append('folder', options.folder);
      }
      
      // Add tags if specified
      if (options.tags) {
        const tags = Array.isArray(options.tags) ? options.tags.join(',') : options.tags;
        formData.append('tags', tags);
      }
      
      // Add resource type if specified
      if (options.resource_type) {
        formData.append('resource_type', options.resource_type);
      }

      // Upload to Cloudinary
      const response = await fetch(UPLOAD_URL, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Cloudinary upload failed: ${errorData.error?.message || 'Unknown error'}`);
      }
      
      // Parse and return the response
      const data = await response.json();
      
      return {
        url: data.secure_url,
        publicId: data.public_id,
        format: data.format,
        originalFilename: data.original_filename,
        resourceType: data.resource_type,
        createdAt: data.created_at
      };
    } catch (error) {
      console.error('Error uploading file to Cloudinary:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Delete a file from Cloudinary
   * Note: This method requires server-side signing for security reasons
   * and should be implemented on the backend
   * 
   * @param {string} publicId - Public ID of the file to delete
   */
  async deleteFile(publicId) {
    console.warn('File deletion should be implemented on the server side for security.');
    throw new Error('File deletion directly from client is not supported.');
  }
}

const cloudinaryService = new CloudinaryService();
export default cloudinaryService;