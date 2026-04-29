import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userRole } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (currentUser && userRole === null) {
    // Still fetching the role from Firestore
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-headline-md text-primary animate-pulse">Loading Profile...</div>;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If they have a role but try to access wrong dashboard, redirect to their own
    if (userRole === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
    if (userRole === 'student') return <Navigate to="/student-dashboard" replace />;
    if (userRole === 'admin') return <Navigate to="/admin-dashboard" replace />;
    
    // Fallback if role is messed up
    return <Navigate to="/login" replace />;
  }

  return children;
}
