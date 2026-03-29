require('dotenv').config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const BOT_NAME = process.env.BOT_NAME || 'AI Assistant';

async function getAIReply(userMessage) {
  try {
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
          {
            role: 'system',
            content: `You are ${BOT_NAME}, a helpful and professional WhatsApp assistant. 
Keep replies short (2-4 lines max), polite, and helpful. 
Reply in the same language the user writes in (Hindi or English).
Do not use markdown or emojis unless necessary.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ]
      })
    });

    const data = await response.json();

    if (data.choices && data.choices[0]) {
      return data.choices[0].message.content.trim();
    } else {
      console.error('Groq error:', JSON.stringify(data));
      return 'Aapka message mila. Main jald hi reply karunga.';
    }
  } catch (err) {
    console.error('AI error:', err.message);
    return 'Abhi thoda busy hoon, thodi der mein reply karunga.';
  }
}

module.exports = { getAIReply };
