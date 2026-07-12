import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { FaPaperPlane } from 'react-icons/fa';

export default function ChatWindow({ chat, currentUser }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!chat?.id) return;
    const q = query(
      collection(db, 'chats', chat.id, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [chat?.id]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMessage.trim()) return;
    
    const text = newMessage.trim();
    setNewMessage('');
    
    try {
      await addDoc(collection(db, 'chats', chat.id, 'messages'), {
        text,
        senderId: currentUser.uid,
        senderName: chat.participantNames[currentUser.uid] || 'Unknown',
        timestamp: serverTimestamp()
      });

      // Update chat's lastMessage
      await updateDoc(doc(db, 'chats', chat.id), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });

      // Fetch chat to get participants
      const chatDoc = await getDoc(doc(db, 'chats', chat.id));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const otherParticipantIds = chatData.participants.filter(p => p !== currentUser.uid);
        
        // Fetch push tokens for other participants
        const tokens = [];
        for (const pId of otherParticipantIds) {
          const userDoc = await getDoc(doc(db, 'users', pId));
          if (userDoc.exists() && userDoc.data().pushToken) {
            tokens.push(userDoc.data().pushToken);
          }
        }
        
        if (tokens.length > 0) {
          const senderName = chat.participantNames[currentUser.uid] || 'Unknown';
          // Send push notification directly via Expo Push API
          await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Accept-encoding': 'gzip, deflate',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(tokens.map(token => ({
              to: token,
              sound: 'default',
              title: `New message from ${senderName}`,
              body: text,
              data: { chatId: chat.id },
            }))),
          });
        }
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const getChatName = () => {
    if (chat.type === 'group') return chat.name || 'Class Group';
    const otherParticipantId = chat.participants.find(p => p !== currentUser.uid);
    return chat.participantNames?.[otherParticipantId] || 'Unknown User';
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-700 bg-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">{getChatName()}</h2>
          {chat.type === 'group' && <p className="text-xs text-slate-400">Class Announcement / Group Chat</p>}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => {
          const isMine = msg.senderId === currentUser.uid;
          const showName = chat.type === 'group' && !isMine && (idx === 0 || messages[idx-1].senderId !== msg.senderId);
          
          return (
            <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
              {showName && <span className="text-xs text-slate-400 ml-2 mb-1">{msg.senderName}</span>}
              <div className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                isMine 
                  ? 'bg-cyan-600 text-white rounded-br-none' 
                  : 'bg-slate-700 text-slate-100 rounded-bl-none'
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                {msg.timestamp && (
                  <span className="text-[10px] opacity-60 mt-1 block text-right">
                    {new Date(msg.timestamp.toMillis()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={sendMessage} className="p-4 border-t border-slate-700 bg-slate-800 flex gap-2">
        <input
          type="text"
          className="flex-1 bg-slate-900 border border-slate-700 rounded-full px-4 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button 
          type="submit"
          disabled={!newMessage.trim()}
          className="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-500 flex items-center justify-center text-white transition-colors"
        >
          <FaPaperPlane className="text-sm" />
        </button>
      </form>
    </div>
  );
}
