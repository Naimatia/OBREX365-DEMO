import { 
  auth,
  db,
  signInWithEmailAndPassword,
  signOut,
  signInWithPopup,
  createUserWithEmailAndPassword,
  currentUser,
  updatePassword
} from '../auth/FirebaseAuth';
import { googleAuthProvider, facebookAuthProvider } from '../configs/FirebaseConfig';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { convertToUserModel, UserRoles } from '../models/UserModel';

const FirebaseService = {}

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise} - Auth result
 */
FirebaseService.signInEmailRequest = async (email, password) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    if (result.user) {
      // Update user's last login timestamp
      const userDocRef = doc(db, 'users', result.user.uid);
      await updateDoc(userDocRef, {
        LastLogin: serverTimestamp()
      });
      
      // Get additional user data from Firestore
      const userData = await FirebaseService.getCurrentUserData();
      return { user: result.user, userData };
    }
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * Sign out the current user
 * @returns {Promise} - Sign out result
 */
FirebaseService.signOutRequest = async () => {
	try {
		return await signOut(auth);
	} catch (err) {
		return err;
	}
}

/**
 * Sign in with Google
 * @returns {Promise} - Auth result
 */
FirebaseService.signInGoogleRequest = async () => {
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    if (result.user) {
      // Check if user exists in Firestore
      const userExists = await FirebaseService.checkUserExists(result.user.uid);
      
      // If user doesn't exist, create a new user document
      if (!userExists) {
        await FirebaseService.createUserInFirestore({
          id: result.user.uid,
          email: result.user.email,
          firstname: result.user.displayName?.split(' ')[0] || '',
          lastname: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          pictureUrl: result.user.photoURL,
          isVerified: result.user.emailVerified,
          Role: UserRoles.SELLER,
          forcePasswordReset: false
        });
      } else {
        // Update last login
        const userDocRef = doc(db, 'users', result.user.uid);
        await updateDoc(userDocRef, {
          LastLogin: serverTimestamp()
        });
      }
      
      // Get user data from Firestore
      const userData = await FirebaseService.getCurrentUserData();
      return { user: result.user, userData };
    }
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * Sign in with Facebook
 * @returns {Promise} - Auth result
 */
FirebaseService.signInFacebookRequest = async () => {
  try {
    const result = await signInWithPopup(auth, facebookAuthProvider);
    if (result.user) {
      // Check if user exists in Firestore
      const userExists = await FirebaseService.checkUserExists(result.user.uid);
      
      // If user doesn't exist, create a new user document
      if (!userExists) {
        await FirebaseService.createUserInFirestore({
          id: result.user.uid,
          email: result.user.email,
          firstname: result.user.displayName?.split(' ')[0] || '',
          lastname: result.user.displayName?.split(' ').slice(1).join(' ') || '',
          pictureUrl: result.user.photoURL,
          isVerified: result.user.emailVerified,
          Role: UserRoles.SELLER,
          forcePasswordReset: false
        });
      } else {
        // Update last login
        const userDocRef = doc(db, 'users', result.user.uid);
        await updateDoc(userDocRef, {
          LastLogin: serverTimestamp()
        });
      }
      
      // Get user data from Firestore
      const userData = await FirebaseService.getCurrentUserData();
      return { user: result.user, userData };
    }
    return result;
  } catch (err) {
    return err;
  }
}

/**
 * Sign up with email and password
 * @param {Object} data - User data including email, password, firstname, lastname, etc.
 * @returns {Promise} - Auth result or error object with message
 */
FirebaseService.signUpEmailRequest = async (data) => {
  const { email, password, firstname, lastname, phoneNumber } = data;
  try {
    // Validate input data before sending to Firebase
    if (!email || !password) {
      return { message: 'Email and password are required' };
    }
    
    if (password.length < 6) {
      return { message: 'Password must be at least 6 characters long' };
    }

    // Attempt to create the user in Firebase Auth
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    if (result.user) {
      try {
        // Create user in Firestore
        await FirebaseService.createUserInFirestore({
          id: result.user.uid,
          email: result.user.email,
          firstname: firstname || '',
          lastname: lastname || '',
          phoneNumber: phoneNumber || '',
          isVerified: result.user.emailVerified,
          Role: UserRoles.CEO,  // Default to CEO role
          forcePasswordReset: true
        });
        
        // Get user data
        const userData = await FirebaseService.getCurrentUserData();
        return { user: result.user, userData };
      } catch (firestoreError) {
        console.error('Error creating user in Firestore:', firestoreError);
        // If Firestore creation fails, we should still return the Auth user
        return { user: result.user, userData: null, message: 'User created but profile data could not be saved.' };
      }
    }
    return result;
  } catch (err) {
    console.error('Firebase signup error:', err);
    // Handle specific Firebase Auth error codes
    let errorMessage = err.message;
    
    if (err.code === 'auth/email-already-in-use') {
      errorMessage = 'This email address is already being used by another account.';
    } else if (err.code === 'auth/invalid-email') {
      errorMessage = 'The email address is not valid.';
    } else if (err.code === 'auth/operation-not-allowed') {
      errorMessage = 'Email/password accounts are not enabled. Contact support.';
    } else if (err.code === 'auth/weak-password') {
      errorMessage = 'Password is too weak. Please use a stronger password.';
    }
    
    return { message: errorMessage, code: err.code };
  }
}

/**
 * Check if a user exists in Firestore
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - True if user exists
 */
FirebaseService.checkUserExists = async (userId) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    return docSnap.exists();
  } catch (error) {
    console.error('Error checking user:', error);
    return false;
  }
}

