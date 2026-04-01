require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const BOT_NAME = process.env.BOT_NAME || 'AI Assistant';

const SYSTEM_PROMPT = `You are ${BOT_NAME}, a helpful WhatsApp assistant.
Keep replies short (2-4 lines max), polite, and helpful.
Reply in the same language the user writes in (Hindi or English).
Do not use markdown or emojis unless necessary.`;

// Gemini - Primary
async function getGeminiReply(userMessage) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: userMessage }] }]
      })
    }
  );
  const data = await response.json();
  return data.candidates[0].content.parts[0].text.trim();
}

// Groq - Fallback
async function getGroqReply(userMessage) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      max_tokens: 300,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage }
      ]
    })
  });
  const data = await response.json();
  return data.choices[0].message.content.trim();
}

// Main function - Gemini first, Groq fallback
async function getAIReply(userMessage) {
  try {
    if (GEMINI_API_KEY) {
      try {
        const reply = await getGeminiReply(userMessage);
        console.log('AI: Gemini used');
        return reply;
      } catch (geminiErr) {
        console.error('Gemini failed, trying Groq:', geminiErr.message);
      }
    }
    const reply = await getGroqReply(userMessage);
    console.log('AI: Groq used');
    return reply;
  } catch (err) {
    console.error('AI error:', err.message);
    return 'Abhi thoda busy hoon, thodi der mein reply karunga.';
  }
}

module.exports = { getAIReply };
