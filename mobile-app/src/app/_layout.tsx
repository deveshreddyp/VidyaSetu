import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';

function RootLayoutNav() {
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (currentUser) {
      const email = currentUser.email || '';
      // Route teacher vs student by email convention
      if (email.includes('teacher') || email.includes('admin') || email.endsWith('@cmrit.ac.in')) {
        router.replace('/(teacher)/dashboard');
      } else {
        router.replace('/(student)/dashboard');
      }
    } else {
      router.replace('/login');
    }
  }, [currentUser, loading]);

  if (loading) {
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
