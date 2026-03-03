import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBVdar0H80xdLTKhBtFx2JzjZr5vg_rnuI",
  authDomain: "buscador-merma.firebaseapp.com",
  projectId: "buscador-merma",
  storageBucket: "buscador-merma.firebasestorage.app",
  messagingSenderId: "1061572148887",
  appId: "1:1061572148887:web:9647d31bb946df040433d2"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);