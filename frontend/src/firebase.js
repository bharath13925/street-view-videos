import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
const firebaseConfig = {
  apiKey: "AIzaSyDdEVoPFPJiZ6wFdh2iqElwQsyOBNw1ea8",
  authDomain: "route-vision-a571d.firebaseapp.com",
  projectId: "route-vision-a571d",
  storageBucket: "route-vision-a571d.firebasestorage.app",
  messagingSenderId: "581116307240",
  appId: "1:581116307240:web:a07b0c43eac2d940cb921d",
  measurementId: "G-52XLN5CCYE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
