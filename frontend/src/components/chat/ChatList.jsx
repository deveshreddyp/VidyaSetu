import React from 'react';

export default function ChatList({ chats, activeChat, onSelectChat, currentUser }) {
  if (chats.length === 0) {
    return <div className="p-4 text-slate-500 text-sm text-center">No messages yet.</div>;
  }

  const getChatName = (chat) => {
    if (chat.type === 'group') return chat.name || 'Class Group';
    const otherParticipantId = chat.participants.find(p => p !== currentUser.uid);
    return chat.participantNames?.[otherParticipantId] || 'Unknown User';
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col">
      {chats.map(chat => {
        const isActive = activeChat?.id === chat.id;
        const name = getChatName(chat);
        
        return (
          <div 
            key={chat.id}
            onClick={() => onSelectChat(chat)}
            className={`p-4 border-b border-slate-700/50 cursor-pointer flex items-center gap-3 transition-colors ${
              isActive ? 'bg-cyan-500/10 border-l-4 border-l-cyan-400' : 'hover:bg-slate-700/30 border-l-4 border-l-transparent'
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              chat.type === 'group' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-300'
            }`}>
              {getInitials(name)}
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className={`font-semibold truncate ${isActive ? 'text-cyan-100' : 'text-slate-200'}`}>
                  {name}
                </h3>
                {chat.updatedAt && (
                  <span className="text-xs text-slate-500 whitespace-nowrap ml-2">
                    {new Date(chat.updatedAt.toMillis()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 truncate">
                {chat.lastMessage || 'No messages yet'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
