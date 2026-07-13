import { initializeApp, getApps, getApp } from 'firebase/app';
// @ts-ignore - TS doesn't see getReactNativePersistence, but Metro resolves it via RN export map
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDx1-u3gCNQCNmef7b5wJpkXi0paUGqUO4',
  authDomain: 'vidyasetu-ai-2026.firebaseapp.com',
  projectId: 'vidyasetu-ai-2026',
  storageBucket: 'vidyasetu-ai-2026.firebasestorage.app',
  messagingSenderId: '819901877182',
  appId: '1:819901877182:web:d6f36f3a00be0ccf40c7ef',
};

// Capture BEFORE initializeApp so the flag is accurate on Expo hot-reload.
// If we check getApps().length AFTER initializeApp, it's always 1 on every load,
// and initializeAuth would crash with "auth/already-initialized" on the 2nd load.
const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();
export const auth = isNewApp
  ? initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    })
  : getAuth(app);
export const db = getFirestore(app);
export default app;

