import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { FiSettings, FiUserPlus, FiCheck, FiX } from 'react-icons/fi';

export default function Settings() {
  const { currentUser } = useAuth();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);

  // Security check: Only this email can view the page
  const isAdmin = currentUser?.email === 'deveshreddypusalapati@gmail.com';

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <FiX className="text-red-500 text-6xl mb-4" />
        <h1 className="text-2xl font-bold text-slate-200">Access Denied</h1>
        <p className="text-slate-400 mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // Check if user already exists
      const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
      const snap = await getDocs(q);

      if (!snap.empty) {
        setStatus({ type: 'error', message: 'User already exists in the database.' });
        setLoading(false);
        return;
      }

      // Pre-load the user document with role: 'teacher'
      await addDoc(collection(db, 'users'), {
        email: email.trim().toLowerCase(),
        role: 'teacher',
        createdAt: serverTimestamp(),
        invitedBy: currentUser.email
      });

      setStatus({ type: 'success', message: `Teacher account created for ${email}. They can now sign in using Google or email.` });
      setEmail('');
    } catch (error) {
      setStatus({ type: 'error', message: `Failed to create teacher: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <FiSettings className="text-3xl text-primary" />
        <h1 className="text-3xl font-bold text-slate-100">Admin Settings</h1>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <FiUserPlus className="text-xl text-cyan-400" />
          <h2 className="text-xl font-bold text-slate-200">Invite Teacher</h2>
        </div>
        
        <p className="text-slate-400 mb-6 text-sm leading-relaxed">
          Enter the email address of the teacher you want to invite. This will pre-authorize their email in the database. 
          When they sign in (via Google or password), they will automatically be granted Teacher privileges.
        </p>

        {status.message && (
          <div className={`p-4 rounded-lg mb-6 flex items-start gap-3 ${status.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
            {status.type === 'success' ? <FiCheck className="mt-1 flex-shrink-0" /> : <FiX className="mt-1 flex-shrink-0" />}
            <p>{status.message}</p>
          </div>
        )}

        <form onSubmit={handleInvite} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-400 mb-2">Teacher Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@vidyasetu.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading || !email.trim()}
            className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center min-w-[140px]"
          >
            {loading ? 'Processing...' : 'Invite Teacher'}
          </button>
        </form>
      </div>
    </div>
  );
}
