const express = require('express');
const app = express();
app.use(express.json());
require('dotenv').config();
const axios = require('axios');

// ========== CONFIG ==========
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'madanapu2026';
const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.YOUR_TELEGRAM_ID;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// ========== AUTO REPLY ==========
function getAutoReply(msg) {
  if (/good\s*morning/i.test(msg)) return '🌅 Good Morning! Have a great day ahead!';
  if (/good\s*night/i.test(msg)) return '🌙 Good Night! Sleep well!';
  if (/good\s*evening/i.test(msg)) return '🌆 Good Evening!';
  if (/good\s*afternoon/i.test(msg)) return '☀️ Good Afternoon!';
  if (/happy\s*birthday/i.test(msg)) return '🎂 Happy Birthday! Many happy returns of the day!';
  if (/happy\s*diwali/i.test(msg)) return '🪔 Happy Diwali! Shubh Deepawali!';
  if (/happy\s*eid/i.test(msg)) return '🌙 Eid Mubarak!';
  if (/happy\s*holi/i.test(msg)) return '🎨 Happy Holi!';
  if (/happy\s*new\s*year/i.test(msg)) return '🎆 Happy New Year!';
  if (/congratulations|congrats/i.test(msg)) return '🎉 Congratulations!';
  if (/thank\s*you|thanks/i.test(msg)) return '🙏 You are welcome!';
  if (/namaste/i.test(msg)) return '🙏 Namaste!';
  return null;
}

// ========== PENDING MESSAGES ==========
const pendingMessages = {};

// ========== SEND WHATSAPP ==========
async function sendWhatsApp(to, message) {
  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      { messaging_product: 'whatsapp', to: to, text: { body: message } },
      { headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    console.log(`✅ WhatsApp reply sent to ${to}`);
  } catch (err) {
    console.error('WhatsApp error:', err.response?.data || err.message);
  }
}

// ========== GROQ AI ==========
async function getGroqReply(message) {
  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: 'You are a helpful assistant for APU Bhopal construction site. Reply concisely in the same language as the user.' },
        { role: 'user', content: message }
      ],
      max_tokens: 300
    },
    { headers: { Authorization: `Bearer ${GROQ_API_KEY}` } }
  );
  return res.data.choices[0].message.content;
}

// ========== GEMINI AI ==========
async function getGeminiReply(message) {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    { contents: [{ parts: [{ text: message }] }] }
  );
  return res.data.candidates[0].content.parts[0].text;
}

// ========== TELEGRAM APPROVAL ==========
async function sendTelegramApproval(msgId, from, userText, aiReply) {
  const text = `📩 *New WhatsApp Message*\n\n*From:* ${from}\n*Message:* ${userText}\n\n*AI Reply (Groq):*\n${aiReply}`;
  await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
    chat_id: TELEGRAM_CHAT_ID,
    text: text,
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Groq Reply', callback_data: `approve_groq_${msgId}` },
          { text: '💎 Gemini Reply', callback_data: `approve_gemini_${msgId}` }
        ],
        [
          { text: '✏️ Edit Reply', callback_data: `edit_${msgId}` },
          { text: '❌ Reject', callback_data: `reject_${msgId}` }
        ]
      ]
    }
  });
}

// ========== WEBHOOK VERIFY ==========
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ========== WHATSAPP MESSAGES ==========
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (!message) return res.sendStatus(200);

    const from = message.from;
    const userText = message.text?.body || '[Non-text message]';
    console.log(`📩 Message from ${from}: ${userText}`);

    const autoReply = getAutoReply(userText);
    if (autoReply) {
      await sendWhatsApp(from, autoReply);
      console.log(`⚡ Auto reply: ${autoReply}`);
      return res.sendStatus(200);
    }

    let aiReply = 'AI reply unavailable';
    try { aiReply = await getGroqReply(userText); }
    catch (e) { console.error('Groq error:', e.response?.data || e.message); }

    const msgId = Date.now().toString();
    pendingMessages[msgId] = { from, userText, aiReply };
    await sendTelegramApproval(msgId, from, userText, aiReply);
    console.log(`⏳ Sent to Telegram — ID: ${msgId}`);

    res.sendStatus(200);
  } catch (err) {
    console.error('Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// ========== TELEGRAM CALLBACK ==========
app.post('/telegram', async (req, res) => {
  try {
    const callback = req.body.callback_query;
    const update = req.body.message;

    if (callback) {
      const data = callback.data;
      const chatId = callback.message.chat.id;
      const messageId = callback.message.message_id;

      await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/answerCallbackQuery`, {
        callback_query_id: callback.id
      });

      if (data.startsWith('approve_groq_')) {
        const msgId = data.replace('approve_groq_', '');
        const p = pendingMessages[msgId];
        if (p) {
          await sendWhatsApp(p.from, p.aiReply);
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { chat_id: chatId, text: `✅ Groq reply sent to ${p.from}` });
          delete pendingMessages[msgId];
        }
      } else if (data.startsWith('approve_gemini_')) {
        const msgId = data.replace('approve_gemini_', '');
        const p = pendingMessages[msgId];
        if (p) {
          let reply = 'Gemini unavailable';
          try { reply = await getGeminiReply(p.userText); } catch (e) { console.error('Gemini error:', e.message); }
          await sendWhatsApp(p.from, reply);
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { chat_id: chatId, text: `✅ Gemini reply sent:\n${reply}` });
          delete pendingMessages[msgId];
        }
      } else if (data.startsWith('edit_')) {
        const msgId = data.replace('edit_', '');
        const p = pendingMessages[msgId];
        if (p) {
          await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: `✏️ Custom reply bhejo:\n\n/send_${msgId} Aapka reply yahan likhein`
          });
        }
      } else if (data.startsWith('reject_')) {
        const msgId = data.replace('reject_', '');
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/editMessageReplyMarkup`, { chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } });
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { chat_id: chatId, text: `❌ Message rejected` });
        delete pendingMessages[msgId];
      }
    }

    if (update?.text?.startsWith('/send_')) {
      const parts = update.text.split(' ');
      const msgId = parts[0].replace('/send_', '');
      const customReply = parts.slice(1).join(' ');
      const p = pendingMessages[msgId];
      if (p && customReply) {
        await sendWhatsApp(p.from, customReply);
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, { chat_id: update.chat.id, text: `✅ Custom reply sent to ${p.from}` });
        delete pendingMessages[msgId];
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('Telegram error:', err.message);
    res.sendStatus(500);
  }
});

app.get('/', (req, res) => res.json({ status: '✅ Madan APU Bot running' }));
app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running on port 3000'));
