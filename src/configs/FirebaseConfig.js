// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, serverTimestamp, onSnapshot, writeBatch } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, sendPasswordResetEmail, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDA_YiXxhf427isD117IOgVYUMORPptgCU",
  authDomain: "orbrex-demo.firebaseapp.com",
  projectId: "orbrex-demo",
  storageBucket: "orbrex-demo.firebasestorage.app",
  messagingSenderId: "533694845345",
  appId: "1:533694845345:web:f24951b7421fd2f72c3be0",
  measurementId: "G-299NPEWH88"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);
const functions = getFunctions(app);

// Authentication providers
const googleAuthProvider = new GoogleAuthProvider();
const facebookAuthProvider = new FacebookAuthProvider();

// Export all Firebase services and utilities
export { 
  app,
  db,
  auth,
  storage,
  functions,
  googleAuthProvider,
  facebookAuthProvider,
  // Firestore
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  onSnapshot,
  writeBatch,
  // Authentication
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updatePassword,
  sendPasswordResetEmail,
  signInWithPopup,
  // Storage
  storageRef,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  // Functions
  httpsCallable
};

export default firebaseConfig;

