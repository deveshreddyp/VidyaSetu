import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import Toast from 'react-native-toast-message';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { db } from '../config/firebase';
import { doc, setDoc } from 'firebase/firestore';
import * as Notifications from 'expo-notifications';

function RootLayoutNav() {
  const { currentUser, loading, userRole } = useAuth();
  const { expoPushToken } = usePushNotifications();

  // Save push token to Firestore so other users can send notifications to this device
  useEffect(() => {
    if (currentUser && expoPushToken) {
      setDoc(doc(db, 'users', currentUser.uid), { pushToken: expoPushToken }, { merge: true })
        .catch(err => console.error('Failed to save push token:', err));
    }
  }, [currentUser, expoPushToken]);

  // Navigate to the correct chat when the user taps a push notification
  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as Record<string, string>;
      const chatId = data?.chatId;
      const chatName = data?.chatName || 'Chat';
      const type = data?.type || 'direct';
      if (chatId) {
        router.push({ pathname: `/chat/${chatId}`, params: { chatName, type } });
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (currentUser) {
      // Route based on role fetched from Firestore (same as the web app)
      if (userRole === 'teacher' || userRole === 'admin') {
        router.replace('/(teacher)/dashboard');
      } else if (userRole === 'student') {
        router.replace('/(student)/dashboard');
      }
      // If userRole is still null, wait — loading state handles it
    } else {
      router.replace('/login');
    }
  }, [currentUser, loading, userRole]);

  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="(teacher)" />
        <Stack.Screen name="(student)" />
      </Stack>
      {(loading || (currentUser && !userRole)) && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
      <Toast />
    </>
  );
}
