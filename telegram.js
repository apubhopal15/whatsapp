require('dotenv').config();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const YOUR_TELEGRAM_ID = process.env.YOUR_TELEGRAM_ID;
const AUTO_MODE = process.env.AUTO_MODE === 'true'; // 👈 NEW
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

async function notifyForApproval({ msgId, from, userText, aiReply }, sendWhatsAppFn) {
  
  // AUTO MODE - seedha bhej do, no approval needed
  if (AUTO_MODE && sendWhatsAppFn) {
    await sendWhatsAppFn(from, aiReply);
    db.updateStatus(msgId, 'approved');
    console.log(`AUTO REPLY sent to +${from}`);
    return;
  }

  // MANUAL MODE - Telegram approval
  const text =
    `📨 New WhatsApp Message\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 From: +${from}\n` +
    `💬 Message:\n${userText}\n\n` +
    `🤖 AI Reply:\n${aiReply}\n` +
    `━━━━━━━━━━━━━━━━━━━━`;
  const buttons = [
    [
      { text: '✅ Approve AI Reply', callback_data: `APPROVE_${msgId}` },
      { text: '❌ Reject', callback_data: `REJECT_${msgId}` }
    ],
    [
      { text: '✏️ Edit & Send Custom Reply', callback_data: `EDIT_${msgId}` }
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
        await sendTelegram(chatId, `✅ AI reply sent to +${msg.from}!`);
      }
    } else if (data.startsWith('REJECT_')) {
      const id = parseInt(data.split('_')[1]);
      db.updateStatus(id, 'rejected');
      await sendTelegram(chatId, `❌ Message ${id} rejected.`);
    } else if (data.startsWith('EDIT_')) {
      const id = parseInt(data.split('_')[1]);
      const msg = db.getMessage(id);
      if (msg) {
        await sendTelegram(chatId,
          `✏️ Custom reply bhejo:\n\nREPLY_${id} tumhari reply yahan\n\nExample:\nREPLY_${id} Kal tak ho jayega`
        );
      }
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
      `🤖 WhatsApp Bot\nMode: ${AUTO_MODE ? '🟢 AUTO' : '🔴 MANUAL'}\n\n✅ Approve — AI reply bhejo\n✏️ Edit — Custom reply\n❌ Reject — Discard`
    );
  } else if (text.startsWith('REPLY_')) {
    const parts = text.split(' ');
    const id = parseInt(parts[0].split('_')[1]);
    const customReply = parts.slice(1).join(' ');
    const msg = db.getMessage(id);
    if (msg && customReply) {
      await sendWhatsAppFn(msg.from, customReply);
      db.updateStatus(id, 'edited');
      await sendTelegram(chatId, `✅ Custom reply sent to +${msg.from}!`);
    } else {
      await sendTelegram(chatId, '❌ Format galat! REPLY_1 tumhari reply yahan');
    }
  }
}

module.exports = { notifyForApproval, handleTelegramUpdate };
