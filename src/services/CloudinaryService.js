/**
 * Fixed CloudinaryService for React (unsigned uploads)
 * Supports images and videos reliably
 */

const CLOUDINARY_CONFIG = {
  cloudName: 'danzhiaqf',           // Your cloud name
  uploadPreset: 'ORBREX365',        // Must be set to "Unsigned" in Cloudinary dashboard
};

class CloudinaryService {
  async uploadFile(file, options = {}) {
    if (!file) {
      throw new Error("No file provided");
    }

    try {
      const isVideo = file.type.startsWith("video/");
      const resourceType = isVideo ? "video" : "image";

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

      // Optional: folder
      if (options.folder) {
        formData.append("folder", options.folder);
      }

      // Optional: tags
      if (options.tags) {
        const tags = Array.isArray(options.tags) ? options.tags.join(",") : options.tags;
        formData.append("tags", tags);
      }

      console.log(`🚀 Uploading ${isVideo ? "VIDEO" : "IMAGE"} to Cloudinary...`);

      const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/${resourceType}/upload`;

      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error?.message || response.statusText;
        console.error("Cloudinary error response:", errorData);
        throw new Error(`Upload failed: ${errorMsg}`);
      }

      const data = await response.json();

      console.log("✅ Cloudinary upload successful:", {
        secure_url: data.secure_url,
        public_id: data.public_id,
        resource_type: data.resource_type,
      });

      // Return full data so your code can access secure_url easily
      return {
        secure_url: data.secure_url,     // ← This is what your backend needs
        public_id: data.public_id,
        format: data.format,
        resource_type: data.resource_type,
        original_filename: data.original_filename,
        ...data,                         // include everything else if needed
      };

    } catch (error) {
      console.error("❌ Cloudinary upload error:", error.message);
      throw new Error(`Failed to upload to Cloudinary: ${error.message}`);
    }
  }

  // Optional: delete method (recommended to move to backend for security)
  async deleteFile(publicId) {
    console.warn("Delete should be done from backend with signature for security.");
    throw new Error("Client-side delete not supported.");
  }
}

const cloudinaryService = new CloudinaryService();
export default cloudinaryService;