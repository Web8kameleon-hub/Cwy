#!/bin/bash
##############################################################################
# CWY / Clisonix Auto-Deployment Script
# Ekzekuto këtë në Hetzner (root@62.238.21.125) për të ndezur të gjithë 8 shërbimet
# Usage: bash deploy-clisonix.sh
##############################################################################

set -e  # Exit on any error

echo "🚀 CWY / Clisonix Platform — IGNITION SEQUENCE"
echo "═══════════════════════════════════════════════════════════════════"

# ═══════════════════════════════════════════════════════════════════════
# 1. PREREQUISITES CHECK
# ═══════════════════════════════════════════════════════════════════════

echo "✓ Step 1: Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
    apt-get install -y nodejs
fi

if ! command -v python3 &> /dev/null; then
    echo "Installing Python 3..."
    apt-get install -y python3 python3-pip
fi

npm install -g pm2 2>/dev/null || true
echo "✅ Node.js, Python3, and PM2 ready"

# ═══════════════════════════════════════════════════════════════════════
# 2. CREATE LOG DIRECTORIES
# ═══════════════════════════════════════════════════════════════════════

echo "✓ Step 2: Setting up logging..."
mkdir -p /var/log/clisonix
mkdir -p /opt/ocean-core /opt/asi-agents /opt/ai-v2 /opt/euroweb-agi /opt/labors /opt/cwy-nin-engine /opt/orchestrator
chmod 755 /var/log/clisonix
echo "✅ Log directories created"

# ═══════════════════════════════════════════════════════════════════════
# 3. CLONE/UPDATE REPOSITORY
# ═══════════════════════════════════════════════════════════════════════

echo "✓ Step 3: Syncing code from GitHub..."
if [ ! -d "/opt/cwy-production" ]; then
    git clone https://github.com/Web8kameleon-hub/Cwy.git /opt/cwy-production
else
    cd /opt/cwy-production && git pull origin main
fi
cd /opt/cwy-production
echo "✅ Code synced (HEAD: $(git rev-parse --short HEAD))"

# ═══════════════════════════════════════════════════════════════════════
# 4. INSTALL PROJECT DEPENDENCIES
# ═══════════════════════════════════════════════════════════════════════

echo "✓ Step 4: Installing dependencies..."
npm install 2>&1 | tail -5
pip3 install -q -r /opt/cwy-production/requirements.txt 2>/dev/null || true
echo "✅ Dependencies installed"

# ═══════════════════════════════════════════════════════════════════════
# 5. LOAD ENVIRONMENT VARIABLES
# ═══════════════════════════════════════════════════════════════════════

echo "✓ Step 5: Loading environment..."
if [ ! -f ".env.production" ]; then
    echo "⚠️  .env.production not found. Creating template..."
    cat > .env.production << 'ENVFILE'
# Database
DATABASE_URL=postgresql://user:password@localhost/clisonix

# Stripe Integration
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_public_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Ports (internal)
OCEAN_CORE_PORT=7000
ASI_AGENTS_PORT=7100
AI_V2_PORT=7200
EUROWEB_AGI_PORT=7300
LABORS_PORT=7400
NIN_ENGINE_PORT=7500
ORCHESTRATOR_PORT=8000
CWY_LICENSE_PORT=9000

# Domain
PRODUCTION_DOMAIN=cwy.clisonix.com
ENVFILE
    echo "⚠️  Please edit .env.production with your actual keys!"
fi

# ═══════════════════════════════════════════════════════════════════════
# 6. START ALL SERVICES WITH PM2
# ═══════════════════════════════════════════════════════════════════════

echo "✓ Step 6: Starting all services via PM2..."
pm2 delete all 2>/dev/null || true
pm2 start ecosystem.config.js --no-autorestart
pm2 save
pm2 startup

echo ""
echo "🔥 SERVICE STATUS:"
pm2 status

# ═══════════════════════════════════════════════════════════════════════
# 7. CONFIGURE NGINX PROXY
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "✓ Step 7: Configuring Nginx reverse proxy..."

cat > /etc/nginx/conf.d/cwy-backend-proxy.conf << 'NGINX'
# CWY Backend Services Proxy
upstream ocean_core       { server localhost:7000; }
upstream asi_agents       { server localhost:7100; }
upstream ai_v2            { server localhost:7200; }
upstream euroweb_agi      { server localhost:7300; }
upstream labors           { server localhost:7400; }
upstream nin_engine       { server localhost:7500; }
upstream orchestrator     { server localhost:8000; }
upstream cwy_license      { server localhost:9000; }

server {
    listen 62.238.21.125:8080;
    server_name cwy.clisonix.com clisonix.com;

    # API routing
    location /api/v1/ocean       { proxy_pass http://ocean_core; }
    location /api/v1/agents      { proxy_pass http://asi_agents; }
    location /api/v1/models      { proxy_pass http://ai_v2; }
    location /api/v1/reasoning   { proxy_pass http://euroweb_agi; }
    location /api/v1/compute     { proxy_pass http://labors; }
    location /api/v1/nin         { proxy_pass http://nin_engine; }
    location /api/v1/            { proxy_pass http://orchestrator; }
    location /api/validate-license { proxy_pass http://cwy_license; }
    location /webhook/stripe     { proxy_pass http://orchestrator; }
}
NGINX

nginx -t && systemctl reload nginx
echo "✅ Nginx proxy configured and reloaded"

# ═══════════════════════════════════════════════════════════════════════
# 8. HEALTH CHECK
# ═══════════════════════════════════════════════════════════════════════

echo ""
echo "✓ Step 8: Health check (waiting 5 seconds for services to boot)..."
sleep 5

echo ""
echo "🟢 SERVICES HEALTH:"
echo "   Ocean Core       @7000:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:7000/health 2>/dev/null || echo 'OFFLINE')"
echo "   ASI Agents       @7100:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:7100/health 2>/dev/null || echo 'OFFLINE')"
echo "   AI V2            @7200:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:7200/health 2>/dev/null || echo 'OFFLINE')"
echo "   EuroWeb AGI      @7300:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:7300/health 2>/dev/null || echo 'OFFLINE')"
echo "   Labors           @7400:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:7400/health 2>/dev/null || echo 'OFFLINE')"
echo "   Nin Engine       @7500:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:7500/api/v1/nin/current 2>/dev/null || echo 'OFFLINE')"
echo "   Orchestrator     @8000:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/health 2>/dev/null || echo 'OFFLINE')"
echo "   CWY License      @9000:  $(curl -s -o /dev/null -w '%{http_code}' http://localhost:9000/health 2>/dev/null || echo 'OFFLINE')"

echo ""
echo "═══════════════════════════════════════════════════════════════════"
echo "✅ CWY IGNITION COMPLETE!"
echo ""
echo "🔥 Next steps:"
echo "   1. Test: curl https://cwy.clisonix.com/"
echo "   2. Monitor: pm2 status"
echo "   3. Logs: pm2 logs [service-name]"
echo "   4. Watch: pm2 monit"
echo ""
echo "💰 Your Ferrari is now LIVE. Clients can see the demo!"
echo "═══════════════════════════════════════════════════════════════════"
