require('dotenv').config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const YOUR_TELEGRAM_ID = process.env.YOUR_TELEGRAM_ID;
const db = require('./database');

async function sendTelegram(chatId, text, buttons) {
  const body = { chat_id: chatId, text: text };
  if (buttons) {
    body.reply_markup = { inline_keyboard: buttons };
  }
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function notifyForApproval({ msgId, from, userText, aiReply }) {
  const text =
    `📨 New WhatsApp Message\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 From: +${from}\n` +
    `💬 Message:\n${userText}\n\n` +
    `🤖 AI Reply:\n${aiReply}\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  const buttons = [
    [
      { text: '✅ Approve', callback_data: `APPROVE_${msgId}` },
      { text: '❌ Reject', callback_data: `REJECT_${msgId}` }
    ]
  ];

  await sendTelegram(YOUR_TELEGRAM_ID, text, buttons);
}

async function handleTelegramUpdate(body, sendWhatsAppFn) {
  if (body.callback_query) {
    const query = body.callback_query;
    const chatId = query.message.chat.id.toString();
    const data = query.data;

    if (data.startsWith('APPROVE_')) {
      const id = parseInt(data.split('_')[1]);
      const msg = db.getMessage(id);
      if (msg) {
        await sendWhatsAppFn(msg.from, msg.aiReply);
        db.updateStatus(id, 'approved');
        await sendTelegram(chatId, `✅ Sent to +${msg.from}!`);
      }
    } else if (data.startsWith('REJECT_')) {
      const id = parseInt(data.split('_')[1]);
      db.updateStatus(id, 'rejected');
      await sendTelegram(chatId, `❌ Message ${id} rejected.`);
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: query.id })
    });
    return;
  }

  const message = body?.message;
  if (!message) return;
  const chatId = message.chat.id.toString();
  const text = message.text || '';
  if (chatId !== YOUR_TELEGRAM_ID) return;

  if (text === '/start' || text === '/help') {
    await sendTelegram(chatId,
      `🤖 WhatsApp Bot Commands:\n\nEDIT <id> custom text\n\nExample:\nEDIT 5 Kal tak ho jayega`
    );
  } else if (text.startsWith('EDIT ')) {
    const parts = text.split(' ');
    const id = parseInt(parts[1]);
    const customReply = parts.slice(2).join(' ');
    const msg = db.getMessage(id);
    if (msg && customReply) {
      await sendWhatsAppFn(msg.from, customReply);
      db.updateStatus(id, 'edited');
      await sendTelegram(chatId, `✅ Custom reply sent to +${msg.from}!`);
    }
  }
}

module.exports = { notifyForApproval, handleTelegramUpdate };
