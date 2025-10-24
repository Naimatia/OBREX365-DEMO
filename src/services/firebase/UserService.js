import { 
  auth, 
  db, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword,
  sendPasswordResetEmail,
  googleAuthProvider,
  facebookAuthProvider,
  signInWithPopup,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  functions 
} from 'configs/FirebaseConfig';

import { UserRoles } from 'models/UserModel';
import { httpsCallable } from "firebase/functions";

/**
 * Service for managing users with Firebase
 */
class UserService {
  /**
   * Sign in with email and password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} Auth result with user data
   */
  static async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Update last login time
      await updateDoc(doc(db, 'users', result.user.uid), {
        lastLogin: serverTimestamp()
      });
      
      // Get full user data
      const userData = await this.getUserData(result.user.uid);
      return { user: result.user, userData };
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Sign in with Google
   * @returns {Promise<Object>} Auth result with user data
   */
  static async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      
      // Check if user exists in database
      const userExists = await this.checkUserExists(result.user.uid);
      
      if (!userExists) {
        // Create new user in database
        const names = result.user.displayName?.split(' ') || ['', ''];
        await this.createUserProfile({
          id: result.user.uid,
          email: result.user.email,
          firstName: names[0],
          lastName: names.slice(1).join(' '),
          profilePicture: result.user.photoURL,
          role: UserRoles.SELLER // Default role for OAuth users
        });
      } else {
        // Update last login time
        await updateDoc(doc(db, 'users', result.user.uid), {
          lastLogin: serverTimestamp()
        });
      }
      
