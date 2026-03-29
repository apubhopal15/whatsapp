require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const YOUR_TELEGRAM_ID = process.env.YOUR_TELEGRAM_ID;
const db = require('./database');
const { sendWhatsApp } = require('./whatsapp');

async function sendTelegram(chatId, text) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text })
  });
}

async function notifyForApproval({ msgId, from, userText, aiReply }) {
  const text =
    `📨 New WhatsApp Message\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 From: +${from}\n` +
    `💬 Message:\n${userText}\n\n` +
    `🤖 AI Reply:\n${aiReply}\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `Reply with:\n` +
    `✅ APPROVE ${msgId}\n` +
    `✏️ EDIT ${msgId} your custom reply\n` +
    `❌ REJECT ${msgId}`;

  await sendTelegram(YOUR_TELEGRAM_ID, text);
}

async function handleTelegramUpdate(body) {
  const message = body?.message;
  if (!message) return;

  const chatId = message.chat.id.toString();
  const text = message.text || '';

  // Only accept from your Telegram ID
  if (chatId !== YOUR_TELEGRAM_ID) return;

  if (text.startsWith('APPROVE ')) {
    const id = parseInt(text.split(' ')[1]);
    const msg = db.getMessage(id);
    if (msg) {
      const sent = await sendWhatsApp(msg.from, msg.aiReply);
      db.updateStatus(id, 'approved');
      await sendTelegram(chatId, sent ? `✅ Sent to +${msg.from}!` : `❌ WhatsApp send failed.`);
    } else {
      await sendTelegram(chatId, '❌ Message ID not found.');
    }

  } else if (text.startsWith('EDIT ')) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const customReply = parts.slice(2).join(' ');
    const msg = db.getMessage(id);
    if (msg && customReply) {
      const sent = await sendWhatsApp(msg.from, customReply);
      db.updateStatus(id, 'edited');
      await sendTelegram(chatId, sent ? `✅ Custom reply sent to +${msg.from}!` : `❌ WhatsApp send failed.`);
    } else {
      await sendTelegram(chatId, '❌ Usage: EDIT <id> your message here');
    }

  } else if (text.startsWith('REJECT ')) {
    const id = parseInt(text.split(' ')[1]);
    db.updateStatus(id, 'rejected');
    await sendTelegram(chatId, `❌ Message ${id} rejected.`);

  } else if (text === '/start' || text === '/help') {
    await sendTelegram(chatId,
      `🤖 WhatsApp Bot Commands:\n\n` +
      `APPROVE <id> — Send AI reply\n` +
      `EDIT <id> custom text — Send your reply\n` +
      `REJECT <id> — Discard message\n\n` +
      `Example:\nAPPROVE 5\nEDIT 5 Kal tak ho jayega`
    );
  }
}

module.exports = { notifyForApproval, handleTelegramUpdate };
