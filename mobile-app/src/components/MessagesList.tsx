import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
} from 'react-native';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';

interface Chat {
  id: string;
  type?: string;
  name?: string;
  participants?: string[];
  participantNames?: Record<string, string>;
  updatedAt?: { toMillis: () => number };
  lastMessage?: string;
  targetSection?: string;
}

interface UserResult {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export default function MessagesList() {
  const { currentUser, userData } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);

  // New Chat modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const slideAnim = useRef(new Animated.Value(400)).current;

  // Real-time chat listener
  useEffect(() => {
    if (!currentUser) return;

    const chatsMap = new Map();

    const updateChats = () => {
      const fetched = Array.from(chatsMap.values());
      fetched.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      setChats(fetched);
      setLoading(false);
    };

    const q1 = query(collection(db, 'chats'), where('participants', 'array-contains', currentUser.uid));
    const unsub1 = onSnapshot(q1, (snap) => {
      snap.docs.forEach(d => chatsMap.set(d.id, { id: d.id, ...d.data() }));
      updateChats();
    }, (err) => { console.error('Messages Error 1:', err); setLoading(false); });

    let unsub2 = () => {};
    if (userData?.section) {
      const q2 = query(collection(db, 'chats'), where('targetSection', 'in', [userData.section, 'All']));
      unsub2 = onSnapshot(q2, (snap) => {
        snap.docs.forEach(d => chatsMap.set(d.id, { id: d.id, ...d.data() }));
        updateChats();
      }, (err) => console.error('Messages Error 2:', err));
    }

    return () => { unsub1(); unsub2(); };
  }, [currentUser, userData?.section]);

