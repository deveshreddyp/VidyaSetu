const express = require('express');
const { admin } = require('../config/firebase');

const router = express.Router();
let Expo = null;
let expo = null;

// Send Push Notification
router.post('/send', async (req, res) => {
  if (!Expo) {
    try {
      const sdk = await import('expo-server-sdk');
      Expo = sdk.Expo;
      expo = new Expo();
    } catch (err) {
      console.error('Failed to load expo-server-sdk:', err);
      return res.status(500).json({ error: 'Push notification service unavailable' });
    }
  }

  const { tokens = [], userIds = [], title, body, data } = req.body;
  
  if (!tokens.length && !userIds.length) {
    return res.status(400).json({ error: 'No tokens or userIds provided' });
  }

  const messages = [];
  const webTokens = [];
  
  // Resolve userIds to tokens server-side to bypass client firestore rules
  if (userIds.length > 0) {
    try {
      // Note: In a production app with huge arrays, chunk this. For our scale, it's fine.
      const usersRef = admin.firestore().collection('users');
      // Firebase 'in' queries support max 10 elements. Chunking:
      for (let i = 0; i < userIds.length; i += 10) {
        const chunk = userIds.slice(i, i + 10);
        const snapshot = await usersRef.where(admin.firestore.FieldPath.documentId(), 'in', chunk).get();
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.pushToken) tokens.push(data.pushToken);
          if (data.webPushToken) tokens.push(data.webPushToken);
        });
      }
    } catch (err) {
      console.error('Error fetching user tokens:', err);
    }
  }
  
  for (let pushToken of tokens) {
    if (Expo.isExpoPushToken(pushToken)) {
      messages.push({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data: data || {},
      });
    } else if (pushToken && typeof pushToken === 'string') {
      // Treat as FCM Web Push token
      webTokens.push(pushToken);
    }
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  
  try {
    // 1. Send Expo Push Notifications
    for (let chunk of chunks) {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    
    // 2. Send FCM Web Push Notifications
    let webPushResult = null;
    if (webTokens.length > 0) {
      const messagePayload = {
        tokens: webTokens,
        notification: {
          title,
          body,
        },
        data: data ? {
          ...data,
          // Convert all data values to strings since FCM requires map<string, string>
          chatId: String(data.chatId || ''),
          chatName: String(data.chatName || ''),
        } : {},
      };
      
      webPushResult = await admin.messaging().sendEachForMulticast(messagePayload);
      console.log('Web push success count:', webPushResult.successCount);
    }

    res.json({ success: true, tickets, webPushResult });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

module.exports = router;
