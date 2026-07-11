import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface Student {
  id: string;
  name?: string;
  email?: string;
  studentLevel?: string;
  cgpa?: number;
  section?: string;
}

const LEVEL_COLORS: Record<string, string> = {
  'Level 5': '#10B981',
  'Level 4': '#3B82F6',
  'Level 3': '#8B5CF6',
  'Level 2': '#F59E0B',
  'Ineligible for Placements': '#EF4444',
};

function StatCard({ title, value, icon, color }: { title: string; value: string | number; icon: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon as any} size={22} color={color} />
      </View>
      <View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{title}</Text>
      </View>
    </View>
  );
}

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
      setStudents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchStudents(); };

  const totalStudents = students.length;
  const level5Count = students.filter((s) => s.studentLevel === 'Level 5').length;
  const level4Count = students.filter((s) => s.studentLevel === 'Level 4').length;
  const ineligible = students.filter((s) => s.studentLevel === 'Ineligible for Placements').length;

  const levelGroups: Record<string, number> = {};
  students.forEach((s) => {
    const lv = s.studentLevel || 'Unknown';
    levelGroups[lv] = (levelGroups[lv] || 0) + 1;
  });

  const teacherName = currentUser?.email?.split('@')[0] || 'Teacher';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {teacherName} 👋</Text>
          <Text style={styles.subGreeting}>Here's your class overview</Text>
        </View>
        <Image source={require('../../../assets/logo.jpeg')} style={styles.headerLogo} resizeMode="contain" />
      </View>

      {/* Stat Cards */}
      <Text style={styles.sectionTitle}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard title="Total Students" value={totalStudents} icon="people" color="#6C63FF" />
        <StatCard title="Level 5" value={level5Count} icon="trophy" color="#10B981" />
        <StatCard title="Level 4" value={level4Count} icon="star" color="#3B82F6" />
        <StatCard title="Ineligible" value={ineligible} icon="warning" color="#EF4444" />
      </View>

      {/* Level Breakdown */}
      <Text style={styles.sectionTitle}>Placement Level Breakdown</Text>
      <View style={styles.card}>
        {Object.entries(levelGroups)
          .sort((a, b) => b[1] - a[1])
          .map(([level, count]) => {
            const pct = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
            const color = LEVEL_COLORS[level] || '#64748B';
            return (
              <View key={level} style={styles.levelRow}>
                <View style={styles.levelLabel}>
                  <View style={[styles.levelDot, { backgroundColor: color }]} />
                  <Text style={styles.levelName}>{level}</Text>
                </View>
                <View style={styles.levelBarContainer}>
                  <View style={[styles.levelBar, { width: `${pct}%`, backgroundColor: color }]} />
                </View>
                <Text style={[styles.levelCount, { color }]}>{count}</Text>
              </View>
            );
          })}
      </View>

      {/* Recent Students */}
      <Text style={styles.sectionTitle}>Recent Students</Text>
      <View style={styles.card}>
        {students.slice(0, 6).map((s) => {
          const color = LEVEL_COLORS[s.studentLevel || ''] || '#64748B';
          return (
            <View key={s.id} style={styles.studentRow}>
              <View style={[styles.avatar, { backgroundColor: color + '33' }]}>
                <Text style={[styles.avatarText, { color }]}>
                  {(s.name || s.email || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName} numberOfLines={1}>{s.name || s.email || 'Unknown'}</Text>
                <Text style={styles.studentSection}>{s.section || '—'}</Text>
              </View>
              <View style={[styles.levelBadge, { backgroundColor: color + '22' }]}>
                <Text style={[styles.levelBadgeText, { color }]}>{(s.studentLevel || 'N/A').replace('Level ', 'L')}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={{ height: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 20, paddingTop: 56 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  greeting: { fontSize: 22, fontWeight: '700', color: '#F1F5F9' },
  subGreeting: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  headerLogo: { width: 48, height: 48, borderRadius: 10, backgroundColor: '#fff' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#CBD5E1',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderLeftWidth: 3,
    borderWidth: 1,
    borderColor: '#334155',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: { fontSize: 22, fontWeight: '700', color: '#F1F5F9' },
  statLabel: { fontSize: 11, color: '#64748B', marginTop: 2 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 14,
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  levelLabel: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 140 },
  levelDot: { width: 8, height: 8, borderRadius: 4 },
  levelName: { color: '#94A3B8', fontSize: 12, flex: 1 },
  levelBarContainer: {
    flex: 1,
    height: 6,
    backgroundColor: '#0F172A',
    borderRadius: 3,
    overflow: 'hidden',
  },
  levelBar: { height: '100%', borderRadius: 3 },
  levelCount: { fontSize: 13, fontWeight: '700', width: 32, textAlign: 'right' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  studentInfo: { flex: 1 },
  studentName: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  studentSection: { color: '#64748B', fontSize: 12, marginTop: 2 },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  levelBadgeText: { fontSize: 11, fontWeight: '700' },
});
