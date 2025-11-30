import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuration for your Firebase project
const firebaseConfig = {
  apiKey: "AIzaSyCecQcGVfGsi8cQ-241qNMFW0XVYPW7AUI",
  authDomain: "travellog-fd3ea.firebaseapp.com",
  projectId: "travellog-fd3ea",
  storageBucket: "travellog-fd3ea.firebasestorage.app",
  messagingSenderId: "625706133954",
  appId: "1:625706133954:web:f9eff7757568cd7a208e5b",
  measurementId: "G-ZRSPF6V6GG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);