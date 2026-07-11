import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

interface Student {
  id: string;
  studentLevel?: string;
  section?: string;
  cgpa?: number;
}

const LEVEL_COLORS: Record<string, string> = {
  'Level 5': '#10B981',
  'Level 4': '#3B82F6',
  'Level 3': '#8B5CF6',
  'Level 2': '#F59E0B',
  'Ineligible for Placements': '#EF4444',
};

const LEVELS = ['Level 5', 'Level 4', 'Level 3', 'Level 2', 'Ineligible for Placements'];

export default function AnalyticsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
      setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchStudents(); };

  const total = students.length;

  const levelCounts: Record<string, number> = {};
  LEVELS.forEach((lv) => { levelCounts[lv] = 0; });
  students.forEach((s) => {
    if (s.studentLevel && levelCounts[s.studentLevel] !== undefined) {
      levelCounts[s.studentLevel]++;
    }
  });

  // Section breakdown
  const sectionCounts: Record<string, number> = {};
  students.forEach((s) => {
    const sec = s.section || 'Unknown';
    sectionCounts[sec] = (sectionCounts[sec] || 0) + 1;
  });

  // Avg CGPA
  const cgpas = students.filter((s) => s.cgpa).map((s) => s.cgpa as number);
  const avgCgpa = cgpas.length > 0 ? (cgpas.reduce((a, b) => a + b, 0) / cgpas.length).toFixed(2) : 'N/A';

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
    >
      <Text style={styles.pageTitle}>Analytics</Text>
      <Text style={styles.pageSubtitle}>Placement & performance overview</Text>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderColor: '#6C63FF44' }]}>
          <Text style={[styles.summaryValue, { color: '#6C63FF' }]}>{total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#10B98144' }]}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>{avgCgpa}</Text>
          <Text style={styles.summaryLabel}>Avg CGPA</Text>
        </View>
        <View style={[styles.summaryCard, { borderColor: '#F59E0B44' }]}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
            {total > 0 ? ((levelCounts['Level 5'] / total) * 100).toFixed(0) : 0}%
          </Text>
          <Text style={styles.summaryLabel}>L5 Rate</Text>
        </View>
      </View>

      {/* Level breakdown */}
      <Text style={styles.sectionTitle}>Placement Level Distribution</Text>
      <View style={styles.card}>
        {LEVELS.map((lv) => {
          const count = levelCounts[lv] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          const color = LEVEL_COLORS[lv];
          return (
            <View key={lv} style={styles.levelItem}>
              <View style={styles.levelTop}>
                <View style={styles.levelLabelRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <Text style={styles.levelText}>{lv}</Text>
                </View>
                <Text style={[styles.levelCountText, { color }]}>{count} ({pct.toFixed(1)}%)</Text>
              </View>
              <View style={styles.barBg}>
                <View style={[styles.bar, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
            </View>
          );
        })}
      </View>

      {/* Section breakdown */}
      <Text style={styles.sectionTitle}>Section Breakdown</Text>
      <View style={styles.card}>
        {Object.entries(sectionCounts)
          .sort((a, b) => b[1] - a[1])
          .map(([section, count]) => {
            const pct = total > 0 ? (count / total) * 100 : 0;
            return (
              <View key={section} style={styles.levelItem}>
                <View style={styles.levelTop}>
                  <Text style={styles.levelText}>Section {section}</Text>
                  <Text style={[styles.levelCountText, { color: '#6C63FF' }]}>{count} students</Text>
                </View>
                <View style={styles.barBg}>
                  <View style={[styles.bar, { width: `${pct}%`, backgroundColor: '#6C63FF' }]} />
                </View>
              </View>
            );
          })}
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  content: { padding: 20, paddingTop: 56 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  pageTitle: { fontSize: 24, fontWeight: '700', color: '#F1F5F9', marginBottom: 4 },
  pageSubtitle: { fontSize: 13, color: '#64748B', marginBottom: 24 },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  summaryCard: {
    flex: 1,
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  summaryValue: { fontSize: 24, fontWeight: '700' },
  summaryLabel: { fontSize: 11, color: '#64748B', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#CBD5E1', marginBottom: 12 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 16,
  },
  levelItem: { gap: 8 },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  levelLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  levelText: { color: '#94A3B8', fontSize: 13 },
  levelCountText: { fontSize: 12, fontWeight: '700' },
  barBg: { height: 6, backgroundColor: '#0F172A', borderRadius: 3, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 3 },
});
