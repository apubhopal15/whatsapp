require('dotenv').config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

async function sendWhatsApp(to, message) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to,
          type: 'text',
          text: { body: message }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error('WhatsApp send error:', data.error.message);
      return false;
    }

    console.log(`✅ WhatsApp sent to ${to}`);
    return true;
  } catch (err) {
    console.error('WhatsApp error:', err.message);
    return false;
  }
}

module.exports = { sendWhatsApp };
