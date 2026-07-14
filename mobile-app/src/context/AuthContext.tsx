import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc, getDocFromServer, getDocFromCache } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AuthContextType {
  currentUser: User | null;
  userRole: string | null;
  userData: any | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      // CRITICAL: Clear role immediately so stale role from previous session
      // is never used for routing while the new role is being fetched.
      setUserRole(null);
      setUserData(null);
      setCurrentUser(user);

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        let role: string | null = null;
        let fetchedUserData: any = null;

        // 1. Try to get the freshest data from the server first.
        //    This prevents Firestore's local disk cache from serving a stale role
        //    (e.g., after logging out as teacher and back in as student, the cache
        //    might still hold the teacher role document).
        try {
          const serverDoc = await getDocFromServer(userDocRef);
          if (serverDoc.exists()) {
            role = serverDoc.data().role || 'student';
            fetchedUserData = { id: serverDoc.id, ...serverDoc.data() };
          }
        } catch (serverErr) {
          console.warn('Could not fetch role from server, trying cache:', serverErr);
          // 2. Server unreachable — fall back to Firestore local cache
          try {
            const cacheDoc = await getDocFromCache(userDocRef);
            if (cacheDoc.exists()) {
              role = cacheDoc.data().role || 'student';
              fetchedUserData = { id: cacheDoc.id, ...cacheDoc.data() };
            }
          } catch (cacheErr) {
            // 3. No Firestore cache either — try AsyncStorage
            console.warn('Firestore cache miss, trying AsyncStorage:', cacheErr);
            try {
              const cachedRole = await AsyncStorage.getItem(`role_${user.uid}`);
              if (cachedRole) role = cachedRole;
            } catch (e) {
              // No cached role available at all
            }
          }
        }

        if (role) {
          setUserRole(role);
          setUserData(fetchedUserData);
          // Update AsyncStorage cache with the latest role
          try { await AsyncStorage.setItem(`role_${user.uid}`, role); } catch (e) {}
        } else {
          // User document doesn't exist at all — default to student
          setUserRole('student');
          setUserData(null);
        }
      }
      // If user is null (logged out), role & userData are already cleared above.
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password).then(() => {});

  const logout = async () => {
    // Clear role state immediately before signing out to prevent
    // any brief flash of the old role's UI during the transition.
    setUserRole(null);
    setUserData(null);
    await signOut(auth);
  };

  const signup = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password).then(() => {});

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userData, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}
