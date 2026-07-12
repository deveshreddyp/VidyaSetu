import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import Signup from './pages/auth/Signup';
import StudentDashboard from './pages/student/Dashboard';
import Tutor from './pages/student/Tutor';
import TeacherDashboard from './pages/teacher/Dashboard';
import WorksheetGenerator from './pages/teacher/WorksheetGenerator';
import QuizGenerator from './pages/teacher/QuizGenerator';
import QuizAttempt from './pages/student/QuizAttempt';
import ResumeBuilder from './pages/student/ResumeBuilder';
import AdminDashboard from './pages/admin/Dashboard';
import Settings from './pages/admin/Settings';

// A component to handle root redirect based on role
function RootRedirect() {
  const { currentUser, userRole } = useAuth();
  
  if (!currentUser) return <Navigate to="/login" replace />;
  
  if (userRole === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
  if (userRole === 'admin') return <Navigate to="/admin-dashboard" replace />;
  if (userRole === 'student') return <Navigate to="/student-dashboard" replace />;
  
  // Wait for userRole to be fetched from Firestore
  if (currentUser && userRole === null) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-headline-md text-primary animate-pulse">Loading Profile...</div>;
  }
  
  // Default fallback
  return <Navigate to="/student-dashboard" replace />;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          {/* Root Route */}
          <Route path="/" element={<RootRedirect />} />

          {/* Protected Routes */}
          <Route 
            path="/student-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student-dashboard/tutor" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <Tutor />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student-dashboard/quiz" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <QuizAttempt />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/student-dashboard/resume" 
            element={
              <ProtectedRoute allowedRoles={['student']}>
                <ResumeBuilder />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher-dashboard" 
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher-dashboard/worksheet" 
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <WorksheetGenerator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teacher-dashboard/quiz" 
            element={
              <ProtectedRoute allowedRoles={['teacher']}>
                <QuizGenerator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-dashboard/*" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                <Settings />
              </ProtectedRoute>
            } 
          />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
