import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, Modal, ScrollView } from 'react-native';
import { collection, getDocs, doc, setDoc, query, orderBy } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface Quiz {
  id: string;
  topic: string;
  subject: string;
  questions: any[];
}

export default function QuizzesScreen() {
  const { currentUser } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const q = query(collection(db, 'quizzes'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setQuizzes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Quiz)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const startQuiz = (quiz: Quiz) => {
    if (!quiz.questions || quiz.questions.length === 0) {
      Alert.alert('Error', 'This quiz has no questions.');
      return;
    }
    setActiveQuiz(quiz);
    setCurrentQIndex(0);
    setScore(0);
  };

  const answerQuestion = (isCorrect: boolean) => {
    if (isCorrect) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScore(s => s + 1);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    
    if (currentQIndex + 1 < activeQuiz!.questions.length) {
      setCurrentQIndex(i => i + 1);
    } else {
      finishQuiz(isCorrect ? score + 1 : score);
    }
  };

  const finishQuiz = async (finalScore: number) => {
    const percentage = Math.round((finalScore / activeQuiz!.questions.length) * 100);
    try {
      const resultId = `${currentUser?.uid}_${activeQuiz!.id}_${Date.now()}`;
      await setDoc(doc(db, 'quizResults', resultId), {
        studentEmail: currentUser?.email,
        quizId: activeQuiz!.id,
        topic: activeQuiz!.topic,
        subject: activeQuiz!.subject,
        mark: finalScore,
        max: activeQuiz!.questions.length,
        percentage,
        timestamp: Date.now()
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Quiz Finished!', `You scored ${finalScore}/${activeQuiz!.questions.length} (${percentage}%)`);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save quiz results.');
    }
    setActiveQuiz(null);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator color="#22D3EE" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Available Quizzes</Text>
      </View>
      <FlatList
        data={quizzes}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => startQuiz(item)}>
            <View style={styles.cardIcon}>
              <Ionicons name="help-circle" size={24} color="#38BDF8" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTopic}>{item.topic}</Text>
              <Text style={styles.cardSub}>{item.subject} • {item.questions?.length || 0} Qs</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#64748B" />
          </TouchableOpacity>
        )}
      />

      <Modal visible={!!activeQuiz} animationType="slide">
        <View style={styles.modalContainer}>
          {activeQuiz && activeQuiz.questions[currentQIndex] && (
            <>
              <View style={styles.modalHeader}>
                <Text style={styles.modalProgress}>Question {currentQIndex + 1} of {activeQuiz.questions.length}</Text>
                <TouchableOpacity onPress={() => setActiveQuiz(null)}>
                  <Text style={{ color: '#EF4444', fontWeight: 'bold' }}>Quit</Text>
                </TouchableOpacity>
              </View>
              <ScrollView contentContainerStyle={styles.quizContent}>
                <Text style={styles.questionText}>{activeQuiz.questions[currentQIndex].question}</Text>
                {activeQuiz.questions[currentQIndex].options.map((opt: string, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.optionBtn}
                    onPress={() => answerQuestion(opt === activeQuiz.questions[currentQIndex].answer)}
                  >
                    <Text style={styles.optionText}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  header: { padding: 20, paddingTop: 56, borderBottomWidth: 1, borderColor: '#1E293B' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#F1F5F9' },
  card: { flexDirection: 'row', backgroundColor: '#1E293B', padding: 16, borderRadius: 12, alignItems: 'center', gap: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#38BDF822', justifyContent: 'center', alignItems: 'center' },
  cardTopic: { fontSize: 16, fontWeight: 'bold', color: '#F1F5F9' },
  cardSub: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  modalContainer: { flex: 1, backgroundColor: '#0F172A', paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderColor: '#1E293B' },
  modalProgress: { color: '#F1F5F9', fontWeight: 'bold' },
  quizContent: { padding: 20, gap: 16 },
  questionText: { fontSize: 18, color: '#F1F5F9', fontWeight: 'bold', marginBottom: 20 },
  optionBtn: { backgroundColor: '#1E293B', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  optionText: { color: '#E2E8F0', fontSize: 16 }
});
