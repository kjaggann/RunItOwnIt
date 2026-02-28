#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# RunItOwnIt — deploy script (run from your local machine)
# Usage: bash deploy/deploy.sh <ec2-ip-or-hostname>
# Example: bash deploy/deploy.sh 54.123.45.67
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SERVER="${1:?Usage: $0 <server-ip>}"
SSH="ssh -o StrictHostKeyChecking=no ubuntu@${SERVER}"
SCP="scp -o StrictHostKeyChecking=no"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "==> Building frontend"
cd "$PROJECT_ROOT/frontend"
npm run build          # outputs to dist/

echo "==> Building backend"
cd "$PROJECT_ROOT"
./mvnw package -DskipTests -q   # outputs to target/*.jar

JAR=$(ls "$PROJECT_ROOT"/target/RunItOwnIt-*.jar 2>/dev/null | head -1)
if [ -z "$JAR" ]; then
  JAR=$(ls "$PROJECT_ROOT"/target/*.jar 2>/dev/null | grep -v 'original' | head -1)
fi
echo "  JAR: $JAR"

echo "==> Uploading frontend"
$SSH "rm -rf /var/www/runitownit/html/* && mkdir -p /var/www/runitownit/html"
$SCP -r "$PROJECT_ROOT/frontend/dist/." "ubuntu@${SERVER}:/var/www/runitownit/html/"

echo "==> Uploading backend JAR"
$SCP "$JAR" "ubuntu@${SERVER}:/opt/runitownit/app.jar"

echo "==> Uploading service file and nginx config"
$SCP "$SCRIPT_DIR/runitownit.service" "ubuntu@${SERVER}:/opt/runitownit/runitownit.service"
$SCP "$SCRIPT_DIR/nginx.conf"         "ubuntu@${SERVER}:/opt/runitownit/nginx.conf"

echo "==> Restarting backend service"
$SSH "sudo systemctl daemon-reload && sudo systemctl restart runitownit"

echo "==> Reloading Nginx"
$SSH "sudo nginx -t && sudo systemctl reload nginx"

echo ""
echo "✓ Deployed! Site live at https://runitownit.com"
