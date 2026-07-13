import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useUnreadMessages(currentUser, userData) {
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    // We store the last read timestamp per chat in localStorage
    // format: `lastRead_${chatId}` -> timestamp in ms

    const checkUnread = (chats) => {
      let unread = false;
      for (const chat of chats) {
        const lastRead = localStorage.getItem(`lastRead_${chat.id}`);
        const chatUpdated = chat.updatedAt?.toMillis() || 0;
        
        // If chat was updated more recently than our last read time, it's unread
        if (!lastRead || chatUpdated > parseInt(lastRead, 10)) {
          // If the last message was sent by us, it's NOT unread
          // Wait, lastMessage is just text. We can't know who sent it easily unless we check `chat.participants` or something.
          // Actually, if we just rely on lastRead, it's fine. When we send a message, we update lastRead.
          unread = true;
          break;
        }
      }
      setHasUnread(unread);
    };

    const chatsMap = new Map();

    const updateChats = () => {
      checkUnread(Array.from(chatsMap.values()));
    };

    // Query 1: Direct chats
    const q1 = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );
    
    const unsub1 = onSnapshot(q1, (snap) => {
      snap.docs.forEach(doc => {
        chatsMap.set(doc.id, { id: doc.id, ...doc.data() });
      });
      updateChats();
    });

    // Query 2: Section chats
    let unsub2 = () => {};
    if (userData?.section) {
      const q2 = query(
        collection(db, 'chats'),
        where('targetSection', 'in', [userData.section, 'All'])
      );
      unsub2 = onSnapshot(q2, (snap) => {
        snap.docs.forEach(doc => {
          chatsMap.set(doc.id, { id: doc.id, ...doc.data() });
        });
        updateChats();
      });
    }

    // Interval to recheck occasionally in case localStorage is updated in another tab
    const interval = setInterval(updateChats, 2000);

    return () => {
      unsub1();
      unsub2();
      clearInterval(interval);
    };
  }, [currentUser, userData?.section]);

  return hasUnread;
}
