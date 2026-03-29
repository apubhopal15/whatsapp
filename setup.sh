#!/bin/bash
echo "=============================="
echo " WhatsApp AI Bot - Setup"
echo "=============================="

# Install Node.js if not present
if ! command -v node &> /dev/null; then
  echo "📦 Installing Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

echo "✅ Node version: $(node -v)"

# Install PM2
if ! command -v pm2 &> /dev/null; then
  echo "📦 Installing PM2..."
  sudo npm install -g pm2
fi

# Install dependencies
echo "📦 Installing bot dependencies..."
npm install

# Open firewall port 3000
echo "🔓 Opening port 3000..."
sudo firewall-cmd --permanent --add-port=3000/tcp 2>/dev/null || true
sudo firewall-cmd --reload 2>/dev/null || true
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT 2>/dev/null || true

# Create data directory
mkdir -p data

# Copy env example
if [ ! -f .env ]; then
  cp .env.example .env
  echo ""
  echo "⚠️  .env file created — ABHI FILL KARO:"
  echo "   nano .env"
  echo ""
fi

echo ""
echo "=============================="
echo " Setup complete! ✅"
echo "=============================="
echo ""
echo "Next steps:"
echo "1. nano .env           — apni keys daalo"
echo "2. pm2 start server.js --name whatsapp-bot"
echo "3. pm2 logs            — status dekho"
echo ""
