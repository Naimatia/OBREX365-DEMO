// services/firebase/UserService.js

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
  serverTimestamp
} from 'configs/FirebaseConfig';

import { UserRoles } from 'models/UserModel';

/**
 * Service for managing users with Firebase
 * Includes full Joker/Owner account protection
 */
class UserService {
  // ─── JOKER ACCOUNT DETECTION ──────────────────────────────────────────────
  
  /**
   * Check if a user is the joker/owner account
   * @param {string|Object} userIdOrUserData - User ID or user data object
   * @returns {Promise<boolean>} True if the user is the joker account
   */
  static async isJokerAccount(userIdOrUserData) {
    try {
      let userData;
      
      if (typeof userIdOrUserData === 'string') {
        userData = await this.getUserData(userIdOrUserData);
        if (!userData) return false;
      } else {
        userData = userIdOrUserData;
      }
      
      // Check for joker account criteria
      return userData?.isJoker === true || 
             (userData?.isOwner === true && userData?.Role === UserRoles.CEO);
    } catch (error) {
      console.error('Error checking joker account:', error);
      return false;
    }
  }

  /**
   * Find if a joker account already exists in the system
   * @returns {Promise<Object|null>} Joker user data or null
   */
  static async findJokerAccount() {
    try {
      const usersRef = collection(db, 'users');
      
      // Try to find by isJoker flag first
      let q = query(usersRef, where('isJoker', '==', true));
      let querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      // Fallback: find by isOwner + Role CEO
      q = query(
        usersRef, 
        where('isOwner', '==', true),
        where('Role', '==', UserRoles.CEO)
      );
      querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding joker account:', error);
      return null;
    }
  }

  // ─── AUTHENTICATION ──────────────────────────────────────────────────────

  /**
   * Sign in with email and password - with joker detection
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<Object>} Auth result with user data
   */
  static async signInWithEmail(email, password) {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      
      // Check if user is banned
      const userData = await this.getUserData(result.user.uid);
      
      if (userData?.isBanned === true) {
        await signOut(auth);
        throw new Error('Your account has been banned. Please contact your administrator.');
      }
      
      // Check if this is the joker account
      const isJoker = await this.isJokerAccount(userData);
      
      // Update last login time
      await updateDoc(doc(db, 'users', result.user.uid), {
        lastLogin: serverTimestamp()
      });
      
      // Return user data with joker flag
      return { 
        user: result.user, 
        userData: { 
          ...userData, 
          isJoker: isJoker,
          isOwner: userData?.isOwner || false
        } 
      };
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
      
      const userExists = await this.checkUserExists(result.user.uid);
      
      if (!userExists) {
        const names = result.user.displayName?.split(' ') || ['', ''];
        await this.createUserProfile({
          id: result.user.uid,
          email: result.user.email,
          firstName: names[0],
          lastName: names.slice(1).join(' '),
          profilePicture: result.user.photoURL,
          role: UserRoles.SELLER
        });
      } else {
        await updateDoc(doc(db, 'users', result.user.uid), {
          lastLogin: serverTimestamp()
        });
      }
      
      const userData = await this.getUserData(result.user.uid);
      const isJoker = await this.isJokerAccount(userData);
      
      return { 
        user: result.user, 
        userData: { ...userData, isJoker } 
      };
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
      
      const userExists = await this.checkUserExists(result.user.uid);
      
      if (!userExists) {
        const names = result.user.displayName?.split(' ') || ['', ''];
        await this.createUserProfile({
          id: result.user.uid,
          email: result.user.email,
          firstName: names[0],
          lastName: names.slice(1).join(' '),
          profilePicture: result.user.photoURL,
          role: UserRoles.SELLER
        });
      } else {
        await updateDoc(doc(db, 'users', result.user.uid), {
          lastLogin: serverTimestamp()
        });
      }
      
      const userData = await this.getUserData(result.user.uid);
      const isJoker = await this.isJokerAccount(userData);
      
      return { 
        user: result.user, 
        userData: { ...userData, isJoker } 
      };
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
   * Get current authenticated user data with context
   * @returns {Promise<Object|null>} User data with permissions
   */
  static async getCurrentUserWithContext() {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      
      const userData = await this.getUserData(user.uid);
      if (!userData) return null;
      
      const isJoker = await this.isJokerAccount(userData);
      
      return {
        ...userData,
        id: user.uid,
        isJoker: isJoker,
        isOwner: userData?.isOwner || false,
        // Permission flags
        canManageUsers: isJoker || userData?.Role === UserRoles.HR || userData?.Role === UserRoles.CEO,
        canCreateUsers: isJoker || userData?.Role === UserRoles.HR,
        canDeleteUsers: isJoker || userData?.Role === UserRoles.HR,
        canBanUsers: isJoker || userData?.Role === UserRoles.HR,
        canViewAllCompanies: isJoker,
        canSwitchCompanies: isJoker,
      };
    } catch (error) {
      console.error('Error getting current user with context:', error);
      return null;
    }
  }

