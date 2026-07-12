import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../context/AuthContext';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';
import { FaComments } from 'react-icons/fa';

export default function ChatLayout() {
  const { currentUser } = useAuth();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [showNewChatModal, setShowNewChatModal] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedChats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedChats.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      setChats(fetchedChats);
      
      // Update active chat data if it changed
      if (activeChat) {
        const updatedActive = fetchedChats.find(c => c.id === activeChat.id);
        if (updatedActive) setActiveChat(updatedActive);
      }
    }, (error) => {
      console.error("Messages Error:", error);
    });

    return () => unsubscribe();
  }, [currentUser, activeChat?.id]);

  return (
    <div className="flex h-[calc(100vh-120px)] bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-xl">
      {/* Sidebar - Chat List */}
      <div className="w-1/3 border-r border-slate-700 flex flex-col bg-slate-800/50">
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-800">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <FaComments className="text-cyan-400" /> Messages
          </h2>
          <button 
            onClick={() => setShowNewChatModal(true)}
            className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center hover:bg-cyan-500/30 transition-colors"
          >
            +
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatList chats={chats} activeChat={activeChat} onSelectChat={setActiveChat} currentUser={currentUser} />
        </div>
      </div>

      {/* Main Area - Chat Window */}
      <div className="flex-1 bg-slate-900 flex flex-col">
        {activeChat ? (
          <ChatWindow chat={activeChat} currentUser={currentUser} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
            <FaComments className="text-6xl mb-4 opacity-20" />
            <p>Select a conversation or start a new one</p>
          </div>
        )}
      </div>

      {showNewChatModal && (
        <NewChatModal 
          onClose={() => setShowNewChatModal(false)} 
          onChatCreated={(chat) => {
            setActiveChat(chat);
            setShowNewChatModal(false);
          }} 
          currentUser={currentUser} 
        />
      )}
    </div>
  );
}
