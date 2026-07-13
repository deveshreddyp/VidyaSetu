const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, getDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDx1-u3gCNQCNmef7b5wJpkXi0paUGqUO4",
  authDomain: "vidyasetu-ai-2026.firebaseapp.com",
  projectId: "vidyasetu-ai-2026",
  storageBucket: "vidyasetu-ai-2026.firebasestorage.app",
  messagingSenderId: "819901877182",
  appId: "1:819901877182:web:d6f36f3a00be0ccf40c7ef"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function test() {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, "deveshreddypusalapati@gmail.com", "Password123!");
    console.log("Logged in UID:", userCredential.user.uid);
    
    const userDocRef = doc(db, "users", userCredential.user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      console.log("Role:", userDoc.data().role);
    } else {
      console.log("Document does not exist");
    }
  } catch (err) {
    console.error("Error:", err.message);
  }
}
test();