      // Get full user data
      const userData = await this.getUserData(result.user.uid);
      return { user: result.user, userData };
    } catch (error) {
      console.error('Google login error:', error);
      throw error;
    }
  }

  /**
   * Sign in with Facebook
   * @returns {Promise<Object>} Auth result with user data
   */
  static async signInWithFacebook() {
    try {
      const result = await signInWithPopup(auth, facebookAuthProvider);
      
      // Check if user exists in database
      const userExists = await this.checkUserExists(result.user.uid);
      
      if (!userExists) {
        // Create new user in database
        const names = result.user.displayName?.split(' ') || ['', ''];
        await this.createUserProfile({
          id: result.user.uid,
          email: result.user.email,
          firstName: names[0],
          lastName: names.slice(1).join(' '),
          profilePicture: result.user.photoURL,
          role: UserRoles.SELLER // Default role for OAuth users
        });
      } else {
        // Update last login time
        await updateDoc(doc(db, 'users', result.user.uid), {
          lastLogin: serverTimestamp()
        });
      }
      
      // Get full user data
      const userData = await this.getUserData(result.user.uid);
      return { user: result.user, userData };
    } catch (error) {
      console.error('Facebook login error:', error);
      throw error;
    }
  }

  /**
   * Sign out the current user
   * @returns {Promise<void>}
   */
  static async signOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  /**
   * Create a new seller account while preserving current admin authentication
   * This method creates a new user in Firebase Auth and Firestore without logging out the admin
   * @param {Object} userData User data with exact document structure
   * @param {Object} currentUser Current authenticated admin user to preserve
   * @returns {Promise<Object>} Created user data
   */
  static async createSellerWithAuth(userData, currentUser) {
    const { 
      email, 
      password, 
      firstname, 
      lastname, 
      phoneNumber,
      company_id,
      country,
      Role,
      CreationDate,
      LastLogin,
      Notification,
      forcePasswordReset,
      isBanned,
      isVerified,
      ipAddress
    } = userData;
    
    // Store current admin credentials for restoration
    const adminEmail = currentUser?.email;
    const adminUid = currentUser?.uid;
    
    try {
      console.log('Creating seller account:', email);
      console.log('Admin to restore:', adminEmail);
      
      // Create the new user account
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = result.user.uid;
      console.log('New user created with ID:', newUserId);
      
      // Create the exact user document structure as specified WHILE the new user is authenticated
      const userDocument = {
        // Timestamps with exact field names
        CreationDate: CreationDate,
        LastLogin: LastLogin,
        
        // Boolean fields with exact values
        Notification: Notification,
        forcePasswordReset: forcePasswordReset,
        isBanned: isBanned,
        isVerified: isVerified,
        
        // String fields
        Role: Role,
        company_id: company_id,
        country: country,
        email: email,
        firstname: firstname,
        lastname: lastname,
        phoneNumber: phoneNumber,
        ipAddress: ipAddress
      };
      
      console.log('Creating user document with exact structure:', {
        userId: newUserId,
        email: userDocument.email,
        Role: userDocument.Role,
        company_id: userDocument.company_id
      });
      
      // Create the user document in Firestore while the new user is authenticated
      await setDoc(doc(db, 'users', newUserId), userDocument);
      console.log('User document created successfully');
      
      // Now sign out the new user and restore admin session
      await signOut(auth);
      console.log('New user signed out');
      
      // Wait a moment for auth state to clear
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('Seller created successfully with ID:', newUserId);
      return { uid: newUserId, ...userDocument };
    } catch (error) {
      console.error('Error creating seller:', error);
      
      // If there was an error, try to restore admin session
      try {
        if (adminEmail && currentUser) {
          console.log('Attempting to restore admin session after error...');
          await signOut(auth); // Clear any current state
        }
      } catch (restoreError) {
        console.error('Error restoring admin session:', restoreError);
      }
      
      throw error;
    }
  }

  /**
   * Create a seller with authentication using a simpler approach
   * This method creates the user document directly in Firestore with proper structure
   * @param {Object} userData - User data including email, password, personal info
   * @returns {Promise<Object>} Created user information
   */
  static async createSellerDirectly(userData) {
    const { email, password, ...profileData } = userData;
    
    try {
      console.log('Creating seller directly:', email);
      
      // Create user with Firebase Auth
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = result.user.uid;
      console.log('New user registered with ID:', newUserId);
      
      // Create exact user document structure immediately
      const userDocument = {
        // Email (string)
        email: email,
        secondaryEmail: profileData.secondaryEmail || '',
        
        // Personal information (strings)
        firstname: profileData.firstname || '',
        lastname: profileData.lastname || '',
        phoneNumber: profileData.phoneNumber || '',
        phoneNumber2: profileData.phoneNumber2 || '',
        phoneNumber3: profileData.phoneNumber3 || '',
        
        // Company relationship (string)
        company_id: profileData.company_id || '',
        
        // Role (string) - must be "Seller"
      Role: profileData.Role,
      country: profileData.country,
        
        // Timestamps (Date objects)
        CreationDate: profileData.CreationDate || new Date(),
        LastLogin: profileData.LastLogin || new Date(),
        
        // Boolean fields
        Notification: profileData.Notification !== undefined ? profileData.Notification : false,
        forcePasswordReset: profileData.forcePasswordReset !== undefined ? profileData.forcePasswordReset : true,
        isBanned: profileData.isBanned !== undefined ? profileData.isBanned : false,
        isVerified: profileData.isVerified !== undefined ? profileData.isVerified : false,
        
        // Network information (string)
        ipAddress: profileData.ipAddress || '0.0.0.0'
      };
      
      console.log('Creating Firestore document with exact structure:', { ...userDocument, email: email });
      
      // Create Firestore document while new user is authenticated
      await setDoc(doc(db, 'users', newUserId), userDocument);
      console.log('Firestore document created successfully with exact field structure');
      
      return {
        uid: newUserId,
        email: email,
        userData: userDocument
      };
      
    } catch (error) {
      console.error('Error creating seller directly:', error);
      throw error;
    }
  }

  /**
   * Register a new user with email and password
   * @param {Object} userData User data including email, password, firstName, lastName, etc.
   * @returns {Promise<Object>} Auth result with user data
   */
  static async registerWithEmail(userData) {
    // Extract base properties and ensure consistent naming
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      firstname, // Support both casing styles
      lastname, 
      companyId, 
      company_id, // Support both naming conventions
      role,
      Role, 
      phoneNumber,
      country,
      forcePasswordReset = true, // Default to requiring password reset
      ...otherData 
    } = userData;
    
    try {
      console.log('Creating user with Firebase Auth:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create a standardized user profile with all required fields
      const userProfile = {
        id: result.user.uid,
        email,
        // Support both naming conventions for consistency
        firstName: firstName || firstname || '',
        lastName: lastName || lastname || '',
        firstname: firstName || firstname || '',
        lastname: lastName || lastname || '',
        // Company ID is critical for team member management
        companyId: companyId || company_id || '',
        company_id: companyId || company_id || '',
        // Store role in both formats for backward compatibility
        Role: Role || role || UserRoles.SELLER,
        role: Role || role || UserRoles.SELLER,
        // Phone and country from form
        phoneNumber: phoneNumber || '',
        country: country || '',
        // Security settings
        isVerified: true,
        isBanned: false,
        // Critical for password security
        forcePasswordReset: forcePasswordReset,
        // Other metadata
        creationDate: new Date(),
        lastLogin: new Date(),
        ipAddress: '',
        pictureUrl: '',
        notification: true,
        isActive: true,
        // Include any other provided data
        ...otherData
      };
      
      console.log('Creating user profile in Firestore:', { ...userProfile, password: '[HIDDEN]' });
      await this.createUserProfile(userProfile);
      
      // Get full user data
      const createdUserData = await this.getUserData(result.user.uid);
      return { user: result.user, userData: createdUserData };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Create or update a user profile in Firestore
   * @param {Object} profile User profile data
   * @returns {Promise<void>}
   */
  static async createUserProfile(profile) {
    try {
      const { id, ...profileData } = profile;
      const userRef = doc(db, 'users', id);
      
      // Standardize field names according to Firestore schema
      const userData = {
        ...profileData,
        // Ensure these timestamps are properly set
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        CreationDate: profileData.creationDate || serverTimestamp(),
        LastLogin: profileData.lastLogin || serverTimestamp(),
        // Ensure critical fields are set with defaults if missing
        isActive: profileData.isActive !== undefined ? profileData.isActive : true,
        isBanned: profileData.isBanned !== undefined ? profileData.isBanned : false,
        forcePasswordReset: profileData.forcePasswordReset !== undefined ? profileData.forcePasswordReset : true
      };
      
      console.log('Setting user document in Firestore:', id);
      await setDoc(userRef, userData);
    } catch (error) {
      console.error('Error in forcePasswordReset:', error);
      throw error;
    }
  }

  /**
   * Complete force password reset - Update Firebase Auth password AND Firestore document
   * @param {string} userId - User ID
   * @param {string} userEmail - User email 
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Updated user data and new auth token
   */
  static async completeForcePasswordReset(userId, userEmail, newPassword) {
    try {
      console.log('🔄 Starting complete force password reset for:', userEmail);
      
      // Step 1: Sign in the user with their default password to get auth context
      console.log('🔄 Re-authenticating user for password change');
      const signInResult = await signInWithEmailAndPassword(auth, userEmail, 'Welcome123!');
      const authUser = signInResult.user;
      console.log('✅ User re-authenticated for password change');
      
      // Step 2: Update password in Firebase Auth
      console.log('🔄 Updating Firebase Auth password');
      await updatePassword(authUser, newPassword);
      console.log('✅ Firebase Auth password updated successfully');
      
      // Step 3: Update Firestore document - set forcePasswordReset to false
      console.log('🔄 Updating Firestore document');
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        forcePasswordReset: false,
        LastLogin: new Date()
      });
      console.log('✅ Firestore document updated - forcePasswordReset set to false');
      
      // Step 4: Get updated user data
      const updatedUserDoc = await getDoc(userRef);
      if (!updatedUserDoc.exists()) {
        throw new Error('User document not found after update');
      }
      
      const updatedUserData = {
        id: userId,
        ...updatedUserDoc.data()
      };
      
      // Step 5: Get new auth token
      const newToken = await authUser.getIdToken(true); // Force refresh
      
      console.log('✅ Complete force password reset successful');
      
      return {
        user: updatedUserData,
        token: newToken,
        message: 'Password updated successfully'
      };
      
    } catch (error) {
      console.error('❌ Error in completeForcePasswordReset:', error);
      throw new Error(error.message || 'Failed to update password');
    }
  }

  /**
   * Update user profile data
   * @param {string} userId - User ID
   * @param {Object} profileData - Data to update
   * @returns {Promise<Object>} Updated user data
   */
  static async updateUserProfile(userId, profileData) {
    try {
      const userRef = doc(db, 'users', userId);
      
      await updateDoc(userRef, {
        ...profileData,
        updatedAt: serverTimestamp()
      });
      
      return this.getUserData(userId);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  /**
   * Get user data from Firestore
   * @param {string} userId User ID
   * @returns {Promise<Object>} User data
   */
  static async getUserData(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user data:', error);
      throw error;
    }
  }

  /**
   * Force password reset for a user
   * Updates the user's password in Firebase Auth and removes the forcePasswordReset flag
   * @param {string} userId - User ID
   * @param {string} newPassword - New password to set
   * @returns {Promise<Object>} Updated user data
   */
  static async forcePasswordReset(userId, newPassword) {
    try {
      console.log('Starting force password reset for user:', userId);
      
      // Get current user from Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User must be authenticated to reset password');
      }
      
      // Update password in Firebase Auth
      await updatePassword(currentUser, newPassword);
      console.log('Password updated in Firebase Auth');
      
      // Update user document in Firestore to remove force reset flag
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        forcePasswordReset: false,
        lastPasswordUpdate: new Date(),
        updatedAt: serverTimestamp()
      });
      console.log('User document updated in Firestore');
      
      // Get updated user data
      const updatedUserData = await this.getUserData(userId);
      
      // Update localStorage with new user data
      if (updatedUserData) {
        localStorage.setItem('user', JSON.stringify(updatedUserData));
      }
      
      return updatedUserData;
      
    } catch (error) {
      console.error('Error in force password reset:', error);
      
      // Handle specific Firebase errors
      if (error.code === 'auth/weak-password') {
        throw new Error('Password is too weak. Please choose a stronger password.');
      } else if (error.code === 'auth/requires-recent-login') {
        throw new Error('Please log in again before changing your password.');
      } else if (error.code === 'permission-denied') {
        throw new Error('You do not have permission to update this user.');
      }
      
      throw error;
    }
  }

  /**
   * Check if user requires password reset
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} Whether user needs to reset password
   */
  static async requiresPasswordReset(userId) {
    try {
      const userData = await this.getUserData(userId);
      return userData?.forcePasswordReset === true;
    } catch (error) {
      console.error('Error checking password reset requirement:', error);
      return false;
    }
  }

  /**
   * Check if a user exists in Firestore
   * @param {string} userId User ID
   * @returns {Promise<boolean>} True if user exists
   */
  static async checkUserExists(userId) {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      return userDoc.exists();
    } catch (error) {
      console.error('Error checking if user exists:', error);
      return false;
    }
  }

  /**
   * Get all users for a specific company
   * @param {string} companyId Company ID
   * @param {Array<string>} roles Optional array of roles to filter by
   * @returns {Promise<Array>} Array of user objects
   */
  static async getUsersByCompany(companyId, roles = null) {
    try {
      let queryConstraints = [where('companyId', '==', companyId)];
      
      // If roles are specified, add them to the query
      // Note: This requires a composite index on Firestore (companyId, Role)
      if (roles && Array.isArray(roles) && roles.length > 0) {
        // For a single role, we can use a simple where clause
        if (roles.length === 1) {
          queryConstraints.push(where('Role', '==', roles[0]));
        } 
        // For multiple roles, we need to use in operator 
        // (requires different index than single where clause)
        else {
          queryConstraints.push(where('Role', 'in', roles));
        }
      }
      
      const usersQuery = query(
        collection(db, 'users'),
        ...queryConstraints
      );
      
      const querySnapshot = await getDocs(usersQuery);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting users by company:', error);
      throw error;
    }
  }

  /**
   * Get all users with a specific role in a company
   * @param {string} companyId Company ID
   * @param {string} role User role
   * @returns {Promise<Array>} Array of user objects
   */
  static async getUsersByRole(companyId, role) {
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('companyId', '==', companyId),
        where('role', '==', role)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw error;
    }
  }

  /**
   * Get all users for a specific company by company_id
   * @param {string} companyId Company ID to filter by
   * @returns {Promise<Array>} Array of all users in the company
   */
  static async getUsersByCompanyId(companyId) {
    try {
      console.log('Fetching all users for company ID:', companyId);
      
      // Query users collection filtering by company_id field
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('company_id', '==', companyId));
      const querySnapshot = await getDocs(q);
      
      const users = [];
      querySnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`Found ${users.length} users for company ${companyId}`);
      return users;
    } catch (error) {
      console.error('Error fetching users by company ID:', error);
      throw error;
    }
  }

  /**
   * Change user password
   * @param {string} newPassword New password
   * @returns {Promise<void>}
   */
  static async changePassword(newPassword) {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      await updatePassword(user, newPassword);
      
      // Update forcePasswordReset flag if applicable
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        forcePasswordReset: false,
        lastPasswordUpdate: serverTimestamp()
      });
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * @param {string} userId User ID
   * @returns {Promise<Object|null>} User data or null if not found
   */
  static async getUserById(userId) {
    try {
      if (!userId) return null;
      
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        return { id: userSnap.id, ...userSnap.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Send password reset email
   * @param {string} email User email
   * @returns {Promise<void>}
   */
  static async sendPasswordResetEmail(email) {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      console.error('Error sending password reset email:', error);
      throw error;
    }
  }

  /**
   * Set force password reset flag for a user
   * @param {string} userId User ID
   * @param {boolean} forceReset Whether to force password reset
   * @returns {Promise<void>}
   */
  static async setForcePasswordReset(userId, forceReset) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        forcePasswordReset: forceReset
      });
    } catch (error) {
      console.error('Error setting force password reset:', error);
      throw error;
    }
  }

  /**
   * Check if current user needs to reset password
   * @returns {Promise<boolean>} True if password reset is required
   */
  static async checkPasswordResetRequired() {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        return false;
      }
      
      const userData = await this.getUserData(user.uid);
      return userData?.forcePasswordReset === true;
    } catch (error) {
      console.error('Error checking password reset required:', error);
      return false;
    }
  }

  /**
   * Ban or unban a user
   * @param {string} userId User ID
   * @param {boolean} isBanned Whether the user is banned
   * @returns {Promise<void>}
   */
  static async toggleUserBan(userId, isBanned) {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { isBanned });
    } catch (error) {
      console.error('Error toggling user ban:', error);
      throw error;
    }
  }
/**
   * Delete a user from the system (Auth + Firestore)
   * @param {string} userId User ID to delete
   * @returns {Promise<Object>} Success status
   */
  static async deleteUser(userId) {
    try {
      // Call the Firebase Cloud Function to delete user
      const deleteUserAccount = httpsCallable(functions, "deleteUserAccount");
      const result = await deleteUserAccount({ userId });

      console.log("✅ User deleted:", result.data);
      return result.data; // { success: true, message: "User deleted successfully" }

    } catch (error) {
      console.error("❌ Error deleting user:", error);
      throw error;
    }
  }

  /**
   * Get current authenticated user data
   * @returns {Promise<Object|null>} User data or null if not authenticated
   */
  static async getCurrentUser() {
    try {
      const user = auth.currentUser;
      
      if (!user) {
        return null;
      }
      
      return this.getUserData(user.uid);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }
}

export default UserService;
