import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDx1-u3gCNQCNmef7b5wJpkXi0paUGqUO4',
  authDomain: 'vidyasetu-ai-2026.firebaseapp.com',
  projectId: 'vidyasetu-ai-2026',
  storageBucket: 'vidyasetu-ai-2026.firebasestorage.app',
  messagingSenderId: '819901877182',
  appId: '1:819901877182:web:d6f36f3a00be0ccf40c7ef',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
