// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD_JEa-2Wz3JFWm3zuqaSCcHbqaQyJivvI",
  authDomain: "timetablegenerator-91747.firebaseapp.com",
  projectId: "timetablegenerator-91747",
  storageBucket: "timetablegenerator-91747.firebasestorage.app",
  messagingSenderId: "118104266627",
  appId: "1:118104266627:web:b9b20eb69db624a5c048b6"
};

/* Initialize Firebase */
const app = initializeApp(firebaseConfig);

/* Create auth instance */
const auth = getAuth(app);

/* Google provider */
const provider = new GoogleAuthProvider();


export { auth, provider };