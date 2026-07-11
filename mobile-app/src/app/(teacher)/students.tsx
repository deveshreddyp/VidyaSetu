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
  Modal,
  ScrollView,
} from 'react-native';
import { collection, getDocs, query, where } from 'firebase/firestore';
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
  results?: Array<{
    subject: string;
    mark: number;
    max: number;
    pass: number;
    isPass: boolean;
    isAbsent: boolean;
  }>;
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
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const LEVELS = ['All', 'Level 5', 'Level 4', 'Level 3', 'Level 2', 'Ineligible for Placements'];

  const fetchStudents = async () => {
    try {
      const snap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
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
      <TouchableOpacity style={styles.card} onPress={() => setSelectedStudent(item)}>
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
      </TouchableOpacity>
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

      {/* Modal for Student Details & Results */}
      <Modal visible={!!selectedStudent} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedStudent(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedStudent?.name || 'Student Details'}</Text>
            <TouchableOpacity onPress={() => setSelectedStudent(null)} style={styles.modalClose}>
              <Ionicons name="close" size={24} color="#F1F5F9" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            {selectedStudent?.results && selectedStudent.results.length > 0 ? (
              <View>
                <Text style={styles.sectionTitle}>Subject Results</Text>
                {selectedStudent.results.map((r, i) => (
                  <View key={i} style={styles.resultCard}>
                    <View style={styles.resultHeader}>
                      <Text style={styles.resultSubject}>{r.subject}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: r.isPass ? '#10B98122' : '#EF444422' }]}>
                        <Text style={[styles.statusText, { color: r.isPass ? '#10B981' : '#EF4444' }]}>
                          {r.isAbsent ? 'ABSENT' : r.isPass ? 'PASS' : 'FAIL'}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.resultMarksRow}>
                      <Text style={styles.resultMarksLabel}>Marks:</Text>
                      <Text style={styles.resultMarksValue}>{r.mark} / {r.max}</Text>
                    </View>
                    <View style={styles.resultMarksRow}>
                      <Text style={styles.resultMarksLabel}>Pass Req:</Text>
                      <Text style={styles.resultMarksValue}>{r.pass}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyResults}>
                <Ionicons name="document-text-outline" size={48} color="#334155" />
                <Text style={styles.emptyText}>No subject results found for this student.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
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
  emptyText: { color: '#334155', fontSize: 14, textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#0F172A' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1E293B' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
  modalClose: { padding: 4 },
  modalContent: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#CBD5E1', marginBottom: 16 },
  resultCard: { backgroundColor: '#1E293B', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#334155' },
  resultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultSubject: { fontSize: 15, fontWeight: '600', color: '#F1F5F9', flex: 1, marginRight: 12 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '700' },
  resultMarksRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  resultMarksLabel: { fontSize: 13, color: '#64748B' },
  resultMarksValue: { fontSize: 14, fontWeight: '600', color: '#E2E8F0' },
  emptyResults: { alignItems: 'center', marginTop: 40, gap: 12 },
});
