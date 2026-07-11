import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://vidyasetu-backend.vercel.app'; // Update with prod URL

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function PathfinderScreen() {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I am Pathfinder, your AI tutor. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [studentContext, setStudentContext] = useState<any>(null);

  useEffect(() => {
    // Fetch student context to send to AI
    const fetchContext = async () => {
      if (!currentUser) return;
      const snap = await getDoc(doc(db, 'users', currentUser.uid));
      if (snap.exists()) {
        setStudentContext(snap.data());
      }
    };
    fetchContext();
  }, [currentUser]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/pathfinder/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: newMessages.slice(0, -1),
          studentContext
        })
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      console.error('Chat error:', e);
      setMessages([...newMessages, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setLoading(false);
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={styles.header}>
        <Ionicons name="sparkles" size={24} color="#22D3EE" />
        <Text style={styles.title}>Pathfinder AI</Text>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.chatArea} 
        contentContainerStyle={styles.chatContent}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg, index) => (
          <View key={index} style={[styles.bubbleWrapper, msg.role === 'user' ? styles.bubbleUser : styles.bubbleBot]}>
            <View style={[styles.bubble, msg.role === 'user' ? styles.bubbleUserInner : styles.bubbleBotInner]}>
              <Text style={[styles.bubbleText, msg.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextBot]}>
                {msg.content}
              </Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={[styles.bubbleWrapper, styles.bubbleBot]}>
            <View style={[styles.bubble, styles.bubbleBotInner, { paddingHorizontal: 20 }]}>
              <ActivityIndicator size="small" color="#22D3EE" />
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.inputArea}>
        <TextInput
          style={styles.input}
          placeholder="Ask me about your subjects..."
          placeholderTextColor="#64748B"
          value={input}
          onChangeText={setInput}
          multiline
        />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={loading || !input.trim()}>
          <Ionicons name="send" size={20} color={input.trim() && !loading ? "#fff" : "#94A3B8"} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
    gap: 12
  },
  title: { fontSize: 20, fontWeight: '700', color: '#F1F5F9' },
  chatArea: { flex: 1 },
  chatContent: { padding: 16, gap: 16 },
  bubbleWrapper: { flexDirection: 'row', marginVertical: 4 },
  bubbleUser: { justifyContent: 'flex-end' },
  bubbleBot: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '80%', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20 },
  bubbleUserInner: { backgroundColor: '#22D3EE', borderBottomRightRadius: 4 },
  bubbleBotInner: { backgroundColor: '#1E293B', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#334155' },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  bubbleTextUser: { color: '#0F172A', fontWeight: '500' },
  bubbleTextBot: { color: '#E2E8F0' },
  inputArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 12,
    backgroundColor: '#1E293B',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    gap: 12
  },
  input: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    color: '#F1F5F9',
    fontSize: 15,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#334155'
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#38BDF8',
    justifyContent: 'center',
    alignItems: 'center',
  }
});
