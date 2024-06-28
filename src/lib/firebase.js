import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";


const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: "realtimemessaging-1ed3c.firebaseapp.com",
  projectId: "realtimemessaging-1ed3c",
  storageBucket: "realtimemessaging-1ed3c.appspot.com",
  messagingSenderId: "325133673971",
  appId: "1:325133673971:web:d226f0fbcdc530739ade86"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth();
export const db = getFirestore();
export const storage = getStorage();