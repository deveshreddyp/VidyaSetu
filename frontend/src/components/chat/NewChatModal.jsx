import React, { useState } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { FaTimes, FaSearch, FaUserGraduate, FaChalkboardTeacher, FaUsers } from 'react-icons/fa';

export default function NewChatModal({ onClose, onChatCreated, currentUser }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [targetSection, setTargetSection] = useState('All');
  const [availableSections, setAvailableSections] = useState([]);
  
  // Need current user's profile to get their name for the chat participants map
  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  React.useEffect(() => {
    const fetchMe = async () => {
      const snap = await getDocs(query(collection(db, 'users'), where('email', '==', currentUser.email)));
      if (!snap.empty) setCurrentUserProfile(snap.docs[0].data());
      
      const studentsSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
      const sections = new Set();
      studentsSnap.docs.forEach(doc => {
        if (doc.data().section) sections.add(doc.data().section);
      });
      setAvailableSections(Array.from(sections).sort());
    };
    fetchMe();
  }, [currentUser]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setLoading(true);
    
    try {
      // Very basic search by exact email or name for now, in a real app use Algolia or similar
      const qEmail = query(collection(db, 'users'), where('email', '==', search.trim().toLowerCase()));
      const snapEmail = await getDocs(qEmail);
      
      const foundUsers = [];
      snapEmail.forEach(doc => {
        if (doc.id !== currentUser.uid) { // Don't chat with self
          foundUsers.push({ id: doc.id, ...doc.data() });
        }
      });
      
      setResults(foundUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startDirectChat = async (otherUser) => {
    try {
      // Check if chat already exists
      const q = query(collection(db, 'chats'), where('participants', '==', [currentUser.uid, otherUser.id].sort()));
      const existSnap = await getDocs(q);
      
      if (!existSnap.empty) {
        onChatCreated({ id: existSnap.docs[0].id, ...existSnap.docs[0].data() });
        return;
      }

      // Create new chat
      const chatData = {
        type: 'direct',
        participants: [currentUser.uid, otherUser.id].sort(),
        participantNames: {
          [currentUser.uid]: currentUserProfile?.name || currentUser.email,
          [otherUser.id]: otherUser.name || otherUser.email
        },
        updatedAt: serverTimestamp(),
        lastMessage: 'Chat started'
      };
      
      const docRef = await addDoc(collection(db, 'chats'), chatData);
      onChatCreated({ id: docRef.id, ...chatData });
    } catch (err) {
      console.error('Error starting chat', err);
    }
  };

  const createGroupChat = async (e) => {
    e.preventDefault();
    if (!groupName.trim() || currentUserProfile?.role !== 'teacher') return;
    
    try {
      // For simplicity, a group chat broadcasts to all students. We can add all students to participants.
      // In a real app, you might use subcollections for members to bypass the 10-item array limit in Firestore queries.
      // As a workaround, we'll store the group chat and fetch it differently, or just add the teacher.
      // Actually, let's just make a 'group' chat where we don't query by `array-contains` for students,
      // but students can see all 'group' chats. 
      // To keep it simple and secure, let's just create a chat and the teacher can invite later.
      alert('Group Chat creation requires advanced role-based access. Creating a basic group instance.');
      
      // Create a section tag if a specific section is targeted
      const sectionTag = targetSection === 'All' ? 'ALL_SECTIONS' : `SECTION_${targetSection}`;
      
      const chatData = {
        type: 'group',
        name: groupName,
        targetSection: targetSection,
        participants: [currentUser.uid],
        members: [currentUser.uid, sectionTag],
        participantNames: {
          [currentUser.uid]: currentUserProfile?.name || currentUser.email
        },
        updatedAt: serverTimestamp(),
        lastMessage: 'Group created'
      };
      
      const docRef = await addDoc(collection(db, 'chats'), chatData);
      onChatCreated({ id: docRef.id, ...chatData });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 rounded-xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-700">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-xl font-bold text-white">New Chat</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <FaTimes />
          </button>
        </div>
        
        <div className="p-4">
          {currentUserProfile?.role === 'teacher' && (
            <div className="flex gap-2 mb-4 p-1 bg-slate-900 rounded-lg">
              <button 
                onClick={() => setIsCreatingGroup(false)}
                className={`flex-1 py-2 text-sm rounded-md font-medium ${!isCreatingGroup ? 'bg-slate-700 text-white' : 'text-slate-400'}`}
              >
                Direct Message
              </button>
              <button 
                onClick={() => setIsCreatingGroup(true)}
                className={`flex-1 py-2 text-sm rounded-md font-medium ${isCreatingGroup ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
              >
                Class Group
              </button>
            </div>
          )}

          {isCreatingGroup ? (
            <form onSubmit={createGroupChat}>
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Group Name</label>
                <input 
                  type="text" 
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="e.g. CS 101 Announcements"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500"
                />
              <div className="mb-4">
                <label className="block text-sm text-slate-400 mb-1">Target Section</label>
                <select
                  value={targetSection}
                  onChange={(e) => setTargetSection(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 appearance-none"
                >
                  <option value="All">All Sections</option>
                  {availableSections.map(sec => (
                    <option key={sec} value={sec}>Section {sec}</option>
                  ))}
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-lg font-bold transition-colors"
              >
                Create Group
              </button>
            </form>
          ) : (
            <>
              <form onSubmit={handleSearch} className="relative mb-6">
                <input 
                  type="email" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Enter exact email address..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500"
                />
                <button type="submit" className="absolute right-3 top-3 text-slate-400 hover:text-cyan-400">
                  <FaSearch size={20} />
                </button>
              </form>

              {loading ? (
                <div className="text-center text-slate-500 my-8">Searching...</div>
              ) : (
                <div className="space-y-2">
                  {results.length > 0 ? results.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => startDirectChat(user)}
                      className="flex items-center gap-3 p-3 bg-slate-900 rounded-lg border border-slate-700 hover:border-cyan-500 cursor-pointer transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                        {user.role === 'teacher' ? <FaChalkboardTeacher /> : <FaUserGraduate />}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-200">{user.name || user.email}</h4>
                        <p className="text-xs text-slate-400 capitalize">{user.role || 'Student'}</p>
                      </div>
                    </div>
                  )) : (
                    search && !loading && <div className="text-center text-slate-500 my-8">No users found with that email.</div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
