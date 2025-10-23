#!/bin/bash
# =============================================================================
# JULES AI ENVIRONMENT SETUP - NEPTINO PROJECT
# =============================================================================
# This script is run automatically by Jules when spinning up your environment.
# It installs dependencies, runs builds, and prepares the environment for 
# seamless testing and development.
#
# Stack: Node.js + TypeScript + Vite + Supabase + PIXI.js + Playwright
# =============================================================================

set -e

echo "🚀 Jules Environment Setup - Neptino"
echo "====================================="
echo ""

# Ensure we're in the project directory
cd /app || cd "$(dirname "$0")"

echo "📂 Working directory: $(pwd)"
echo ""

# Check Node version
echo "🔍 Checking Node.js version..."
if command -v node >/dev/null 2>&1; then
  echo "✅ Node.js installed: $(node --version)"
else
  echo "❌ Node.js not found - please ensure Node.js is available"
  exit 1
fi

# Check npm
if command -v npm >/dev/null 2>&1; then
  echo "✅ npm installed: $(npm --version)"
else
  echo "❌ npm not found"
  exit 1
fi
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "   This may take a few minutes on first run..."
npm install --silent || npm install

# Check for successful installation
if [ $? -eq 0 ]; then
  echo "✅ Dependencies installed successfully"
else
  echo "⚠️  Warning: Some dependencies may have failed, but continuing..."
fi
echo ""

# Build TypeScript (optional - for type checking)
echo "🔨 Building TypeScript..."
npm run build || echo "⚠️  Build step skipped or failed (not critical for dev)"
echo ""

# Install Playwright browsers if not already installed (for tests)
echo "🎭 Checking Playwright browsers..."
if command -v npx >/dev/null 2>&1; then
  npx playwright install chromium --with-deps 2>/dev/null || echo "⚠️  Playwright browsers not installed (will install on first test run)"
fi
echo ""

# Verify environment variables are set
echo "🔐 Checking environment variables..."
if [ -z "$VITE_SUPABASE_URL" ]; then
  echo "⚠️  Warning: VITE_SUPABASE_URL not set"
else
  echo "✅ VITE_SUPABASE_URL configured"
fi

if [ -z "$VITE_SUPABASE_ANON_KEY" ]; then
  echo "⚠️  Warning: VITE_SUPABASE_ANON_KEY not set"
else
  echo "✅ VITE_SUPABASE_ANON_KEY configured"
fi
echo ""

# Note about Supabase
echo "ℹ️  Supabase Setup:"
echo "   - Jules environment should connect to a remote Supabase instance"
echo "   - Local Supabase via Docker is NOT recommended for Jules"
echo "   - Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set"
echo ""

# Database migrations note
echo "ℹ️  Database Migrations:"
echo "   - Supabase migrations are managed via Supabase Dashboard or CLI"
echo "   - For Jules, ensure your Supabase instance is pre-configured"
echo "   - Migration files are in: supabase/migrations/"
echo ""

# Final checks
echo "📊 Environment Summary:"
echo "   - Node.js: $(node --version)"
echo "   - npm: $(npm --version)"
echo "   - Project: Neptino Educational Platform"
echo "   - Test Framework: Playwright"
echo "   - Build Tool: Vite"
echo ""

echo "✅ Environment setup complete!"
echo ""
echo "🎯 Next steps:"
echo "   - Run tests: npm test"
echo "   - Start dev server: npm run dev"
echo "   - Build for production: npm run build"
echo "   - Lint code: npm run lint"
echo ""

exit 0
