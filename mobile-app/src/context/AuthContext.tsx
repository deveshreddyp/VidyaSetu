import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
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
      setCurrentUser(user);
      if (user) {
        try {
          // Fetch role from Firestore users/{uid} — same logic as the web app
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const role = userDoc.data().role || 'student';
            setUserRole(role);
            setUserData({ id: userDoc.id, ...userDoc.data() });
            // Cache role for offline boot
            try { await AsyncStorage.setItem(`role_${user.uid}`, role); } catch (e) {}
          } else {
            setUserRole('student'); // fallback
            setUserData(null);
          }
        } catch (err) {
          console.error('Error fetching user role:', err);
          // Try to fallback to cached role if network fails
          try {
            const cachedRole = await AsyncStorage.getItem(`role_${user.uid}`);
            setUserRole(cachedRole || 'student');
          } catch (e) {
            setUserRole('student');
          }
        }
      } else {
        setUserRole(null);
        setUserData(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = (email: string, password: string) =>
    signInWithEmailAndPassword(auth, email, password).then(() => {});

  const logout = () => signOut(auth);

  const signup = (email: string, password: string) =>
    createUserWithEmailAndPassword(auth, email, password).then(() => {});

  return (
    <AuthContext.Provider value={{ currentUser, userRole, userData, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}
