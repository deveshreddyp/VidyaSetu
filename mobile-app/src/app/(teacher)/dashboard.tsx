import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { collection, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface StudentResult {
  subject: string;
  mark: number;
  max: number;
  isPass: boolean;
}

interface Student {
  id: string;
  name?: string;
  email: string;
  studentLevel?: string;
  coreEligibility?: string;
  cgpa?: number;
  section?: string;
  results?: StudentResult[];
}

const LEVEL_COLORS: Record<string, string> = {
  'Level 5': '#10B981',
  'Level 4': '#3B82F6',
  'Level 3': '#8B5CF6',
  'Level 2': '#F59E0B',
  'Ineligible for Placements': '#EF4444',
};

export default function TeacherDashboard() {
  const { currentUser } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [levelFilter, setLevelFilter] = useState('All');
  const [coreFilter, setCoreFilter] = useState('All');
  const [sectionFilter, setSectionFilter] = useState('All');
  
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

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

  useEffect(() => {
    fetchStudents();
    // Optional: Real-time listener
    const unsubscribe = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'student')),
      (snapshot) => {
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Student));
        setStudents(data);
      }
    );
    return () => unsubscribe();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStudents();
  };

  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    students.forEach(s => {
      if (s.results) s.results.forEach(r => subjects.add(r.subject));
    });
    return Array.from(subjects).sort();
  }, [students]);

  const availableSections = useMemo(() => {
    const sections = new Set<string>();
    students.forEach(s => {
      if (s.section) sections.add(s.section);
    });
    return Array.from(sections).sort();
  }, [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const searchLower = search.toLowerCase();
      const matchesSearch = student.email.toLowerCase().includes(searchLower) || 
                            (student.name && student.name.toLowerCase().includes(searchLower));
      const matchesSection = sectionFilter === 'All' || student.section === sectionFilter;
      const matchesLevel = levelFilter === 'All' || student.studentLevel === levelFilter;
      const matchesCore = coreFilter === 'All' || student.coreEligibility === coreFilter;

      let matchesStatus = true;
      const results = student.results || [];

      if (subjectFilter !== 'All') {
        const subjResult = results.find(r => r.subject === subjectFilter);
        if (!subjResult) {
           matchesStatus = false;
        } else {
           if (statusFilter === 'Passed') matchesStatus = subjResult.isPass;
           if (statusFilter === 'Failed') matchesStatus = !subjResult.isPass;
        }
      } else {
        const totalMarks = results.reduce((sum, res) => sum + (typeof res.mark === 'number' ? res.mark : 0), 0);
        const totalMax = results.reduce((sum, res) => sum + res.max, 0);
        const percent = totalMax > 0 ? (totalMarks / totalMax) * 100 : 0;
        const isOverallPass = percent >= 50 && !results.some(r => !r.isPass);
        
        if (statusFilter === 'Passed') matchesStatus = results.length > 0 && isOverallPass;
        if (statusFilter === 'Failed') matchesStatus = results.length > 0 && !isOverallPass;
      }

      return matchesSearch && matchesSection && matchesLevel && matchesCore && matchesStatus;
    });
  }, [students, search, sectionFilter, subjectFilter, statusFilter, levelFilter, coreFilter]);

  const teacherName = currentUser?.email?.split('@')[0] || 'Teacher';

  const FilterPill = ({ label, value, options, onSelect }: { label: string, value: string, options: string[], onSelect: (val: string) => void }) => (
    <View style={styles.filterSection}>
      <Text style={styles.filterSectionTitle}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 20 }}>
        {['All', ...options].map(opt => (
          <TouchableOpacity 
            key={opt}
            onPress={() => onSelect(opt)}
            style={[styles.filterPill, value === opt && styles.filterPillActive]}
          >
            <Text style={[styles.filterPillText, value === opt && styles.filterPillTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Fixed Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.greeting}>Hello, {teacherName}</Text>
            <Text style={styles.subGreeting}>Manage your classroom</Text>
          </View>
          <Image source={require('../../../assets/logo.jpeg')} style={styles.headerLogo} resizeMode="contain" />
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search students..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={20} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>
          
          <TouchableOpacity 
            style={[styles.filterButton, (subjectFilter !== 'All' || statusFilter !== 'All' || levelFilter !== 'All' || coreFilter !== 'All' || sectionFilter !== 'All') && styles.filterButtonActive]}
            onPress={() => setIsFilterModalOpen(true)}
          >
            <Ionicons name="options" size={24} color={(subjectFilter !== 'All' || statusFilter !== 'All' || levelFilter !== 'All' || coreFilter !== 'All' || sectionFilter !== 'All') ? '#fff' : '#64748B'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6C63FF" />}
      >
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Students List</Text>
          <Text style={styles.listCount}>{filteredStudents.length} Results</Text>
        </View>

        {filteredStudents.map((s) => {
          const color = LEVEL_COLORS[s.studentLevel || ''] || '#64748B';
          
          let displayScore = 'N/A';
          let isPassed = false;
          let hasData = false;

          const results = s.results || [];
          if (subjectFilter !== 'All') {
            const subjResult = results.find(r => r.subject === subjectFilter);
            if (subjResult) {
              hasData = true;
              displayScore = `${Math.round((subjResult.mark / subjResult.max) * 100)}%`;
              isPassed = subjResult.isPass;
            }
          } else {
            if (results.length > 0) {
              hasData = true;
              const totalMarks = results.reduce((sum, res) => sum + (typeof res.mark === 'number' ? res.mark : 0), 0);
              const totalMax = results.reduce((sum, res) => sum + res.max, 0);
              displayScore = totalMax > 0 ? `${((totalMarks / totalMax) * 100).toFixed(1)}%` : '0%';
              isPassed = !results.some(r => !r.isPass);
            }
          }

          return (
            <View key={s.id} style={styles.studentCard}>
              <View style={styles.studentCardHeader}>
                <View style={styles.studentMeta}>
                  <View style={[styles.avatar, { backgroundColor: color + '33' }]}>
                    <Text style={[styles.avatarText, { color }]}>
                      {(s.name || s.email || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName} numberOfLines={1}>{s.name || s.email.split('@')[0]}</Text>
                    <Text style={styles.studentEmail} numberOfLines={1}>{s.email}</Text>
                  </View>
                </View>
                {hasData ? (
                  <View style={[styles.statusBadge, { backgroundColor: isPassed ? '#10B98122' : '#EF444422' }]}>
                    <Text style={[styles.statusBadgeText, { color: isPassed ? '#10B981' : '#EF4444' }]}>
                      {isPassed ? 'Passed' : 'Failed'}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, { backgroundColor: '#334155' }]}>
                    <Text style={[styles.statusBadgeText, { color: '#94A3B8' }]}>No Data</Text>
                  </View>
                )}
              </View>

              <View style={styles.studentCardBody}>
                <View style={styles.dataCol}>
                  <Text style={styles.dataLabel}>{subjectFilter === 'All' ? 'Avg. Score' : 'Score'}</Text>
                  <Text style={styles.dataValue}>{displayScore}</Text>
                </View>
                <View style={styles.dataCol}>
                  <Text style={styles.dataLabel}>Section</Text>
                  <Text style={styles.dataValue}>{s.section || 'N/A'}</Text>
                </View>
                <View style={styles.dataCol}>
                  <Text style={styles.dataLabel}>Level</Text>
                  <View style={[styles.levelMiniBadge, { backgroundColor: color + '22' }]}>
                    <Text style={[styles.levelMiniBadgeText, { color }]}>{(s.studentLevel || 'N/A').replace('Level ', 'L')}</Text>
                  </View>
                </View>
              </View>
            </View>
          );
        })}

        {filteredStudents.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={48} color="#334155" />
            <Text style={styles.emptyText}>No students match the current filters.</Text>
          </View>
        )}
        
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Filter Bottom Sheet Modal */}
      <Modal visible={isFilterModalOpen} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Students</Text>
              <TouchableOpacity onPress={() => setIsFilterModalOpen(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <FilterPill 
                label="Section" 
                value={sectionFilter} 
                options={availableSections} 
                onSelect={setSectionFilter} 
              />
              <FilterPill 
                label="Subject" 
                value={subjectFilter} 
                options={availableSubjects} 
                onSelect={setSubjectFilter} 
              />
              <FilterPill 
                label="Performance Status" 
                value={statusFilter} 
                options={['Passed', 'Failed']} 
                onSelect={setStatusFilter} 
              />
              <FilterPill 
                label="Placement Level" 
                value={levelFilter} 
                options={['Level 5', 'Level 4', 'Level 3', 'Level 2', 'Ineligible for Placements']} 
                onSelect={setLevelFilter} 
              />
              <FilterPill 
                label="Core Eligibility" 
                value={coreFilter} 
                options={['Eligible', 'Not Eligible']} 
                onSelect={setCoreFilter} 
              />
              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity 
                style={styles.resetBtn}
                onPress={() => {
                  setSectionFilter('All');
                  setSubjectFilter('All');
                  setStatusFilter('All');
                  setLevelFilter('All');
                  setCoreFilter('All');
                }}
              >
                <Text style={styles.resetBtnText}>Reset All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={() => setIsFilterModalOpen(false)}>
                <Text style={styles.applyBtnText}>View {filteredStudents.length} Results</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', gap: 12 },
  loadingText: { color: '#94A3B8', fontSize: 14, fontFamily: 'Outfit_400Regular' },
  
  header: {
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#1E293B',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: { fontSize: 24, fontFamily: 'Outfit_700Bold', color: '#F1F5F9' },
  subGreeting: { fontSize: 14, color: '#94A3B8', fontFamily: 'Outfit_400Regular', marginTop: 2 },
  headerLogo: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#fff' },
  
  searchRow: {
    flexDirection: 'row',
    gap: 12,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: '#334155',
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: '#F1F5F9',
    fontFamily: 'Outfit_400Regular',
    fontSize: 15,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: '#0F172A',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  filterButtonActive: {
    backgroundColor: '#6C63FF',
    borderColor: '#6C63FF',
  },

  listContainer: { flex: 1 },
  listContent: { padding: 20 },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  listTitle: { color: '#F1F5F9', fontSize: 18, fontFamily: 'Outfit_600SemiBold' },
  listCount: { color: '#94A3B8', fontSize: 14, fontFamily: 'Outfit_400Regular' },

  studentCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  studentCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  studentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 18, fontFamily: 'Outfit_700Bold' },
  studentInfo: { flex: 1 },
  studentName: { color: '#F1F5F9', fontSize: 16, fontFamily: 'Outfit_600SemiBold', marginBottom: 2 },
  studentEmail: { color: '#94A3B8', fontSize: 12, fontFamily: 'Outfit_400Regular' },
  
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 12, fontFamily: 'Outfit_600SemiBold' },

  studentCardBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#0F172A',
    borderRadius: 12,
    padding: 12,
  },
  dataCol: { flex: 1, alignItems: 'center' },
  dataLabel: { color: '#64748B', fontSize: 11, fontFamily: 'Outfit_500Medium', marginBottom: 4, textTransform: 'uppercase' },
  dataValue: { color: '#F1F5F9', fontSize: 15, fontFamily: 'Outfit_700Bold' },
  
  levelMiniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  levelMiniBadgeText: { fontSize: 12, fontFamily: 'Outfit_700Bold' },

  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#64748B',
    fontFamily: 'Outfit_500Medium',
    marginTop: 12,
    fontSize: 15,
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  modalTitle: { color: '#F1F5F9', fontSize: 18, fontFamily: 'Outfit_700Bold' },
  closeBtn: { padding: 4 },
  modalScroll: { padding: 20 },
  
  filterSection: { marginBottom: 24 },
  filterSectionTitle: { color: '#94A3B8', fontSize: 13, fontFamily: 'Outfit_600SemiBold', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#6C63FF22',
    borderColor: '#6C63FF',
  },
  filterPillText: {
    color: '#94A3B8',
    fontFamily: 'Outfit_500Medium',
    fontSize: 14,
  },
  filterPillTextActive: {
    color: '#6C63FF',
    fontFamily: 'Outfit_700Bold',
  },

  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#334155',
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#1E293B',
  },
  resetBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
  },
  resetBtnText: { color: '#F1F5F9', fontFamily: 'Outfit_600SemiBold', fontSize: 16 },
  applyBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#6C63FF',
  },
  applyBtnText: { color: '#FFF', fontFamily: 'Outfit_700Bold', fontSize: 16 },
});