/**
 * Create a new user in Firestore
 * @param {Object} userData - User data
 * @returns {Promise} - Result
 */
FirebaseService.createUserInFirestore = async (userData) => {
  try {
    const { id, ...userDataWithoutId } = userData;
    const userRef = doc(db, 'users', id);
    
    // Get IP address
    let ipAddress = '';
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      ipAddress = data.ip;
    } catch (error) {
      console.error('Error fetching IP:', error);
    }
    
    return await setDoc(userRef, {
      ...userDataWithoutId,
      ipAddress,
      CreationDate: serverTimestamp(),
      LastLogin: serverTimestamp(),
      isBanned: false,
      Notification: false
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return error;
  }
}

/**
 * Get current user data from Firestore
 * @returns {Promise<Object>} - User data
 */
FirebaseService.getCurrentUserData = async () => {
  if (auth.currentUser) {
    try {
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        return { id: userDoc.id, ...userDoc.data() };
      }
      return null;
    } catch (error) {
      console.error("Error getting user data:", error);
      return null;
    }
  }
  return null;
}

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise} - Result
 */
FirebaseService.updatePassword = async (newPassword) => {
  const user = auth.currentUser;
  if (user) {
    try {
      await updatePassword(user, newPassword);
      return { success: true };
    } catch (error) {
      console.error("Error updating password:", error);
      throw error;
    }
  } else {
    throw new Error("No authenticated user found.");
  }
}

/**
 * Update user's forcePasswordReset flag in Firestore
 * @param {string} userId - User ID
 * @param {boolean} forceReset - Force password reset flag
 * @returns {Promise} - Result
 */
FirebaseService.updateUserForcePasswordReset = async (userId, forceReset) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, { 
      forcePasswordReset: forceReset,
      lastPasswordReset: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    console.error("Error updating forcePasswordReset flag:", error);
    throw error;
  }
}

/**
 * Check if current user needs to reset password
 * @returns {Promise<boolean>} - True if reset needed
 */
FirebaseService.checkPasswordResetRequired = async () => {
  try {
    const userData = await FirebaseService.getCurrentUserData();
    return userData?.forcePasswordReset || false;
  } catch (error) {
    console.error('Error checking password reset:', error);
    return false;
  }
}

/**
 * Reset user password
 * @param {string} newPassword - New password
 * @returns {Promise} - Result
 */
FirebaseService.resetPassword = async (newPassword) => {
  try {
    if (!auth.currentUser) throw new Error('No authenticated user');
    
    // Update password in Firebase Auth using the imported updatePassword function
    await updatePassword(auth.currentUser, newPassword);
    
    // Update forcePasswordReset flag in Firestore
    const userDocRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userDocRef, {
      forcePasswordReset: false
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error };
  }
}

export default FirebaseService