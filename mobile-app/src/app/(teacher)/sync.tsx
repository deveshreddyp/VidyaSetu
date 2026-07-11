import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://vidyasetu-backend.vercel.app'; // Replace with prod URL

export default function SyncScreen() {
  const { currentUser } = useAuth();
  const [file, setFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel'
        ],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets.length > 0) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFile(result.assets[0]);
        setSyncLogs([`Selected: ${result.assets[0].name}`]);
      }
    } catch (err) {
      console.error(err);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to pick document' });
    }
  };

  const uploadFile = async () => {
    if (!file || !currentUser) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setSyncLogs(prev => [...prev, 'Starting upload...']);

    try {
      const formData = new FormData();
      
      // React Native FormData requires a specific object format for files
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      } as any);

      // Append auth
      const idToken = await currentUser.getIdToken();
      
      const response = await fetch(`${API_URL}/api/sync/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          // Don't set Content-Type header manually, fetch will set it with the boundary automatically
        },
        body: formData
      });

      const data = await response.json();
      
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Toast.show({ type: 'success', text1: 'Upload Successful!', text2: `Processed ${data.stats?.processedCount || 0} rows` });
        setSyncLogs(prev => [
          ...prev, 
          '✅ Upload Successful!', 
          `Processed: ${data.stats?.processedCount || 0} rows`,
          `Errors: ${data.stats?.errorCount || 0}`
        ]);
        setFile(null);
      } else {
        throw new Error(data.error || data.details || 'Upload failed');
      }

    } catch (error: any) {
      console.error('Upload Error:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Toast.show({ type: 'error', text1: 'Upload Failed', text2: error.message });
      setSyncLogs(prev => [...prev, `❌ Error: ${error.message}`]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Excel Data Sync</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Ionicons name="cloud-upload-outline" size={48} color="#6C63FF" />
          <Text style={styles.cardTitle}>Upload Student Marks</Text>
          <Text style={styles.cardSub}>Select an Excel file (.xlsx) from your device to sync student marks to the database.</Text>
          
          <TouchableOpacity style={styles.pickBtn} onPress={pickFile} disabled={loading}>
            <Ionicons name="document-attach-outline" size={20} color="#fff" />
            <Text style={styles.btnText}>{file ? 'Change File' : 'Select Excel File'}</Text>
          </TouchableOpacity>

          {file && (
            <View style={styles.fileInfo}>
              <Ionicons name="document-text" size={24} color="#10B981" />
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={1}>{file.name}</Text>
                <Text style={styles.fileSize}>{(file.size || 0) / 1000} KB</Text>
              </View>
            </View>
          )}

          {file && (
            <TouchableOpacity style={styles.uploadBtn} onPress={uploadFile} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sync" size={20} color="#fff" />
                  <Text style={styles.btnText}>Start Sync</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {syncLogs.length > 0 && (
          <View style={styles.logCard}>
            <Text style={styles.logTitle}>Sync Logs</Text>
            {syncLogs.map((log, i) => (
              <Text key={i} style={styles.logText}>{log}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 56, borderBottomWidth: 1, borderColor: '#1E293B' },
  title: { fontSize: 22, fontFamily: 'Outfit_700Bold', color: '#F1F5F9' },
  content: { padding: 20, gap: 20 },
  card: { backgroundColor: '#1E293B', padding: 24, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  cardTitle: { fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#F1F5F9', marginTop: 12 },
  cardSub: { fontSize: 14, fontFamily: 'Outfit_400Regular', color: '#94A3B8', textAlign: 'center', marginTop: 8, marginBottom: 20 },
  pickBtn: { flexDirection: 'row', backgroundColor: '#334155', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 8 },
  uploadBtn: { flexDirection: 'row', backgroundColor: '#6C63FF', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center', gap: 8, marginTop: 20, width: '100%', justifyContent: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontFamily: 'Outfit_600SemiBold' },
  fileInfo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', padding: 12, borderRadius: 8, width: '100%', marginTop: 20, gap: 12, borderWidth: 1, borderColor: '#334155' },
  fileName: { color: '#F1F5F9', fontSize: 14, fontFamily: 'Outfit_500Medium' },
  fileSize: { color: '#64748B', fontSize: 12, fontFamily: 'Outfit_400Regular' },
  logCard: { backgroundColor: '#000', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  logTitle: { color: '#22D3EE', fontSize: 14, fontFamily: 'Outfit_700Bold', marginBottom: 8 },
  logText: { color: '#10B981', fontSize: 13, fontFamily: 'monospace', marginVertical: 2 }
});
