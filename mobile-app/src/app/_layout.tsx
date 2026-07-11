import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

function RootLayoutNav() {
  const { currentUser, loading, userRole } = useAuth();

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

  if (loading || (currentUser && !userRole)) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="(teacher)" />
      <Stack.Screen name="(student)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
