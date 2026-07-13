const admin = require('firebase-admin');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithCustomToken } = require('firebase/auth');
const { getFirestore, collection, query, where, getDocs, doc, getDoc } = require('firebase/firestore');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Initialize Client
const firebaseConfig = {
  apiKey: "AIzaSyDx1-u3gCNQCNmef7b5wJpkXi0paUGqUO4",
  authDomain: "vidyasetu-ai-2026.firebaseapp.com",
  projectId: "vidyasetu-ai-2026",
};
const clientApp = initializeApp(firebaseConfig);
const clientAuth = getAuth(clientApp);
const clientDb = getFirestore(clientApp);

async function testQuery() {
  try {
    // 1. Create a dummy user
    const uid = 'test-teacher-123';
    await admin.firestore().collection('users').doc(uid).set({
      role: 'teacher',
      email: 'test@example.com'
    });

    // 2. Generate Custom Token
    const customToken = await admin.auth().createCustomToken(uid);

    // 3. Login as Client
    await signInWithCustomToken(clientAuth, customToken);
    console.log("Logged in client!");

    // 4. Try the exact operations the app does
    console.log("Testing getDoc on own profile...");
    const ownDoc = await getDoc(doc(clientDb, 'users', uid));
    console.log("ownDoc exists?", ownDoc.exists());

    console.log("Testing getDocs for students...");
    const q = query(collection(clientDb, 'users'), where('role', '==', 'student'));
    const snap = await getDocs(q);
    console.log("Got students:", snap.size);

    process.exit(0);
  } catch (err) {
    console.error("Test Failed:", err);
    process.exit(1);
  }
}

testQuery();
