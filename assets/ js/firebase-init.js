// Firebase SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-analytics.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAVhJ8wvmK9dv7ohG5jnGGETWJsEiRFrVs",
  authDomain: "diecastscape.firebaseapp.com",
  projectId: "diecastscape",
  storageBucket: "diecastscape.firebasestorage.app",
  messagingSenderId: "701890525745",
  appId: "1:701890525745:web:b0a46856995c7f5eb73310",
  measurementId: "G-27MHGKL3V9"
};

// Init Firebase
const app = initializeApp(firebaseConfig);

// Services
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);

// Export
export { auth, db, analytics };

