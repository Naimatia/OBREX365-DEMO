import { 
  db, 
  auth, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'configs/FirebaseConfig';

import { convertToCompanyModel } from 'models/CompanyModel';

/**
 * Service for managing companies with Firebase
 */
class CompanyService {
  /**
   * Create a new company
   * @param {Object} companyData Company data
   * @returns {Promise<Object>} Created company
   */
  static async createCompany(companyData) {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Generate a new document reference
      const companyRef = doc(collection(db, 'companies'));
      const timestamp = serverTimestamp();
      
      // Prepare company data
      const newCompany = {
        ...companyData,
        ownerId: currentUser.uid,
        createdAt: timestamp,
        updatedAt: timestamp,
        active: true
      };
      
      // Save to Firestore
      await setDoc(companyRef, newCompany);
      
      // Update the owner's user profile with the company ID
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        companyId: companyRef.id,
        updatedAt: timestamp
      });
      
      return { id: companyRef.id, ...newCompany };
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  /**
   * Get a company by ID
   * @param {string} companyId Company ID
   * @returns {Promise<Object>} Company data
   */
  static async getCompanyById(companyId) {
    try {
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      
      if (companyDoc.exists()) {
        return convertToCompanyModel({
          id: companyDoc.id,
          ...companyDoc.data()
        });
      }
      
      return null;
    } catch (error) {
      console.error('Error getting company:', error);
      throw error;
    }
  }

  /**
   * Get company for the current user
   * @returns {Promise<Object>} Company data
   */
  static async getCurrentUserCompany() {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('No authenticated user');
      }
      
      // Get user data to find company ID
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (!userDoc.exists()) {
        return null;
      }
      
      const userData = userDoc.data();
      
      if (!userData.companyId) {
        return null;
      }
      
      return this.getCompanyById(userData.companyId);
    } catch (error) {
      console.error('Error getting current user company:', error);
      throw error;
    }
  }

  /**
   * Update a company
   * @param {string} companyId Company ID
   * @param {Object} companyData Company data to update
   * @returns {Promise<Object>} Updated company
   */
  static async updateCompany(companyId, companyData) {
    try {
      const companyRef = doc(db, 'companies', companyId);
      const timestamp = serverTimestamp();
      
      // Update company
      await updateDoc(companyRef, {
        ...companyData,
        updatedAt: timestamp
      });
      
      // Get updated company
      return this.getCompanyById(companyId);
    } catch (error) {
      console.error('Error updating company:', error);
      throw error;
    }
  }

  /**
   * Delete a company
   * @param {string} companyId Company ID
   * @returns {Promise<boolean>} Success flag
   */
  static async deleteCompany(companyId) {
    try {
      // This is a dangerous operation and should be handled carefully
      // Consider soft-delete instead of hard-delete
      
      // 1. Get all users associated with this company
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', companyId)
      );
      
      const userDocs = await getDocs(usersQuery);
      
      // 2. Update users to remove company association
      const userUpdatePromises = userDocs.docs.map(userDoc => {
        return updateDoc(doc(db, 'users', userDoc.id), {
          companyId: null,
          updatedAt: serverTimestamp()
        });
      });
      
      await Promise.all(userUpdatePromises);
      
      // 3. Delete the company
      await deleteDoc(doc(db, 'companies', companyId));
      
      return true;
    } catch (error) {
      console.error('Error deleting company:', error);
      throw error;
    }
  }

  /**
   * Add a user to a company
   * @param {string} companyId Company ID
   * @param {string} userId User ID
   * @param {string} role User role in the company
   * @returns {Promise<boolean>} Success flag
   */
  static async addUserToCompany(companyId, userId, role) {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        companyId,
        role,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error adding user to company:', error);
      throw error;
    }
  }

  /**
   * Remove a user from a company
   * @param {string} userId User ID
   * @returns {Promise<boolean>} Success flag
   */
  static async removeUserFromCompany(userId) {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        companyId: null,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error removing user from company:', error);
      throw error;
    }
  }

  /**
   * Check if company exists
   * @param {string} companyId Company ID
   * @returns {Promise<boolean>} True if company exists
   */
  static async companyExists(companyId) {
    try {
      const companyDoc = await getDoc(doc(db, 'companies', companyId));
      return companyDoc.exists();
    } catch (error) {
      console.error('Error checking company existence:', error);
      return false;
    }
  }
}

export default CompanyService;
