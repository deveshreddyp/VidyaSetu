import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, Platform, KeyboardAvoidingView, Text, TouchableOpacity } from 'react-native';
import { GiftedChat, Bubble, Send, InputToolbar, IMessage, BubbleProps, SendProps, InputToolbarProps } from 'react-native-gifted-chat';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function ChatRoomScreen() {
  const { id: rawId, chatName, type } = useLocalSearchParams();
  // useLocalSearchParams returns string | string[] — coerce to string
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const { currentUser } = useAuth();
  const router = useRouter();
  const [messages, setMessages] = useState<IMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !currentUser) return;
    const q = query(
      collection(db, 'chats', id, 'messages'),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snap) => {
      const parsedMessages: IMessage[] = snap.docs.map(d => {
        const data = d.data();
        return {
          _id: d.id,
          text: data.text ?? '',
          createdAt: data.timestamp ? data.timestamp.toDate() : new Date(),
          user: {
            _id: data.senderId as string,
            name: data.senderName as string,
          },
        };
      });
      setMessages(parsedMessages);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [id, currentUser]);

  const onSend = useCallback(async (newMessages: IMessage[] = []) => {
    if (!id || !currentUser || newMessages.length === 0) return;
    const { text, user } = newMessages[0];
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    try {
      await addDoc(collection(db, 'chats', id, 'messages'), {
        text,
        senderId: user._id,
        senderName: user.name,
        timestamp: serverTimestamp()
      });

      await updateDoc(doc(db, 'chats', id), {
        lastMessage: text,
        updatedAt: serverTimestamp()
      });

      // Fetch chat to get participants
      const chatDoc = await getDoc(doc(db, 'chats', id));
      if (chatDoc.exists()) {
        const chatData = chatDoc.data();
        const otherParticipantIds = (chatData.participants as string[]).filter((p: string) => p !== currentUser.uid);
        
        // Fetch push tokens directly from Firestore and send via Expo API
        if (otherParticipantIds.length > 0) {
          const tokens = [];
          for (const pId of otherParticipantIds) {
            const pDoc = await getDoc(doc(db, 'users', pId));
            if (pDoc.exists() && pDoc.data().pushToken) {
              tokens.push(pDoc.data().pushToken);
            }
          }

          if (tokens.length > 0) {
            await fetch('https://exp.host/--/api/v2/push/send', {
              method: 'POST',
              headers: {
                Accept: 'application/json',
                'Accept-encoding': 'gzip, deflate',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: tokens,
                sound: 'default',
                title: `New message from ${user.name}`,
                body: text,
                data: {
                  chatId: typeof id === 'string' ? id : id?.[0] || '',
                  chatName: Array.isArray(chatName) ? chatName[0] : (chatName || 'Chat'),
                  type: Array.isArray(type) ? type[0] : (type || 'direct'),
                },
              }),
            });
          }
        }
      }
    } catch (e) {
      console.error(e);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [id, currentUser]);

  const renderBubble = (props: BubbleProps<IMessage>) => {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: { backgroundColor: '#22D3EE' },
          left: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' }
        }}
        textStyle={{
          right: { color: '#0F172A', fontFamily: 'Outfit_500Medium' },
          left: { color: '#F1F5F9', fontFamily: 'Outfit_400Regular' }
        }}
      />
    );
  };

  const renderSend = (props: SendProps<IMessage>) => {
    return (
      <Send {...props}>
        <View style={{ marginRight: 15, marginBottom: 10 }}>
          <Ionicons name="send" size={24} color="#22D3EE" />
        </View>
      </Send>
    );
  };

  const renderInputToolbar = (props: InputToolbarProps<IMessage>) => {
    return (
      <InputToolbar
        {...props}
        containerStyle={{
          backgroundColor: '#0F172A',
          borderTopColor: '#334155',
          borderTopWidth: 1,
          paddingTop: 4,
        }}
      />
    );
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#22D3EE" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 50, paddingBottom: 15, paddingHorizontal: 20, backgroundColor: '#1E293B', borderBottomWidth: 1, borderBottomColor: '#334155' }}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 15 }}>
          <Ionicons name="arrow-back" size={24} color="#F1F5F9" />
        </TouchableOpacity>
        <View>
          <Text style={{ fontSize: 18, fontFamily: 'Outfit_700Bold', color: '#F1F5F9' }}>{chatName}</Text>
          {type === 'group' && <Text style={{ fontSize: 12, fontFamily: 'Outfit_400Regular', color: '#94A3B8' }}>Class Group</Text>}
        </View>
      </View>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {React.createElement(GiftedChat as any, {
        messages,
        onSend: (msgs: IMessage[]) => onSend(msgs),
        user: { _id: currentUser?.uid ?? '', name: currentUser?.email?.split('@')[0] || 'User' },
        renderBubble,
        renderSend,
        renderInputToolbar,
        bottomOffset: Platform.OS === 'ios' ? 32 : 0,
      })}
      {Platform.OS === 'android' && <KeyboardAvoidingView behavior="padding" />}
    </View>
  );
}
