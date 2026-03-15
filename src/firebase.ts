import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
  const firebaseConfig = {
  apiKey: "AIzaSyB0zwdipadQGSQpp_rl4fu5EWffjxzBflQ",
  authDomain: "christiansongs-91df9.firebaseapp.com",
  projectId: "christiansongs-91df9",
  storageBucket: "christiansongs-91df9.firebasestorage.app",
  messagingSenderId: "1056611616509",
  appId: "1:1056611616509:web:984b313557acdcf6ca6094",
  measurementId: "G-742HR2FVQ2"
  };
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);