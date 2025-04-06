import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // If using Firebase Authentication
import { getFirestore } from "firebase/firestore"; // If using Firestore

const firebaseConfig = {
  apiKey: "AIzaSyBPvi_NxIdMlqJkfc1IFFSBUN8sWYzsd0k",
  authDomain: "campusflo.firebaseapp.com",
  projectId: "campusflo",
  storageBucket: "campusflo.firebasestorage.app",
  messagingSenderId: "888291692134",
  appId: "1:888291692134:web:d9f971131dc1414893e7a7",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
