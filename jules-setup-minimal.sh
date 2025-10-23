#!/bin/bash
# Simplified Jules Setup - Neptino (optimized for Jules environment)
set -e

cd /app

echo "🚀 Neptino Setup"

# Install dependencies
npm install

# Optional build step
npm run build || echo "Build skipped"

# Install Playwright browsers
npx playwright install chromium --with-deps 2>/dev/null || true

echo "✅ Setup complete"
