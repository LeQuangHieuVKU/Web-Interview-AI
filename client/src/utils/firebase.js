import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "interviewai-23370.firebaseapp.com",
  projectId: "interviewai-23370",
  storageBucket: "interviewai-23370.firebasestorage.app",
  messagingSenderId: "828055848748",
  appId: "1:828055848748:web:fe91a62f606aa894724e89",
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export { auth, provider };
