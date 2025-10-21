import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs,
  addDoc
} from 'firebase/firestore';
import { db, auth } from 'auth/FirebaseAuth';
import cloudinaryService from './CloudinaryService';
import { USER_DATA } from 'constants/AuthConstant';

/**
 * Service for managing company-related operations in Firestore
 */
class CompanyService {
  /**
   * Create a new company for a CEO user
   * 
   * @param {Object} formData - Company form data
   * @param {string} formData.name - Company name
   * @param {string} formData.description - Company description
   * @param {string} formData.field - Business field/industry
   * @param {string} formData.status - Company status (active, inactive, etc)
   * @param {string} formData.location - Company location
   * @param {string} formData.region - Company region
   * @param {string} formData.phoneNumber - Company phone number
   * @param {string} formData.emailAddress - Company email address
   * @param {string} formData.websiteUrl - Company website URL
   * @param {Object} formData.socialMediaLinks - Company social media links
   * @param {string} userId - User ID of the CEO creating the company
   * @param {File} logoFile - Company logo file (optional)
   * @returns {Promise<string>} - ID of the created company
   */
  async createCompany(formData, userId, logoFile = null) {
    try {
      // Check if a user is authenticated
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('You must be logged in to create a company.');
      }

      // Make sure we're using the authenticated user's ID
      const authenticatedUserId = currentUser.uid;
      if (userId !== authenticatedUserId) {
        console.warn(`User ID mismatch. Using authenticated user ID: ${authenticatedUserId}`);
        userId = authenticatedUserId;
      }
      
      // Upload logo if provided
      let logoUrl = '';
      if (logoFile) {
        try {
          logoUrl = await this.uploadCompanyLogo('temp-company-id', logoFile);
          console.log('Logo uploaded successfully:', logoUrl);
        } catch (logoError) {
          console.error('Logo upload failed but continuing with company creation:', logoError);
          // Continue without logo if upload fails
        }
      }
      
      // Prepare company data
      const companyData = {
        ...formData,
        createdBy: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        logo: logoUrl || ''
      };
      
      // Create the company document using addDoc instead of setDoc
      // addDoc auto-generates an ID and may have different permissions
      console.log('Creating company document with data:', companyData);
      const companiesRef = collection(db, 'companies');
      const companyDocRef = await addDoc(companiesRef, companyData);
      
      // Get the auto-generated ID
      const companyId = companyDocRef.id;
      console.log('Company created with ID:', companyId);
      
      // Update the company document with its own ID
      await updateDoc(companyDocRef, { id: companyId });
      
      // Now update the user's company_id field
      // Update user with company_id
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        company_id: companyId,
        updatedAt: serverTimestamp()
      });
      console.log(`User ${userId} updated with company_id: ${companyId}`);
      
      // Update user data in localStorage to keep it in sync without requiring logout/login
      try {
        // Get current user data from localStorage
        const userData = JSON.parse(localStorage.getItem(USER_DATA) || '{}');
        
        // Update the company_id field
        userData.company_id = companyId;
        
        // Save back to localStorage
        localStorage.setItem(USER_DATA, JSON.stringify(userData));
        console.log('User data in localStorage updated with new company_id');
      } catch (localStorageError) {
        console.warn('Error updating localStorage:', localStorageError);
      }
      
      return companyId;
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error(`Failed to create company: ${error.message}`);
    }
  }
  
  /**
   * Upload company logo to Cloudinary
   * 
   * @param {string} companyId - Company ID
   * @param {File} logoFile - Logo file to upload
   * @returns {Promise<string>} - URL of the uploaded logo
   */
  async uploadCompanyLogo(companyId, logoFile) {
    try {
      // Use Cloudinary service to upload the logo
      const uploadResult = await cloudinaryService.uploadFile(logoFile, {
        folder: `obrex365/companies/${companyId}`
      });
      
      return uploadResult.url;
    } catch (error) {
      console.error('Error uploading company logo:', error);
      throw error;
    }
  }
  
  /**
   * Get company by ID
   * 
   * @param {string} companyId - Company ID
   * @returns {Promise<Object|null>} - Company data or null if not found
   */
  async getCompanyById(companyId) {
    try {
      console.log(`Fetching company with ID: ${companyId}`);
      const companyRef = doc(db, 'companies', companyId);
      const companySnap = await getDoc(companyRef);
      
      if (companySnap.exists()) {
        console.log('Company found in Firestore');
        return { id: companySnap.id, ...companySnap.data() };
      } else {
        console.log('No company found with this ID');
        return null;
      }
    } catch (error) {
      console.error('Error getting company:', error);
      throw new Error(`Failed to get company: ${error.message}`);
    }
  }
  
  /**
   * Update company details
   * 
   * @param {string} companyId - Company ID
   * @param {Object} updates - Fields to update
   * @param {File} logoFile - New logo file (optional)
   * @returns {Promise<string>} - ID of the updated company
   */
  async updateCompany(companyId, updates, logoFile = null) {
    try {
      const companyRef = doc(db, 'companies', companyId);
      
      // Check if the company exists
      const companySnap = await getDoc(companyRef);
      if (!companySnap.exists()) {
        throw new Error('Company not found');
      }
      
      // Upload new logo if provided
      let logoUrl = updates.logo || companySnap.data().logo || '';
      if (logoFile) {
        try {
          logoUrl = await this.uploadCompanyLogo(companyId, logoFile);
          console.log('Updated logo uploaded successfully:', logoUrl);
          // Add logo URL to updates
          updates.logo = logoUrl;
        } catch (logoError) {
          console.error('Logo update failed but continuing with company update:', logoError);
          // Continue without updating logo if upload fails
        }
      }
      
      // Add update timestamp
      const updatedData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      // Update company document
      await updateDoc(companyRef, updatedData);
      console.log(`Company ${companyId} updated successfully`);
      
      // Update user data in localStorage if needed (to ensure UI stays in sync)
      try {
        const userData = JSON.parse(localStorage.getItem(USER_DATA) || '{}');
        if (userData && userData.company_id === companyId) {
          // We don't need to modify company_id, just ensure the UI refreshes with latest data
          // This timestamp helps React components detect the change
          userData._lastUpdated = new Date().getTime();
          localStorage.setItem(USER_DATA, JSON.stringify(userData));
          console.log('User data in localStorage refreshed');
        }
      } catch (localStorageError) {
        console.warn('Error updating localStorage:', localStorageError);
      }
      
      return companyId;
    } catch (error) {
      console.error('Error updating company:', error);
      throw new Error(`Failed to update company: ${error.message}`);
    }
  }
  
  /**
   * Update company logo using Cloudinary
   * 
   * @param {string} companyId - Company ID 
   * @param {File} logoFile - New logo file
   * @returns {Promise<string>} - New logo URL
   */
  async updateCompanyLogo(companyId, logoFile) {
    try {
      const logoUrl = await this.uploadCompanyLogo(companyId, logoFile);
      
      // Update the company document with the new logo URL
      const companyRef = doc(db, 'companies', companyId);
      await updateDoc(companyRef, { 
        logo: logoUrl,
        updatedAt: serverTimestamp()
      });
      
      return logoUrl;
    } catch (error) {
      console.error('Error updating company logo:', error);
      throw new Error(`Failed to update company logo: ${error.message}`);
    }
  }
}

const companyService = new CompanyService();
export default companyService;
