import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

export default function TeacherProfileScreen() {
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const email = currentUser?.email || '';
  const name = email.split('@')[0];
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.initials}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.email}>{email}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="school-outline" size={13} color="#6C63FF" />
          <Text style={styles.roleText}>Teacher Portal</Text>
        </View>
      </View>

      <View style={styles.logoSection}>
        <Image source={require('../../../assets/logo.jpeg')} style={styles.logo} resizeMode="contain" />
        <Text style={styles.appName}>VidyaSetu AI</Text>
        <Text style={styles.tagline}>Learn. Connect. Grow.</Text>
      </View>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Ionicons name="mail-outline" size={18} color="#6C63FF" />
          <Text style={styles.infoText}>{email}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.infoRow}>
          <Ionicons name="shield-checkmark-outline" size={18} color="#10B981" />
          <Text style={styles.infoText}>Teacher Account</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={20} color="#EF4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', paddingHorizontal: 24, paddingTop: 64 },
  header: { alignItems: 'center', marginBottom: 32 },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#6C63FF22',
    borderWidth: 2,
    borderColor: '#6C63FF44',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  initials: { fontSize: 28, fontWeight: '700', color: '#6C63FF' },
  name: { fontSize: 22, fontWeight: '700', color: '#F1F5F9' },
  email: { color: '#64748B', fontSize: 13, marginTop: 4 },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6C63FF22',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 10,
  },
  roleText: { color: '#6C63FF', fontSize: 12, fontWeight: '600' },
  logoSection: { alignItems: 'center', marginBottom: 32 },
  logo: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#fff', marginBottom: 8 },
  appName: { fontSize: 18, fontWeight: '700', color: '#F1F5F9' },
  tagline: { fontSize: 12, color: '#64748B', marginTop: 2 },
  infoCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  infoText: { color: '#CBD5E1', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 4 },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#EF444422',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EF444444',
  },
  logoutText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});
