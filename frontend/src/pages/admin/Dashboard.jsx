import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-headline-md text-slate-900">Admin Dashboard</h1>
        <button onClick={handleLogout} className="flex items-center text-slate-600 hover:text-error">
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </button>
      </div>
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <p>Welcome, {currentUser?.email}</p>
        <p className="mt-2 text-sm text-slate-500">Your role is: Admin</p>
      </div>
    </div>
  );
}
