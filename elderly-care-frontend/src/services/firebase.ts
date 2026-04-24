// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBVYzoJLwbIH7lXx6Y50HNXzXDwLzI9vUs",
  authDomain: "eldery-care-9b442.firebaseapp.com",
  projectId: "eldery-care-9b442",
  storageBucket: "eldery-care-9b442.firebasestorage.app",
  messagingSenderId: "845029650127",
  appId: "1:845029650127:web:ca549fdce399b55dc051ba",
  measurementId: "G-TKY936YJPH"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const auth = getAuth(app);