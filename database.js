const fs = require('fs');
const path = require('path');

// Simple JSON-based database (no extra install needed)
const DB_FILE = path.join(__dirname, 'data', 'messages.json');

function loadDB() {
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
  db.messages.push({
    id,
    from,
    userText,
    aiReply,
    status: 'pending',
    createdAt: new Date().toISOString()
  });
  saveDB(db);
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
  }
}

module.exports = { saveMessage, getMessage, updateStatus };
