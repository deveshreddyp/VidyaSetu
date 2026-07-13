const express = require('express');
const { Expo } = require('expo-server-sdk');
const { admin } = require('../config/firebase');

const router = express.Router();
let expo = new Expo();

// Send Push Notification
router.post('/send', async (req, res) => {
  const { tokens, title, body, data } = req.body;
  
  if (!tokens || !tokens.length) {
    return res.status(400).json({ error: 'No tokens provided' });
  }

  const messages = [];
  const webTokens = [];
  
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
