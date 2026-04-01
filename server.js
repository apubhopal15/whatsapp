const express = require('express');
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
require('dotenv').config();
const { getAIReply } = require('./ai');
const { notifyForApproval, handleTelegramUpdate } = require('./telegram');
const db = require('./database');
const twilio = require('twilio');
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const AUTO_SEND_PATTERNS = [
  /good\s*morning/i, /good\s*night/i, /good\s*evening/i,
  /good\s*afternoon/i, /happy\s*(birthday|diwali|eid|holi|new\s*year)/i,
  /congratulations/i, /congrats/i, /thank\s*you/i, /thanks/i,
  /\bok\b|\bokay\b/i, /noted/i, /namaste/i, /hello/i, /hi\b/i, /bye\b/i,
];

function isAutoSend(message) {
  return AUTO_SEND_PATTERNS.some(p => p.test(message));
}

async function sendWhatsApp(to, message) {
  await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    body: message
  });
}

app.post('/webhook', async (req, res) => {
  try {
    const userText = req.body.Body;
    const from = req.body.From.replace('whatsapp:', '');
    console.log(`📩 From ${from}: ${userText}`);
    const aiReply = await getAIReply(userText);
    const msgId = db.saveMessage({ from, userText, aiReply });
    await notifyForApproval({ msgId, from, userText, aiReply }, sendWhatsApp); // 👈 UPDATED
    res.sendStatus(200);
  } catch (err) {
    console.error('❌ Error:', err.message);
    res.sendStatus(500);
  }
});

app.post('/telegram', async (req, res) => {
  await handleTelegramUpdate(req.body, sendWhatsApp);
  res.sendStatus(200);
});

app.get('/', (req, res) => res.json({ status: '✅ Bot running' }));
app.listen(process.env.PORT || 3000, () => console.log('🚀 Server running on port 3000'));
