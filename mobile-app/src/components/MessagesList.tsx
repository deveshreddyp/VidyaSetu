import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function MessagesList() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', currentUser.uid)
    );
    
    const unsubscribe = onSnapshot(q, (snap) => {
      const fetchedChats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      fetchedChats.sort((a, b) => (b.updatedAt?.toMillis() || 0) - (a.updatedAt?.toMillis() || 0));
      setChats(fetchedChats);
      setLoading(false);
    }, (error) => {
      console.error("Messages Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getChatName = (chat) => {
    if (chat.type === 'group') return chat.name || 'Class Group';
    const otherParticipantId = chat.participants.find(p => p !== currentUser?.uid);
    return chat.participantNames?.[otherParticipantId] || 'Unknown User';
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator color="#22D3EE" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
      </View>
      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No messages yet.</Text>}
        renderItem={({ item }) => {
          const name = getChatName(item);
          return (
            <TouchableOpacity 
              style={styles.card} 
              onPress={() => router.push({ pathname: `/chat/${item.id}`, params: { chatName: name, type: item.type } })}
            >
              <View style={[styles.avatar, item.type === 'group' ? styles.avatarGroup : styles.avatarDirect]}>
                <Text style={styles.avatarText}>{getInitials(name)}</Text>
              </View>
              <View style={styles.content}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 56, borderBottomWidth: 1, borderColor: '#1E293B' },
  title: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#F1F5F9' },
  emptyText: { color: '#64748B', textAlign: 'center', marginTop: 40, fontFamily: 'Outfit_400Regular' },
  card: { flexDirection: 'row', padding: 16, borderBottomWidth: 1, borderBottomColor: '#1E293B', alignItems: 'center' },
  avatar: { width: 50, height: 50, rounded: 25, justifyContent: 'center', alignItems: 'center', borderRadius: 25 },
  avatarGroup: { backgroundColor: '#4F46E544' },
  avatarDirect: { backgroundColor: '#334155' },
  avatarText: { color: '#F1F5F9', fontFamily: 'Outfit_700Bold', fontSize: 16 },
  content: { flex: 1, marginLeft: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 },
  name: { fontSize: 16, fontFamily: 'Outfit_600SemiBold', color: '#F1F5F9', flex: 1, marginRight: 8 },
  time: { fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#64748B' },
  lastMessage: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#94A3B8' }
});
