const express = require('express');
const { Expo } = require('expo-server-sdk');

const router = express.Router();
let expo = new Expo();

// Send Push Notification
router.post('/send', async (req, res) => {
  const { tokens, title, body, data } = req.body;
  
  if (!tokens || !tokens.length) {
    return res.status(400).json({ error: 'No tokens provided' });
  }

  const messages = [];
  for (let pushToken of tokens) {
    if (!Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      continue;
    }
    messages.push({
      to: pushToken,
      sound: 'default',
      title,
      body,
      data: data || {},
    });
  }

  const chunks = expo.chunkPushNotifications(messages);
  const tickets = [];
  
  try {
    for (let chunk of chunks) {
      let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    res.json({ success: true, tickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send notifications' });
  }
});

module.exports = router;
