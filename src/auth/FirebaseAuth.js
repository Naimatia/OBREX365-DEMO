import { 
  auth, 
  db, 
  storage, 
  functions, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updatePassword,
  signOut,
  signInWithPopup,
  sendPasswordResetEmail
} from '../configs/FirebaseConfig';

// Get current user reference
const currentUser = auth.currentUser;

export {
  db,
  auth,
  storage,
  functions,
  currentUser,
  signInWithEmailAndPassword,
  updatePassword,
  signOut,
  signInWithPopup,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail
};