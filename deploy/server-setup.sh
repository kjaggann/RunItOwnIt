#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RunItOwnIt — one-time server provisioning script
# Run this once on a fresh Ubuntu 22.04 EC2 instance as the ubuntu user.
# Usage: bash server-setup.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "==> Updating system packages"
sudo apt-get update -y && sudo apt-get upgrade -y

# ── Java 17 ──────────────────────────────────────────────────────────────────
echo "==> Installing Java 17"
sudo apt-get install -y openjdk-17-jre-headless
java -version

# ── MySQL 8 ──────────────────────────────────────────────────────────────────
echo "==> Installing MySQL 8"
sudo apt-get install -y mysql-server
sudo systemctl enable mysql
sudo systemctl start mysql

echo "==> Creating database and user"
# Change YOUR_DB_PASSWORD to a strong password, then update /opt/runitownit/.env
sudo mysql -e "
  CREATE DATABASE IF NOT EXISTS runitownit CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
  CREATE USER IF NOT EXISTS 'runitownit'@'localhost' IDENTIFIED BY 'CHANGE_ME_DB_PASSWORD';
  GRANT ALL PRIVILEGES ON runitownit.* TO 'runitownit'@'localhost';
  FLUSH PRIVILEGES;
"

# ── Nginx ─────────────────────────────────────────────────────────────────────
echo "==> Installing Nginx"
sudo apt-get install -y nginx
sudo systemctl enable nginx

# Frontend web root
sudo mkdir -p /var/www/runitownit/html
sudo chown -R ubuntu:www-data /var/www/runitownit/html
sudo chmod -R 755 /var/www/runitownit

# ── Certbot (Let's Encrypt SSL) ───────────────────────────────────────────────
echo "==> Installing Certbot"
sudo apt-get install -y certbot python3-certbot-nginx

# ── App directory ─────────────────────────────────────────────────────────────
echo "==> Creating app directory"
sudo mkdir -p /opt/runitownit
sudo chown ubuntu:ubuntu /opt/runitownit

# Create the secrets file (fill in real values before starting the service)
if [ ! -f /opt/runitownit/.env ]; then
  cat <<'EOF' | sudo tee /opt/runitownit/.env > /dev/null
# ── Database ──────────────────────────────────────────────────────────────────
DB_PASSWORD=CHANGE_ME_DB_PASSWORD

# ── JWT — must be >= 32 characters ───────────────────────────────────────────
JWT_SECRET=CHANGE_ME_GENERATE_A_LONG_RANDOM_SECRET_HERE
EOF
  sudo chown ubuntu:ubuntu /opt/runitownit/.env
  sudo chmod 600 /opt/runitownit/.env
  echo "  !! Edit /opt/runitownit/.env and set DB_PASSWORD and JWT_SECRET before starting the service"
fi

# ── systemd service ───────────────────────────────────────────────────────────
echo "==> Installing systemd service"
sudo cp /opt/runitownit/runitownit.service /etc/systemd/system/runitownit.service
sudo systemctl daemon-reload
sudo systemctl enable runitownit

echo ""
echo "==> Done! Next steps:"
echo "  1. Edit /opt/runitownit/.env — set DB_PASSWORD and JWT_SECRET"
echo "  2. Copy nginx.conf:  sudo cp /opt/runitownit/nginx.conf /etc/nginx/sites-available/runitownit"
echo "  3.                   sudo ln -s /etc/nginx/sites-available/runitownit /etc/nginx/sites-enabled/"
echo "  4.                   sudo nginx -t && sudo systemctl reload nginx"
echo "  5. Issue SSL certs:  sudo certbot --nginx -d runitownit.com -d www.runitownit.com"
echo "                       sudo certbot --nginx -d api.runitownit.com"
echo "  6. Deploy the app:   run deploy.sh from your local machine"
