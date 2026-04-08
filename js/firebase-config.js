import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

// TODO: Replace the following with your app's Firebase project configuration
const firebaseConfig = {
  apiKey: "AIzaSyDf-vGCbNNKa6xayqCJXSJc_JDWR8atJ_4",
  authDomain: "districts-after-dark.firebaseapp.com",
  projectId: "districts-after-dark",
  storageBucket: "districts-after-dark.firebasestorage.app",
  messagingSenderId: "111193459737",
  appId: "1:111193459737:web:8531d3c7405e374af96e88",
  measurementId: "G-J97Y0ZVQLB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
