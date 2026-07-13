import { useEffect, useState } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { messagingPromise, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export function useWebNotifications(currentUser) {
  const [permission, setPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );
  const [webPushToken, setWebPushToken] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    let unsubscribe = () => {};

    const setup = async () => {
      // Wait for the messaging instance to be ready (resolves to null if unsupported)
      const messaging = await messagingPromise;
      if (!messaging) return;

      try {
        const currentPermission = Notification.permission;
        setPermission(currentPermission);

        if (currentPermission === 'default') {
          const result = await Notification.requestPermission();
          setPermission(result);
          if (result !== 'granted') return;
        } else if (currentPermission !== 'granted') {
          return;
        }

        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) {
          console.error("VITE_FIREBASE_VAPID_KEY is missing! You must add it to Vercel Environment Variables.");
          return;
        }

        const token = await getToken(messaging, { vapidKey });

        if (token) {
          setWebPushToken(token);
          // Save to Firestore
          await setDoc(
            doc(db, 'users', currentUser.uid),
            { webPushToken: token },
            { merge: true }
          );
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
      }

      // Handle foreground messages
      unsubscribe = onMessage(messaging, (payload) => {
        // Play notification sound
        try {
          const audio = new Audio('https://actions.google.com/sounds/v1/ui/beep_short.ogg');
          audio.volume = 0.8;
          audio.play().catch(e => console.log('Audio autoplay blocked', e));
        } catch (e) {}

        toast.custom((t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-slate-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
          >
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-slate-100">
                    {payload.notification?.title || 'New Message'}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    {payload.notification?.body}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-slate-700">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  if (payload.data?.chatId) {
                    window.location.href = `/?chatId=${payload.data.chatId}`;
                  }
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-cyan-400 hover:text-cyan-300 focus:outline-none"
              >
                View
              </button>
            </div>
          </div>
        ), { duration: 4000 });
      });
    };

    setup();

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  return { permission, webPushToken };
}
