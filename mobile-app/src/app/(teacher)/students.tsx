import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

interface Student {
  id: string;
  name?: string;
  email?: string;
  usn?: string;
  studentLevel?: string;
  cgpa?: number;
  section?: string;
  backlogs?: number;
}

const LEVEL_COLORS: Record<string, string> = {
  'Level 5': '#10B981',
  'Level 4': '#3B82F6',
  'Level 3': '#8B5CF6',
  'Level 2': '#F59E0B',
  'Ineligible for Placements': '#EF4444',
};

export default function StudentsScreen() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filtered, setFiltered] = useState<Student[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [levelFilter, setLevelFilter] = useState('All');

  const LEVELS = ['All', 'Level 5', 'Level 4', 'Level 3', 'Level 2', 'Ineligible for Placements'];

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(collection(db, 'students'));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
      setStudents(data);
      setFiltered(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchStudents(); }, []);

  useEffect(() => {
    let result = students;
    if (levelFilter !== 'All') {
      result = result.filter((s) => s.studentLevel === levelFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.usn?.toLowerCase().includes(q) ||
          s.email?.toLowerCase().includes(q)
      );
    }
    setFiltered(result);
  }, [search, levelFilter, students]);

  const onRefresh = () => { setRefreshing(true); fetchStudents(); };

  const renderItem = ({ item }: { item: Student }) => {
    const color = LEVEL_COLORS[item.studentLevel || ''] || '#64748B';
    return (
      <View style={styles.card}>
        <View style={[styles.avatar, { backgroundColor: color + '22' }]}>
          <Text style={[styles.avatarText, { color }]}>
            {(item.name || item.email || '?')[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name || item.email || 'Unknown'}</Text>
          <Text style={styles.usn}>{item.usn || item.email || '—'}</Text>
          <Text style={styles.section}>Section: {item.section || '—'}</Text>
        </View>
        <View style={styles.right}>
          <View style={[styles.badge, { backgroundColor: color + '22' }]}>
            <Text style={[styles.badgeText, { color }]}>
              {(item.studentLevel || 'N/A').replace('Level ', 'L')}
            </Text>
          </View>
          {item.cgpa !== undefined && (
            <Text style={styles.cgpa}>CGPA: {item.cgpa}</Text>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>My Students</Text>
        <Text style={styles.count}>{filtered.length} students</Text>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color="#64748B" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, USN, email..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Level filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={LEVELS}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.chips}
        renderItem={({ item: lv }) => {
          const active = levelFilter === lv;
          const color = LEVEL_COLORS[lv] || '#6C63FF';
          return (
            <TouchableOpacity
              onPress={() => setLevelFilter(lv)}
              style={[
                styles.chip,
                active ? { backgroundColor: color } : { borderColor: color + '66' },
              ]}
            >
              <Text style={[styles.chipText, { color: active ? '#fff' : color }]}>
                {lv === 'All' ? 'All' : lv.replace('Level ', 'L')}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={{ maxHeight: 44 }}
      />

      {/* Student list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="people-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>No students found</Text>
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
  count: { fontSize: 13, color: '#64748B' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    marginHorizontal: 20,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: '#F1F5F9', fontSize: 14 },
  chips: { paddingHorizontal: 20, gap: 8, paddingBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chipText: { fontSize: 12, fontWeight: '600' },
  list: { padding: 20, gap: 12 },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  info: { flex: 1 },
  name: { color: '#E2E8F0', fontSize: 14, fontWeight: '600' },
  usn: { color: '#64748B', fontSize: 12, marginTop: 2 },
  section: { color: '#64748B', fontSize: 12 },
  right: { alignItems: 'flex-end', gap: 4 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cgpa: { color: '#64748B', fontSize: 11 },
  empty: { alignItems: 'center', marginTop: 80, gap: 12 },
  emptyText: { color: '#334155', fontSize: 14 },
});
