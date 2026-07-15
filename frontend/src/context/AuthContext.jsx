import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, googleProvider } from '../services/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useWebNotifications } from '../hooks/useWebNotifications';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'student', 'teacher', 'admin'
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Web Push Notifications
  useWebNotifications(currentUser);

  // Sign up and set role
  async function signup(email, password, role) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Check if teacher preloaded data for this email via Excel
    const q = query(collection(db, "users"), where("email", "==", email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      await setDoc(doc(db, "users", user.uid), {
        ...existingDoc.data(),
        uid: user.uid
      });
      await deleteDoc(doc(db, "users", existingDoc.id));
      setUserRole(existingDoc.data().role || role);
    } else {
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        role: role,
        createdAt: new Date()
      });
      setUserRole(role);
    }
    
    return userCredential;
  }

  // Login
  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  // Google Login
  async function loginWithGoogle(role = 'student') {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      // Check if teacher preloaded data for this email via Excel
      const q = query(collection(db, "users"), where("email", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const existingDoc = querySnapshot.docs[0];
        await setDoc(userDocRef, {
          ...existingDoc.data(),
          uid: user.uid,
          name: user.displayName || existingDoc.data().name
        });
        await deleteDoc(doc(db, "users", existingDoc.id));
        setUserRole(existingDoc.data().role || role);
      } else {
        await setDoc(userDocRef, {
          email: user.email,
          role: role,
          name: user.displayName,
          createdAt: new Date()
        });
        setUserRole(role);
      }
    } else {
      setUserRole(userDoc.data().role);
    }
    
    return result;
  }

  // Logout
  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userDocRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setUserRole(userDoc.data().role || 'student');
            setUserData({ id: userDoc.id, ...userDoc.data() });
          } else if (user.email) {
            // Fallback: Check if user was pre-created by Admin via email
            const q = query(collection(db, "users"), where("email", "==", user.email.toLowerCase()));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const existingDoc = querySnapshot.docs[0];
              setUserRole(existingDoc.data().role || 'student');
              setUserData({ id: user.uid, ...existingDoc.data() });
              
              // Migrate the document to the correct UID
              try {
                await setDoc(userDocRef, { ...existingDoc.data(), uid: user.uid });
                await deleteDoc(doc(db, "users", existingDoc.id));
              } catch (migrateErr) {
                console.warn('Failed to migrate user doc UID:', migrateErr);
              }
            } else {
              setUserRole('student'); // Fallback
              setUserData(null);
            }
          } else {
            setUserRole('student'); // Fallback
            setUserData(null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setUserRole('student'); // Fallback on error
        }
      } else {
        setUserRole(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    userData,
    signup,
    login,
    loginWithGoogle,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
