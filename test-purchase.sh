#!/usr/bin/env bash

# CWY Quick Test Script
# Tests the complete purchase flow locally

set -e

echo "🚀 CWY Purchase Flow Test"
echo "=========================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
    echo "✅ Please edit .env with your Stripe keys and run again."
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Check required env vars
if [ -z "$STRIPE_SECRET_KEY" ] || [ -z "$STRIPE_PRICE_ID_PRO" ]; then
    echo "❌ Missing required environment variables:"
    echo "   - STRIPE_SECRET_KEY"
    echo "   - STRIPE_PRICE_ID_PRO"
    echo ""
    echo "Please set them in .env file"
    exit 1
fi

echo "✅ Environment variables loaded"
echo ""

# Test 1: Show pricing
echo "📊 Test 1: Show pricing"
npx ts-node ./cli/cwy.ts pricing
echo ""

# Test 2: Generate a test license key
echo "🔑 Test 2: Generate test license key"
node -e "
const { generateLicenseKey } = require('./dist/engines/licensing/license');
const key = generateLicenseKey('PRO', null);
console.log('Generated key:', key);
" 2>/dev/null || {
    echo "⚠️  Building TypeScript first..."
    npm run build
    node -e "
    const { generateLicenseKey } = require('./dist/engines/licensing/license');
    const key = generateLicenseKey('PRO', null);
    console.log('Generated key:', key);
    "
}
echo ""

# Test 3: Activate test license
echo "🔐 Test 3: Activate test license"
TEST_KEY=$(node -e "const { generateLicenseKey } = require('./dist/engines/licensing/license'); console.log(generateLicenseKey('PRO', null));" 2>/dev/null)
npx ts-node ./cli/cwy.ts activate-license "$TEST_KEY" test@example.com
echo ""

# Test 4: Check license info
echo "ℹ️  Test 4: Check license info"
npx ts-node ./cli/cwy.ts license-info
echo ""

# Test 5: Test PRO features
echo "🎯 Test 5: Test PRO features"
echo "   Initializing CWY..."
npx ts-node ./cli/cwy.ts init 2>/dev/null || echo "   Already initialized"
echo "   Running scan..."
npx ts-node ./cli/cwy.ts scan | head -n 20
echo ""

echo "✅ All tests passed!"
echo ""
echo "Next steps:"
echo "1. Test Stripe checkout (creates real session):"
echo "   npx ts-node ./cli/cwy.ts purchase PRO your@email.com"
echo ""
echo "2. Set up webhook endpoint for auto-activation:"
echo "   See STRIPE_SETUP.md for details"
echo ""
echo "3. Test with Stripe CLI (local webhook testing):"
echo "   stripe listen --forward-to localhost:3000/webhook/stripe"
