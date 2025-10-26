#!/bin/bash
# =============================================================================
# JULES AI SETUP - NEPTINO PROJECT (Optimized)
# =============================================================================
# This script sets up Neptino for Jules AI environment with proper dependencies
# and test infrastructure.
# =============================================================================

set -e

echo "🚀 Neptino Setup for Jules AI"
echo "========================================"
echo ""

# Navigate to app directory (Jules clones repo here)
cd /app

echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit 2>/dev/null || npm install

echo ""
echo "🎭 Installing Playwright and browsers..."
# Install Playwright browsers with dependencies (critical for tests)
npx playwright install chromium --with-deps || {
    echo "⚠️  Playwright install failed, retrying with sudo..."
    sudo npx playwright install-deps chromium
    npx playwright install chromium
}

echo ""
echo "🏗️  Building project (optional)..."
npm run build 2>/dev/null || echo "⚠️  Build skipped (not required for tests)"

echo ""
echo "✅ Setup complete!"
echo ""
echo "📋 Verification:"
echo "   - Node: $(node --version)"
echo "   - npm: $(npm --version)"
echo "   - Dependencies: Installed"
echo "   - Playwright: Ready"
echo ""
echo "🎯 Ready to run: npm test"
