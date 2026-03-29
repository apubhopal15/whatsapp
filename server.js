const express = require('express');
const app = express();
app.use(express.json());

require('dotenv').config();

const { getAIReply } = require('./ai');
const { sendWhatsApp } = require('./whatsapp');
const { notifyForApproval, handleTelegramUpdate } = require('./telegram');
const db = require('./database');

// ✅ Auto-send patterns — no approval needed
const AUTO_SEND_PATTERNS = [
  /good\s*morning/i,
  /good\s*night/i,
  /good\s*evening/i,
  /good\s*afternoon/i,
  /happy\s*(birthday|diwali|eid|holi|new\s*year)/i,
  /congratulations/i,
  /congrats/i,
  /thank\s*you/i,
  /thanks/i,
  /\bok\b|\bokay\b/i,
  /noted/i,
  /namaste/i,
  /hello/i,
  /hi\b/i,
  /bye\b/i,
];

function isAutoSend(message) {
  return AUTO_SEND_PATTERNS.some(p => p.test(message));
}

// WhatsApp webhook verify
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// WhatsApp incoming messages
app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const messages = value?.messages;

    if (!messages || messages.length === 0) return res.sendStatus(200);

    const msg = messages[0];
    if (msg.type !== 'text') return res.sendStatus(200);

    const userText = msg.text.body;
    const from = msg.from;

    console.log(`📩 Message from ${from}: ${userText}`);

    // Generate AI reply
    const aiReply = await getAIReply(userText);

    if (isAutoSend(userText)) {
      // Send immediately — no approval needed
      await sendWhatsApp(from, aiReply);
      console.log('✅ Auto-sent reply');
    } else {
      // Save to approval queue and notify
      const msgId = db.saveMessage({ from, userText, aiReply });
      await notifyForApproval({ msgId, from, userText, aiReply });
      console.log(`⏳ Queued for approval — ID: ${msgId}`);
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Webhook error:', err.message);
    res.sendStatus(500);
  }
});

// Telegram bot webhook
app.post('/telegram', async (req, res) => {
  await handleTelegramUpdate(req.body);
  res.sendStatus(200);
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Bot is running ✅', time: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
