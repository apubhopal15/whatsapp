# WhatsApp AI Bot 🤖 (Groq + Telegram Approval)

## Quick Deploy on OCI Server

```bash
unzip whatsapp-ai-bot-GROQ.zip
cd whatsapp-ai-bot
chmod +x setup.sh
./setup.sh
nano .env          # ← apni keys yahan daalo
pm2 start server.js --name whatsapp-bot
pm2 logs
```

## Keys Kahan Se Milti Hain

| Key | Website |
|-----|---------|
| GROQ_API_KEY | console.groq.com |
| WHATSAPP_TOKEN | developers.facebook.com |
| PHONE_NUMBER_ID | developers.facebook.com |
| TELEGRAM_BOT_TOKEN | Telegram @BotFather |
| YOUR_TELEGRAM_ID | Telegram @userinfobot |

## Telegram Commands

```
APPROVE 5        → AI wali reply bhejo
EDIT 5 Kal tak   → Custom reply bhejo
REJECT 5         → Discard karo
```

## Auto-Send (No Approval)
Good morning, Good night, Thanks, OK, Hello, Hi, Namaste, etc.
