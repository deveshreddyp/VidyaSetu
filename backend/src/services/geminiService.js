const OpenAI = require('openai');

let instances = [];
let currentIndex = 0;

function initializeKeys() {
  const keysString = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || 'PLACEHOLDER';
  const keys = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
  
  if (keys.length === 0) {
    keys.push('PLACEHOLDER');
  }

  instances = keys.map(key => new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: key,
    defaultHeaders: {
      'HTTP-Referer': 'http://localhost:5173', // Your app URL
      'X-Title': 'VidyaSetu AI', // Your app name
    }
  }));
}

/**
 * Returns an OpenAI client pointing to OpenRouter using round-robin API key rotation
 */
function getAIClient() {
  if (instances.length === 0) {
    initializeKeys();
  }

  const instance = instances[currentIndex];
  currentIndex = (currentIndex + 1) % instances.length;
  return instance;
}

/**
 * Helper to check if we are currently in mock mode
 */
function isMockMode() {
  const keysString = process.env.OPENROUTER_API_KEYS || process.env.OPENROUTER_API_KEY || 'PLACEHOLDER';
  return keysString.includes('PLACEHOLDER');
}

module.exports = {
  getAIClient,
  isMockMode
};
