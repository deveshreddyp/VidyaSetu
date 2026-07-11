import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function PostResourceScreen() {
  const { currentUser } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);

  const postResource = async () => {
    if (!title.trim() || !link.trim()) {
      Alert.alert('Required Fields', 'Please provide at least a Title and a Link.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'materials'), {
        title: title.trim(),
        description: description.trim(),
        url: link.trim(),
        uploadedBy: currentUser?.email,
        uploadedAt: serverTimestamp(),
      });
      
      Alert.alert('Success', 'Resource posted successfully!');
      setTitle('');
      setDescription('');
      setLink('');
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Post Study Material</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Resource Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Chapter 4 Data Structures Notes"
            placeholderTextColor="#64748B"
            value={title}
            onChangeText={setTitle}
          />

          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Briefly describe what this resource covers..."
            placeholderTextColor="#64748B"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
          />

          <Text style={styles.label}>Link (URL) *</Text>
          <TextInput
            style={styles.input}
            placeholder="https://drive.google.com/..."
            placeholderTextColor="#64748B"
            value={link}
            onChangeText={setLink}
            autoCapitalize="none"
            keyboardType="url"
          />

          <TouchableOpacity 
            style={[styles.postBtn, loading && { opacity: 0.7 }]} 
            onPress={postResource}
            disabled={loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
            <Text style={styles.btnText}>{loading ? 'Posting...' : 'Post Resource'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 56, borderBottomWidth: 1, borderColor: '#1E293B' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#F1F5F9' },
  content: { padding: 20 },
  card: { backgroundColor: '#1E293B', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  label: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#F1F5F9',
    fontSize: 15,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top'
  },
  postBtn: {
    flexDirection: 'row',
    backgroundColor: '#6C63FF',
    padding: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 32,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
