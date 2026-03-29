const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const DB_FILE = path.join(__dirname, 'data', 'messages.json');

// Google Sheets setup
const SHEET_ID = '1GLcMAyUKig4zZP3aLkaePzOIDujEaLtCaiJ6gkNkZrE';
const CREDENTIALS = {
  type: "service_account",
  project_id: "whatsapp-bot-491716",
  private_key_id: "194cd9543602690a99f783578a494a2e51db2010",
  private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCyM1KMUvMk14n3\nik01PE0whUCExG8F114/FvkTK1hjyVJMk6nN3eDbsUgiDZ1G6nRR7Me4sUBVu6sZ\nGZOJXdYb7DIlr3lUoAHZn+VQ4TXvEuM13Jtj+/p4Zb6jeU+HYZmfd7BxxQxywE5g\n5DkvBqsw8LRt3BOKYl3NL7NdSfoMnn4WpinMboeF6F9czaVuKVaeaKMAg9mpjfVF\np3UIIDmQkk2iuLRWa/Gn2xw0IIW1EMKjx+XZSRw+Zvnkfy39eD1AO9tdjFUCLLBo\nrjZto6SECxKVRF/xm+fLuYLxGbbws0YJq03SGQ+8k8clYF8eiXaM5VDsdr9jhYot\nEGbi6PA/AgMBAAECggEABQNjKy7lHQPVv902PrtTgbT+3kf+cScEGrHv7Hcwpzrm\nwDWJRJEdWrY2lCAB0KcXHoo9l/Bm2qm1w+8Pi6uba7FYkO1myZe9rLHVRRksbvuN\nUu/6t181OEzjIrXgXNZ96kuhxEtilG8yOp9BDUB3DeexcDWNn2ajJiWqrC2yxY4t\nAb42DNMLgu1R42PlCB9GnBpXDjG73g+aPkUMOpJLPFMDh62AtFwGSunNKIRxh7uu\n+Dmp4KhnCIxe/+4QFJcoerSqZ4TTObYHhUxF6O2zLlKb/cpOUS4TxZMEOanpdlFm\n9yc5B98vHRa03W8OMXlGYuumKbt8Z78niQeMH6qksQKBgQDYGDA5lfNl/amRdNfH\nXU+1+GCCgst/tUFJ7S6fipSw9dHzj0/6NgIfFlWIlCC1icFc4/DxJKXKt1q37Xlu\n6s2bhInqZXckFr6QeAO2wF0bG6AYxD+ouy8GQAXX+m7V8FJL8Cih4kejpTcJK+5E\n2s+H5q08xWf5+wZqVY3kGeCecQKBgQDTG7RdUBHxw56FPEerGw8jI0AJxN0Nl6cG\nnkvK+6XtJ1scuVhd6zW7mu1nLgNHHZafTLzwK+jPK4lBESAMmV8Ye9+ja0vJaPYI\ntO9yfymIaN8Kk8SDgi6y1SjUp7RrPZWB8NkAtuYDNtojKyRKZxlJi6POgU/3C6Ly\nbYxk6xkxrwKBgG36UYDdShTcNpKqzq7OVKUeFbAWdQ835lSDe7kCxI4TbZjxlRiY\nqBe+PCXYjZUW2Ow3rgZsSlyTWH5HRAgpRB8kIzTCExKw6KeKDQnTeQ80zhQMvQFY\n0qPxrYewEvya5Kd1QJizGxa0HQBz9T3hxsE5q21EYpidIzS2+hHfAaxhAoGBAJHv\n0ALFzHHeMmKWplCxtwgqYSWfstSnpq5blbevuSe1kjXMJztd01pqon02gMuTt8FN\n8jrxj9JPnWWeqhIroGKzl4lILi8A4TxpoDH9mD+Vh8KvHiVvREsaMky31nBgNU+L\nqOfmiCFmtOuk8kSA+yktYELsf9Qfdjiy5GALafI/AoGAakfLP2ZFqOXwFFz2NlGn\nBWTPzpqoTZZ2+66kct6uDFY1J2FRdJbDjkiw3U8Wl+dZrd7xmj6ixsTQingv6pAe\n9Dc+2v6Rh4u3eBwDFFSd47I0CuMj7vZKV4EYZENp5xrO5u5MQDnTpqBxMn7GmyYZ\nRD+WpH8Ul8vrARSck8E/Dlk=\n-----END PRIVATE KEY-----\n",
  client_email: "whatsapp-bot@whatsapp-bot-491716.iam.gserviceaccount.com",
  client_id: "114733449766449048922",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token"
};

async function saveToSheet(data) {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: CREDENTIALS,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Sheet1!A:F',
      valueInputOption: 'RAW',
      resource: {
        values: [[
          new Date().toLocaleDateString('en-IN'),
          new Date().toLocaleTimeString('en-IN'),
          data.from,
          data.userText,
          data.aiReply,
          data.status || 'pending'
        ]]
      }
    });
    console.log('✅ Saved to Google Sheets');
  } catch (err) {
    console.error('❌ Sheets error:', err.message);
  }
}

function loadDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ messages: [], nextId: 1 }));
  }
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function saveMessage({ from, userText, aiReply }) {
  const db = loadDB();
  const id = db.nextId++;
  db.messages.push({ id, from, userText, aiReply, status: 'pending', createdAt: new Date().toISOString() });
  saveDB(db);
  saveToSheet({ from, userText, aiReply, status: 'pending' });
  return id;
}

function getMessage(id) {
  const db = loadDB();
  return db.messages.find(m => m.id === id) || null;
}

function updateStatus(id, status) {
  const db = loadDB();
  const msg = db.messages.find(m => m.id === id);
  if (msg) {
    msg.status = status;
    msg.updatedAt = new Date().toISOString();
    saveDB(db);
    saveToSheet({ from: msg.from, userText: msg.userText, aiReply: msg.aiReply, status });
  }
}

module.exports = { saveMessage, getMessage, updateStatus };