  // Modal open / close animations
  const openModal = () => {
    setModalVisible(true);
    setSearchEmail('');
    setSearchResults([]);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const closeModal = () => {
    Animated.timing(slideAnim, { toValue: 400, duration: 220, useNativeDriver: true }).start(() => {
      setModalVisible(false);
      setSearchEmail('');
      setSearchResults([]);
    });
  };

  // Search users by email
  const handleSearch = async () => {
    if (!searchEmail.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const q = query(
        collection(db, 'users'),
        where('email', '==', searchEmail.trim().toLowerCase())
      );
      const snap = await getDocs(q);
      const found: UserResult[] = [];
      snap.forEach(d => {
        if (d.id !== currentUser?.uid) {
          found.push({ id: d.id, ...d.data() } as UserResult);
        }
      });
      setSearchResults(found);
      if (found.length === 0) {
        Toast.show({ type: 'info', text1: 'No user found', text2: 'Check the email and try again.' });
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Search failed', text2: 'Please try again.' });
    } finally {
      setSearching(false);
    }
  };

  // Start or open DM using deterministic chat ID
  const startDirectChat = async (otherUser: UserResult) => {
    if (!currentUser) return;
    setCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      // Deterministic ID — same approach as web to prevent duplicate chat docs
      const sortedIds = [currentUser.uid, otherUser.id].sort();
      const chatId = sortedIds.join('_');

      const existingDoc = await getDoc(doc(db, 'chats', chatId));

      if (!existingDoc.exists()) {
        const myDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const myName = myDoc.exists() ? (myDoc.data().name || currentUser.email) : currentUser.email;

        const chatData = {
          type: 'direct',
          participants: sortedIds,
          participantNames: {
            [currentUser.uid]: myName,
            [otherUser.id]: otherUser.name || otherUser.email,
          },
          updatedAt: serverTimestamp(),
          lastMessage: 'Chat started',
        };
        await setDoc(doc(db, 'chats', chatId), chatData);
      }

      closeModal();
      const chatName = otherUser.name || otherUser.email?.split('@')[0] || 'Chat';
      setTimeout(() => {
        router.push({ pathname: `/chat/${chatId}`, params: { chatName, type: 'direct' } });
      }, 250);
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Could not start chat', text2: 'Please try again.' });
    } finally {
      setCreating(false);
    }
  };

  const getChatName = (chat: Chat) => {
    if (chat.type === 'group') return chat.name || 'Class Group';
    const otherId = chat.participants?.find((p: string) => p !== currentUser?.uid);
    return otherId ? (chat.participantNames?.[otherId] || 'Unknown User') : 'Unknown User';
  };

  const getInitials = (name = '') =>
    name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '??';

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#22D3EE" size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity style={styles.newChatBtn} onPress={openModal} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={22} color="#22D3EE" />
        </TouchableOpacity>
      </View>

      {/* Chat list */}
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        contentContainerStyle={chats.length === 0 ? styles.emptyContainer : { paddingVertical: 8 }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="chatbubbles-outline" size={56} color="#1E293B" />
            <Text style={styles.emptyTitle}>No messages yet</Text>
            <Text style={styles.emptySubtitle}>Tap the edit icon above to start a new chat</Text>
          </View>
        }
        renderItem={({ item }) => {
          const name = getChatName(item);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push({ pathname: `/chat/${item.id}`, params: { chatName: name, type: item.type } })}
              activeOpacity={0.7}
            >
              <View style={[styles.avatar, item.type === 'group' ? styles.avatarGroup : styles.avatarDirect]}>
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.row}>
                  <Text style={styles.name} numberOfLines={1}>{name}</Text>
                  {item.updatedAt && (
                    <Text style={styles.time}>
                      {new Date(item.updatedAt.toMillis()).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  )}
                </View>
                <Text style={styles.lastMessage} numberOfLines={1}>
                  {item.lastMessage || 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {/* New Chat Modal — animated bottom sheet */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
        <Pressable style={styles.overlay} onPress={closeModal}>
          <Pressable onPress={() => {}} style={{ width: '100%' }}>
            <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
              <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
                <View style={styles.sheetHandle} />

                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetTitle}>New Message</Text>
                  <TouchableOpacity onPress={closeModal} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="close" size={24} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <View style={styles.searchRow}>
                  <View style={styles.searchInputWrap}>
                    <Ionicons name="mail-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <TextInput
                      style={styles.searchInput}
                      placeholder="Enter student's email address"
                      placeholderTextColor="#475569"
                      value={searchEmail}
                      onChangeText={setSearchEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                      onSubmitEditing={handleSearch}
                    />
                    {searchEmail.length > 0 && (
                      <TouchableOpacity onPress={() => { setSearchEmail(''); setSearchResults([]); }}>
                        <Ionicons name="close-circle" size={18} color="#475569" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.searchBtn, searching && styles.searchBtnDisabled]}
                    onPress={handleSearch}
                    disabled={searching}
                    activeOpacity={0.8}
                  >
                    {searching
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Ionicons name="search" size={18} color="#fff" />
                    }
                  </TouchableOpacity>
                </View>

                {searchResults.map(user => (
                  <TouchableOpacity
                    key={user.id}
                    style={styles.resultCard}
                    onPress={() => startDirectChat(user)}
                    disabled={creating}
                    activeOpacity={0.75}
                  >
                    <View style={styles.resultAvatar}>
                      <Text style={styles.resultAvatarText}>
                        {getInitials(user.name || user.email || '')}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resultName}>{user.name || user.email?.split('@')[0]}</Text>
                      <Text style={styles.resultEmail}>{user.email}</Text>
                      <Text style={styles.resultRole}>{user.role || 'Student'}</Text>
                    </View>
                    {creating
                      ? <ActivityIndicator color="#22D3EE" size="small" />
                      : <Ionicons name="arrow-forward-circle" size={26} color="#22D3EE" />
                    }
                  </TouchableOpacity>
                ))}

                <View style={{ height: Platform.OS === 'ios' ? 32 : 20 }} />
              </KeyboardAvoidingView>
            </Animated.View>
          </Pressable>
        </Pressable>
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
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  title: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#F1F5F9' },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#22D3EE18',
    borderWidth: 1,
    borderColor: '#22D3EE33',
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontFamily: 'Outfit_600SemiBold', color: '#334155', marginTop: 16 },
  emptySubtitle: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: '#475569', marginTop: 6, textAlign: 'center', paddingHorizontal: 40 },

  card: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    alignItems: 'center',
  },
  avatar: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  avatarGroup: { backgroundColor: '#4F46E533', borderWidth: 1, borderColor: '#4F46E555' },
  avatarDirect: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  avatarText: { color: '#F1F5F9', fontFamily: 'Outfit_700Bold', fontSize: 16 },
  cardContent: { flex: 1, marginLeft: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 3 },
  name: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#F1F5F9', flex: 1, marginRight: 8 },
  time: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: '#64748B' },
  lastMessage: { fontSize: 13, fontFamily: 'Outfit_400Regular', color: '#64748B' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1E293B',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: '#334155',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sheetTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#F1F5F9' },

  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  searchInput: {
    flex: 1,
    color: '#F1F5F9',
    fontFamily: 'Outfit_400Regular',
    fontSize: 14,
  },
  searchBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#22D3EE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnDisabled: { opacity: 0.6 },

  resultCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22D3EE22',
    borderWidth: 1,
    borderColor: '#22D3EE44',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultAvatarText: { color: '#22D3EE', fontFamily: 'Outfit_700Bold', fontSize: 15 },
  resultName: { fontSize: 15, fontFamily: 'Outfit_600SemiBold', color: '#F1F5F9' },
  resultEmail: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#64748B', marginTop: 1 },
  resultRole: { fontSize: 11, fontFamily: 'Outfit_400Regular', color: '#22D3EE', marginTop: 2, textTransform: 'capitalize' },
});