  // ─── USER MANAGEMENT ────────────────────────────────────────────────────

  /**
   * Get all users for a specific company - Hides joker account
   * @param {string} companyId Company ID
   * @param {Object} options - Options
   * @param {boolean} options.includeJoker - Include joker account (default: false)
   * @param {Array<string>} options.roles - Filter by roles
   * @param {boolean} options.excludeBanned - Exclude banned users
   * @returns {Promise<Array>} Array of user objects
   */
  static async getUsersByCompanyId(companyId, options = {}) {
    const { 
      includeJoker = false, 
      roles = null, 
      excludeBanned = false 
    } = options;
    
    try {
      console.log('Fetching users for company ID:', companyId);
      
      let q = query(
        collection(db, 'users'),
        where('company_id', '==', companyId)
      );
      
      // Add role filter if specified
      if (roles && Array.isArray(roles) && roles.length > 0) {
        if (roles.length === 1) {
          q = query(q, where('Role', '==', roles[0]));
        } else {
          q = query(q, where('Role', 'in', roles));
        }
      }
      
      const querySnapshot = await getDocs(q);
      const users = [];
      
      // Get current user to check if they're the joker
      const currentUser = auth.currentUser;
      const currentUserData = currentUser ? await this.getUserData(currentUser.uid) : null;
      const isCurrentUserJoker = await this.isJokerAccount(currentUserData);
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const isJoker = data.isJoker === true || 
                       (data.isOwner === true && data.Role === UserRoles.CEO);
        
        // 🚫 Hide Joker from everyone except themselves
        if (isJoker) {
          // Only include if the current user is the joker and includeJoker is true
          if (isCurrentUserJoker && includeJoker && doc.id === currentUser?.uid) {
            users.push({
              id: doc.id,
              ...data
            });
          }
          // Otherwise skip - the joker is invisible
          return;
        }
        
        // Exclude banned users if requested
        if (excludeBanned && data.isBanned === true) {
          return;
        }
        
        // Normal user - include them
        users.push({
          id: doc.id,
          ...data
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
   * Get team members for a company (excludes joker account)
   * Use this for team management pages
   * @param {string} companyId - Company ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of team members
   */
  static async getTeamMembers(companyId, filters = {}) {
    return this.getUsersByCompanyId(companyId, {
      includeJoker: false,
      ...filters
    });
  }

  /**
   * Get users for admin view (joker can see themselves)
   * @param {string} companyId - Company ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of users including joker
   */
  static async getAdminUsers(companyId, filters = {}) {
    // Verify the current user is the joker account
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    const currentUserData = await this.getUserData(currentUser.uid);
    const isJoker = await this.isJokerAccount(currentUserData);
    
    if (!isJoker) {
      throw new Error('Unauthorized: Only the joker account can access admin users');
    }
    
    return this.getUsersByCompanyId(companyId, {
      includeJoker: true,
      ...filters
    });
  }

  /**
   * Get user by ID with visibility rules
   * @param {string} userId - User ID to fetch
   * @param {string} requestingUserId - User ID making the request
   * @returns {Promise<Object|null>} User data or null if not allowed
   */
  static async getUserWithVisibility(userId, requestingUserId) {
    try {
      // Get the user data
      const userData = await this.getUserData(userId);
      if (!userData) return null;
      
      // Check if the requested user is the joker account
      const isJoker = await this.isJokerAccount(userId);
      
      // Get the requesting user's data
      const requestingUserData = await this.getUserData(requestingUserId);
      const isRequestingJoker = await this.isJokerAccount(requestingUserData);
      
      // If the requested user is the joker account, only the joker can see it
      if (isJoker && !isRequestingJoker) {
        console.warn(`User ${requestingUserId} attempted to access joker account ${userId}`);
        return null;
      }
      
      return { id: userId, ...userData };
    } catch (error) {
      console.error('Error getting user with visibility:', error);
      return null;
    }
  }

  /**
   * Get user data from Firestore
   * @param {string} userId User ID
   * @returns {Promise<Object>} User data
   */
  static async getUserData(userId) {
    try {
      if (!userId) return null;
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
   * Create or update a user profile in Firestore
   * @param {Object} profile User profile data
   * @returns {Promise<void>}
   */
  static async createUserProfile(profile) {
    try {
      const { id, ...profileData } = profile;
      const userRef = doc(db, 'users', id);
      
      // Check if this is the joker account being created
      const isJoker = profileData.isJoker === true || 
                     (profileData.isOwner === true && profileData.Role === UserRoles.CEO);
      
      // Prevent creating another joker account
      if (isJoker && profileData.Role === UserRoles.CEO) {
        const existingJoker = await this.findJokerAccount();
        if (existingJoker && existingJoker.id !== id) {
          throw new Error('A master account already exists. Cannot create another.');
        }
      }
      
      // Standardize field names according to Firestore schema
      const userData = {
        ...profileData,
        // Add isJoker flag if it's the owner
        isJoker: isJoker,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        CreationDate: profileData.creationDate || serverTimestamp(),
        LastLogin: profileData.lastLogin || serverTimestamp(),
        isActive: profileData.isActive !== undefined ? profileData.isActive : true,
        isBanned: profileData.isBanned !== undefined ? profileData.isBanned : false,
        forcePasswordReset: profileData.forcePasswordReset !== undefined ? profileData.forcePasswordReset : true
      };
      
      console.log('Setting user document in Firestore:', id);
      await setDoc(userRef, userData);
      return userData;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }

  /**
   * Update user profile data - With joker protection
   * @param {string} userId - User ID
   * @param {Object} profileData - Data to update
   * @returns {Promise<Object>} Updated user data
   */
  static async updateUserProfile(userId, profileData) {
    try {
      // Check if trying to update the joker
      const isJoker = await this.isJokerAccount(userId);
      const currentUser = auth.currentUser;
      
      if (isJoker && currentUser?.uid !== userId) {
        throw new Error('Cannot update the master account');
      }
      
      // If updating the joker, prevent changing critical fields
      if (isJoker && currentUser?.uid === userId) {
        const disallowedFields = ['isJoker', 'isOwner', 'Role', 'company_id', 'accountType'];
        const attemptedChanges = Object.keys(profileData).filter(field => 
          disallowedFields.includes(field)
        );
        
        if (attemptedChanges.length > 0) {
          throw new Error(`Cannot update ${attemptedChanges.join(', ')} for master account`);
        }
      }

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
   * Change user company_id - Only joker can do this
   * @param {string} targetUserId - User ID to update
   * @param {string} newCompanyId - New company ID
   * @returns {Promise<Object>} Result
   */
  static async changeUserCompanyId(targetUserId, newCompanyId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('You must be logged in.');

      // Get current user data to check if they're the joker
      const currentUserData = await this.getUserData(currentUser.uid);
      const isCurrentJoker = await this.isJokerAccount(currentUserData);
      
      // Only the joker can change company_id
      if (!isCurrentJoker) {
        throw new Error('Only the master account can change company_id.');
      }

      const userRef = doc(db, 'users', targetUserId);
      
      await updateDoc(userRef, {
        company_id: newCompanyId,
        companyId: newCompanyId, // Keep both for compatibility
        updatedAt: serverTimestamp()
      });

      console.log(`company_id updated to ${newCompanyId} for user ${targetUserId}`);
      return { success: true, message: 'Company updated successfully' };
    } catch (error) {
      console.error('Failed to update company_id:', error);
      throw error;
    }
  }

  // ─── USER CREATION ──────────────────────────────────────────────────────

  /**
   * Create a seller through the secure serverless API
   * @param {Object} userData - User data including email, password, personal info
   * @returns {Promise<Object>} Created user information
   */
  static async createSellerDirectly(userData) {
    try {
      console.log('Creating seller via API:', userData.email);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user. Please sign in first.');
      }

      // Prevent creating another joker account
      if (userData.isJoker === true || (userData.isOwner === true && userData.Role === UserRoles.CEO)) {
        const existingJoker = await this.findJokerAccount();
        if (existingJoker) {
          throw new Error('A master account already exists. Cannot create another.');
        }
      }

      const idToken = await currentUser.getIdToken(true);

      const response = await fetch('https://delete-user-demo.vercel.app/api/createAuthUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error creating seller:', errorData);
        throw new Error(errorData.error || `Failed to create seller: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Seller created successfully via API:', result);

      return result;

    } catch (error) {
      console.error('Error creating seller via API:', error);
      throw error;
    }
  }

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
      ipAddress,
      isJoker,
      isOwner
    } = userData;
    
    // Prevent creating another joker account
    if (isJoker === true || (isOwner === true && Role === UserRoles.CEO)) {
      const existingJoker = await this.findJokerAccount();
      if (existingJoker) {
        throw new Error('A master account already exists. Cannot create another.');
      }
    }
    
    // Store current admin credentials for restoration
    const adminEmail = currentUser?.email;
    const adminUid = currentUser?.uid;
    const adminPassword = userData.adminPassword;
    
    if (!adminEmail || !adminPassword) {
      throw new Error('Admin credentials required to restore session');
    }
    
    try {
      console.log('Creating user account:', email);
      
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const newUserId = result.user.uid;
      
      const userDocument = {
        CreationDate: CreationDate || serverTimestamp(),
        LastLogin: LastLogin || serverTimestamp(),
        Notification: Notification !== undefined ? Notification : false,
        forcePasswordReset: forcePasswordReset !== undefined ? forcePasswordReset : true,
        isBanned: isBanned !== undefined ? isBanned : false,
        isVerified: isVerified !== undefined ? isVerified : false,
        Role: Role || UserRoles.SELLER,
        company_id: company_id || '',
        country: country || '',
        email: email,
        firstname: firstname || '',
        lastname: lastname || '',
        phoneNumber: phoneNumber || '',
        ipAddress: ipAddress || '',
        // Joker flags
        isJoker: isJoker || false,
        isOwner: isOwner || false,
      };
      
      await setDoc(doc(db, 'users', newUserId), userDocument);
      
      // Sign out the new user
      await signOut(auth);
      
      // Restore admin session
      const adminResult = await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
      
      if (adminResult.user.uid !== adminUid) {
        throw new Error('Failed to restore correct admin session');
      }
      
      return { uid: newUserId, ...userDocument };
    } catch (error) {
      console.error('Error creating user:', error);
      
      try {
        await signOut(auth);
        if (adminEmail && adminPassword) {
          await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
        }
      } catch (restoreError) {
        console.error('Error restoring admin session:', restoreError);
      }
      
      throw error;
    }
  }

  /**
   * Register a new user with email and password
   * @param {Object} userData User data including email, password, firstName, lastName, etc.
   * @returns {Promise<Object>} Auth result with user data
   */
  static async registerWithEmail(userData) {
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      firstname,
      lastname, 
      companyId, 
      company_id,
      role,
      Role, 
      phoneNumber,
      country,
      forcePasswordReset = true,
      isJoker = false,
      isOwner = false,
      ...otherData 
    } = userData;
    
    try {
      // Prevent creating another joker account
      if (isJoker || (isOwner && Role === UserRoles.CEO)) {
        const existingJoker = await this.findJokerAccount();
        if (existingJoker) {
          throw new Error('A master account already exists. Cannot create another.');
        }
      }
      
      console.log('Creating user with Firebase Auth:', email);
      const result = await createUserWithEmailAndPassword(auth, email, password);
      
      const userProfile = {
        id: result.user.uid,
        email,
        firstName: firstName || firstname || '',
        lastName: lastName || lastname || '',
        firstname: firstName || firstname || '',
        lastname: lastName || lastname || '',
        companyId: companyId || company_id || '',
        company_id: companyId || company_id || '',
        Role: Role || role || UserRoles.SELLER,
        role: Role || role || UserRoles.SELLER,
        phoneNumber: phoneNumber || '',
        country: country || '',
        isVerified: true,
        isBanned: false,
        forcePasswordReset: forcePasswordReset,
        creationDate: new Date(),
        lastLogin: new Date(),
        ipAddress: '',
        pictureUrl: '',
        notification: true,
        isActive: true,
        isJoker: isJoker,
        isOwner: isOwner,
        ...otherData
      };
      
      await this.createUserProfile(userProfile);
      
      const createdUserData = await this.getUserData(result.user.uid);
      const isJokerAccount = await this.isJokerAccount(createdUserData);
      
      return { 
        user: result.user, 
        userData: { ...createdUserData, isJoker: isJokerAccount } 
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  // ─── USER ACTIONS WITH JOKER PROTECTION ──────────────────────────────

  /**
   * Ban or unban a user - Protects joker account
   * @param {string} userId - User ID
   * @param {boolean} isBanned - Whether the user is banned
   * @returns {Promise<Object>} Result of the operation
   */
  static async toggleUserBan(userId, isBanned) {
    try {
      // Check if trying to ban the joker
      const isJoker = await this.isJokerAccount(userId);
      if (isJoker) {
        throw new Error('Cannot ban the master account');
      }

      console.log(`🔄 ${isBanned ? 'Banning' : 'Unbanning'} user:`, userId);
      
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user. Please sign in first.');
      }

      // Get current user data to check permissions
      const currentUserData = await this.getUserData(currentUser.uid);
      const isCurrentJoker = await this.isJokerAccount(currentUserData);
      
      // Only joker or HR can ban users
      if (!isCurrentJoker && currentUserData?.Role !== UserRoles.HR) {
        throw new Error('Unauthorized: Only joker or HR can ban users');
      }

      const idToken = await currentUser.getIdToken(true);
      
      const apiUrl = 'https://delete-user-demo.vercel.app/api/toggleUserBan';
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          userId: userId,
          isBanned: isBanned,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${isBanned ? 'ban' : 'unban'} user`);
      }

      const result = await response.json();
      console.log(`✅ User ${isBanned ? 'banned' : 'unbanned'} successfully:`, result);
      
      // Update local Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        isBanned: isBanned,
        [isBanned ? 'bannedAt' : 'unbannedAt']: new Date(),
      });
      
      return result;
    } catch (error) {
      console.error('Error toggling user ban:', error);
      throw error;
    }
  }

  /**
   * Delete user - Protects joker account
   * @param {string} userId - User ID to delete
   * @returns {Promise<Object>} Result
   */
  static async deleteUser(userId) {
    try {
      // Check if trying to delete the joker
      const isJoker = await this.isJokerAccount(userId);
      if (isJoker) {
        throw new Error('Cannot delete the master account');
      }

      console.log('Deleting user with ID:', userId);

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user. Please sign in as a CEO.');
      }

      // Check permissions
      const currentUserData = await this.getUserData(currentUser.uid);
      const isCurrentJoker = await this.isJokerAccount(currentUserData);
      
      if (!isCurrentJoker && currentUserData?.Role !== UserRoles.HR) {
        throw new Error('Unauthorized: Only joker or HR can delete users');
      }

      if (currentUser.uid === userId) {
        throw new Error('You cannot delete your own account.');
      }

      const idToken = await currentUser.getIdToken(true);

      const response = await fetch('https://delete-user-demo.vercel.app/api/deleteAuthUser', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete user: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('User deleted successfully:', result);

      return { success: true, message: result.message };
    } catch (error) {
      console.error('Error deleting user:', error);
      if (error.message.includes('Unauthorized')) {
        throw new Error('Unauthorized: Please sign in as a CEO.');
      } else if (error.message.includes('Permission denied')) {
        throw new Error('Permission denied: Only CEOs can delete users.');
      } else if (error.message.includes('User ID is required')) {
        throw new Error('User ID is required.');
      } else if (error.message.includes('User not found')) {
        throw new Error('User not found in the system.');
      } else if (error.message.includes('Cannot delete your own account')) {
        throw new Error('You cannot delete your own account.');
      }
      throw error;
    }
  }

  /**
   * Force password reset for a user
   * @param {string} userId - User ID
   * @param {string} newPassword - New password to set
   * @returns {Promise<Object>} Updated user data
   */
  static async forcePasswordReset(userId, newPassword) {
    try {
      console.log('Starting force password reset for user:', userId);
      
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('User must be authenticated to reset password');
      }
      
      // Check if this is the joker - allow password reset for joker too
      const isJoker = await this.isJokerAccount(userId);
      if (isJoker) {
        console.log('Joker account password reset requested');
      }
      
      await updatePassword(currentUser, newPassword);
      console.log('Password updated in Firebase Auth');
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        forcePasswordReset: false,
        lastPasswordUpdate: new Date(),
        updatedAt: serverTimestamp()
      });
      console.log('User document updated in Firestore');
      
      const updatedUserData = await this.getUserData(userId);
      
      if (updatedUserData) {
        localStorage.setItem('user', JSON.stringify(updatedUserData));
      }
      
      return updatedUserData;
      
    } catch (error) {
      console.error('Error in force password reset:', error);
      
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
   * Complete force password reset - Update Firebase Auth password AND Firestore document
   * @param {string} userId - User ID
   * @param {string} userEmail - User email 
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Updated user data and new auth token
   */
  static async completeForcePasswordReset(userId, userEmail, newPassword) {
    try {
      console.log('🔄 Starting complete force password reset for:', userEmail);
      
      const signInResult = await signInWithEmailAndPassword(auth, userEmail, 'Welcome123!');
      const authUser = signInResult.user;
      console.log('✅ User re-authenticated for password change');
      
      await updatePassword(authUser, newPassword);
      console.log('✅ Firebase Auth password updated successfully');
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        forcePasswordReset: false,
        LastLogin: new Date()
      });
      console.log('✅ Firestore document updated - forcePasswordReset set to false');
      
      const updatedUserDoc = await getDoc(userRef);
      if (!updatedUserDoc.exists()) {
        throw new Error('User document not found after update');
      }
      
      const updatedUserData = {
        id: userId,
        ...updatedUserDoc.data()
      };
      
      const newToken = await authUser.getIdToken(true);
      
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
   * Change user password (for current user)
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

  // ─── UTILITY METHODS ────────────────────────────────────────────────────

  /**
   * Get current authenticated user data
   * @returns {Promise<Object|null>} User data or null if not authenticated
   */
  static async getCurrentUser() {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      return this.getUserData(user.uid);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
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
      if (!user) return false;
      
      const userData = await this.getUserData(user.uid);
      return userData?.forcePasswordReset === true;
    } catch (error) {
      console.error('Error checking password reset required:', error);
      return false;
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
      return this.getUserData(userId);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Get users by role in a company
   * @param {string} companyId Company ID
   * @param {string} role User role
   * @param {Object} options - Additional options
   * @returns {Promise<Array>} Array of user objects
   */
  static async getUsersByRole(companyId, role, options = {}) {
    try {
      return this.getUsersByCompanyId(companyId, {
        roles: [role],
        ...options
      });
    } catch (error) {
      console.error('Error getting users by role:', error);
      throw error;
    }
  }

  /**
   * Get all users by company (legacy method - kept for compatibility)
   * @param {string} companyId Company ID
   * @param {Array<string>} roles Optional array of roles to filter by
   * @returns {Promise<Array>} Array of user objects
   */
  static async getUsersByCompany(companyId, roles = null) {
    try {
      return this.getUsersByCompanyId(companyId, {
        roles: roles,
        includeJoker: false
      });
    } catch (error) {
      console.error('Error getting users by company:', error);
      throw error;
    }
  }

  // ─── JOKER ACCOUNT SETUP ──────────────────────────────────────────────

  /**
   * Setup or verify the joker account
   * This ensures the joker account has all necessary flags
   * @param {string} userId - User ID to setup as joker
   * @param {Object} jokerData - Additional data for the joker
   * @returns {Promise<Object>} Updated joker data
   */
  static async setupJokerAccount(userId, jokerData = {}) {
    try {
      const userRef = doc(db, 'users', userId);
      
      // Check if this user exists
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      // Check if another joker already exists
      const existingJoker = await this.findJokerAccount();
      if (existingJoker && existingJoker.id !== userId) {
        throw new Error('Another joker account already exists. Cannot setup this account as joker.');
      }
      
      // Update the user to be the joker
      const updateData = {
        isJoker: true,
        isOwner: true,
        Role: UserRoles.CEO,
        accountType: 'joker',
        ...jokerData,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(userRef, updateData);
      
      console.log(`User ${userId} has been setup as the joker account`);
      return this.getUserData(userId);
      
    } catch (error) {
      console.error('Error setting up joker account:', error);
      throw error;
    }
  }

  /**
   * Check if a user has access to view another user
   * @param {string} viewerId - ID of the viewer
   * @param {string} targetId - ID of the target user
   * @returns {Promise<boolean>} True if access is allowed
   */
  static async canViewUser(viewerId, targetId) {
    try {
      // If viewing yourself, always allowed
      if (viewerId === targetId) return true;
      
      // Check if target is joker
      const isTargetJoker = await this.isJokerAccount(targetId);
      
      // If target is joker, only the joker can view
      if (isTargetJoker) {
        const isViewerJoker = await this.isJokerAccount(viewerId);
        return isViewerJoker;
      }
      
      // Check if they're in the same company
      const viewerData = await this.getUserData(viewerId);
      const targetData = await this.getUserData(targetId);
      
      if (!viewerData || !targetData) return false;
      
      return viewerData.company_id === targetData.company_id;
    } catch (error) {
      console.error('Error checking user visibility:', error);
      return false;
    }
  }
}

export default UserService;