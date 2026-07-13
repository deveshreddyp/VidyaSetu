export default async function handler(req, res) {
  // Add CORS headers just in case, though it's on the same domain
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { tokens = [], userIds = [], title, body, data } = req.body;
    
    // We are going to strictly send Expo Push Notifications directly from this Vercel function
    // bypassing Firebase Admin entirely since Vercel has trouble with Firebase config
    
    const expoTokens = tokens.filter(t => t.startsWith('ExponentPushToken'));
    
    // If they only provided userIds, we can't look them up without Firebase Admin.
    // So the client (ChatWindow.jsx) MUST pass `tokens` directly!
    if (expoTokens.length === 0) {
      return res.status(200).json({ success: true, message: 'No valid expo tokens provided, skipping.' });
    }

    const messages = expoTokens.map(token => ({
      to: token,
      sound: 'default',
      title: title || 'New Message',
      body: body || 'You received a new message',
      data: data || {},
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    return res.status(200).json({ success: true, expoResult: result });
  } catch (error) {
    console.error('Push notification error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
