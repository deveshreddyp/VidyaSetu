import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface QuizResult {
  id: string;
  topic?: string;
  percentage?: number;
  mark?: number;
  max?: number;
  subject?: string;
  createdAt?: any;
}

export default function StudentResultsScreen() {
  const { currentUser } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchResults = async () => {
    if (!currentUser?.email) { setLoading(false); return; }
    try {
      // 1. Fetch quiz results
      const q = query(collection(db, 'quizResults'), where('studentEmail', '==', currentUser.email));
      const snap = await getDocs(q);
      let quizzes = snap.docs.map((d) => ({ id: d.id, ...d.data() } as QuizResult));

      // 2. Fetch Excel subject results from the user's document
      const qUser = query(collection(db, 'users'), where('email', '==', currentUser.email));
      const userSnap = await getDocs(qUser);
      if (!userSnap.empty) {
        const userData = userSnap.docs[0].data();
        if (userData.results && Array.isArray(userData.results)) {
          const excelResults = userData.results.map((r: any, i: number) => ({
            id: `excel-${i}`,
            subject: r.subject,
            mark: r.mark,
            max: r.max,
            percentage: r.max ? Math.round((r.mark / r.max) * 100) : 0,
            topic: r.isAbsent ? 'Absent' : r.isPass ? 'Pass' : 'Fail'
          }));
          quizzes = [...excelResults, ...quizzes];
        }
      }
      
      setResults(quizzes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchResults(); }, []);
  const onRefresh = () => { setRefreshing(true); fetchResults(); };

  const avg = results.length > 0
    ? (results.reduce((a, r) => a + (r.percentage || 0), 0) / results.length).toFixed(1)
    : null;

  const renderItem = ({ item }: { item: QuizResult }) => {
    const pct = item.percentage ?? (item.max ? Math.round((item.mark || 0) / item.max * 100) : null);
    const color = pct === null ? '#64748B' : pct >= 75 ? '#10B981' : pct >= 50 ? '#F59E0B' : '#EF4444';

    return (
      <View style={styles.card}>
        <View style={[styles.scoreCircle, { borderColor: color }]}>
          <Text style={[styles.scoreText, { color }]}>{pct !== null ? `${pct}%` : '—'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.topic} numberOfLines={1}>{item.topic || item.subject || 'Quiz'}</Text>
          {item.mark !== undefined && item.max !== undefined && (
            <Text style={styles.marks}>{item.mark}/{item.max} marks</Text>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.badgeText, { color }]}>
            {pct !== null ? (pct >= 75 ? 'Good' : pct >= 50 ? 'OK' : 'Needs Work') : 'N/A'}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22D3EE" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Results</Text>
        {avg && <Text style={styles.avgText}>Avg: {avg}%</Text>}
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22D3EE" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="trophy-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>No subject marks or quizzes found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#F1F5F9' },
  avgText: { fontSize: 14, color: '#22D3EE', fontWeight: '600' },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  scoreCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: { fontSize: 13, fontWeight: '700' },
  info: { flex: 1 },
  topic: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  marks: { color: '#64748B', fontSize: 12, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: '#334155', fontSize: 14 },
});
