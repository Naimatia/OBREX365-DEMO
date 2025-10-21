// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, setDoc, addDoc, getDoc, getDocs, updateDoc, deleteDoc, query, where, orderBy, limit, startAfter, serverTimestamp, onSnapshot, writeBatch } from "firebase/firestore";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, sendPasswordResetEmail, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup } from "firebase/auth";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFunctions, httpsCallable } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzcgOjn15M4qT4rjkFQy8tEmtyqfzMItA",
  authDomain: "obrex365.firebaseapp.com",
  projectId: "obrex365",
  storageBucket: "obrex365.firebasestorage.app",
  messagingSenderId: "741430924067",
  appId: "1:741430924067:web:9b44237ed80b5c84d33296"
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

