import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface StudentData {
  name?: string;
  usn?: string;
  section?: string;
  studentLevel?: string;
  cgpa?: number;
  backlogs?: number;
  email?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  'Level 5': '#10B981',
  'Level 4': '#3B82F6',
  'Level 3': '#8B5CF6',
  'Level 2': '#F59E0B',
  'Ineligible for Placements': '#EF4444',
};

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon as any} size={18} color="#6C63FF" style={{ width: 24 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

export default function StudentDashboard() {
  const { currentUser } = useAuth();
  const [studentData, setStudentData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudent = async () => {
    if (!currentUser?.email) { setLoading(false); return; }
    try {
      const q = query(collection(db, 'users'), where('email', '==', currentUser.email));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setStudentData(snap.docs[0].data() as StudentData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudent(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchStudent(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22D3EE" />
      </View>
    );
  }

  const level = studentData?.studentLevel || 'Unknown';
  const levelColor = LEVEL_COLORS[level] || '#64748B';
  const name = studentData?.name || currentUser?.email?.split('@')[0] || 'Student';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22D3EE" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {name} 👋</Text>
          <Text style={styles.subGreeting}>Your academic snapshot</Text>
        </View>
        <Image source={require('../../../assets/logo.jpeg')} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Level badge card */}
      <View style={[styles.levelCard, { borderColor: levelColor + '44', backgroundColor: levelColor + '11' }]}>
        <View style={[styles.levelIconBg, { backgroundColor: levelColor + '22' }]}>
          <Ionicons name="trophy" size={32} color={levelColor} />
        </View>
        <View>
          <Text style={styles.levelCardLabel}>Placement Level</Text>
          <Text style={[styles.levelCardValue, { color: levelColor }]}>{level}</Text>
        </View>
      </View>

      {/* Student details */}
      <Text style={styles.sectionTitle}>Your Details</Text>
      <View style={styles.card}>
        <InfoRow icon="person-outline" label="Name" value={studentData?.name || '—'} />
        <View style={styles.divider} />
        <InfoRow icon="id-card-outline" label="USN" value={studentData?.usn || '—'} />
        <View style={styles.divider} />
        <InfoRow icon="school-outline" label="Section" value={studentData?.section || '—'} />
        <View style={styles.divider} />
        <InfoRow icon="star-outline" label="CGPA" value={studentData?.cgpa?.toFixed(2) || '—'} />
        <View style={styles.divider} />
        <InfoRow icon="warning-outline" label="Backlogs" value={studentData?.backlogs ?? 0} />
      </View>

      {/* Advice */}
      <Text style={styles.sectionTitle}>Placement Guidance</Text>
      <View style={[styles.adviceCard, { borderLeftColor: levelColor }]}>
        <Text style={styles.adviceText}>
          {level === 'Level 5'
            ? '🎉 Excellent! You are placement-ready. Target top-tier companies and practice DSA & system design.'
            : level === 'Level 4'
            ? '💪 Great progress! Focus on improving your CGPA and strengthen your core subject knowledge.'
            : level === 'Level 3'
            ? '📚 Keep going! Work on clearing backlogs and developing your project portfolio.'
            : level === 'Level 2'
            ? '🔥 You can do it! Focus on clearing backlogs and improving CGPA this semester.'
            : '📌 Speak to your mentor for a personalized academic improvement plan.'}
        </Text>
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 20, paddingTop: 56 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#F1F5F9' },
  subGreeting: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  logo: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#fff' },
  levelCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 28,
  },
  levelIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelCardLabel: { color: '#94A3B8', fontSize: 12, marginBottom: 4 },
  levelCardValue: { fontSize: 20, fontWeight: '700' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#CBD5E1', marginBottom: 12 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  infoLabel: { color: '#64748B', fontSize: 13, flex: 1 },
  infoValue: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  divider: { height: 1, backgroundColor: '#334155' },
  adviceCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  adviceText: { color: '#CBD5E1', fontSize: 14, lineHeight: 22 },
});
