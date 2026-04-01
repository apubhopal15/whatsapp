require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const BOT_NAME = process.env.BOT_NAME || 'AI Assistant';
const AI_MODE = process.env.AI_MODE || 'gemini'; // gemini, claude, chatgpt, groq

const SYSTEM_PROMPT = `You are ${BOT_NAME}, a helpful WhatsApp assistant.
Keep replies short (2-4 lines max), polite, and helpful.
Reply in the same language the user writes in (Hindi or English).
Do not use markdown or emojis unless necessary.`;

// 1. GEMINI (Free)
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

// 2. CLAUDE (Anthropic)
async function getClaudeReply(userMessage) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await response.json();
  return data.content[0].text.trim();
}

// 3. CHATGPT (OpenAI)
async function getChatGPTReply(userMessage) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
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

// 4. GROQ (Free)
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

// MAIN - AI_MODE se select hoga, failure pe next try
async function getAIReply(userMessage) {
  const order = {
    'gemini':  [getGeminiReply, getClaudeReply, getGroqReply],
    'claude':  [getClaudeReply, getGeminiReply, getGroqReply],
    'chatgpt': [getChatGPTReply, getGeminiReply, getGroqReply],
    'groq':    [getGroqReply, getGeminiReply, getClaudeReply],
  };
  const fns = order[AI_MODE] || order['gemini'];
  for (const fn of fns) {
    try {
      const reply = await fn(userMessage);
      console.log(`AI used: ${fn.name}`);
      return reply;
    } catch (err) {
      console.error(`${fn.name} failed:`, err.message);
    }
  }
  return 'Abhi thoda busy hoon, thodi der mein reply karunga.';
}

module.exports = { getAIReply };
