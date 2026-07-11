import { Stack, router } from 'expo-router';
import { useEffect } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import { useFonts, Outfit_400Regular, Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import Toast from 'react-native-toast-message';

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
