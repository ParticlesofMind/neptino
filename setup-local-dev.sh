#!/bin/bash

# =============================================================================
# NEPTINO LOCAL DEVELOPMENT - SETUP SCRIPT
# =============================================================================
# This script sets up Neptino for local development with:
# - Supabase backend (PostgreSQL + Auth + API)
# - Vite dev server on localhost:3000
# - Hot Module Reload for smooth development
# =============================================================================

set -e

PROJECT_DIR="/Users/benjaminjacklaubacher/Neptino"

echo "🚀 Neptino Local Development Setup"
echo "=================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org/"; exit 1; }
command -v supabase >/dev/null 2>&1 || { echo "❌ Supabase CLI not found. Install with: brew install supabase/tap/supabase"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker not found. Install Docker Desktop from https://www.docker.com/products/docker-desktop"; exit 1; }

echo "✅ Node.js installed: $(node --version)"
echo "✅ Supabase CLI installed: $(supabase --version)"
echo "✅ Docker installed: $(docker --version)"
echo ""

# Navigate to project
cd "$PROJECT_DIR"
echo "📂 Working directory: $(pwd)"
echo ""

# Install dependencies
echo "📦 Installing Node dependencies..."
npm install --silent >/dev/null 2>&1
echo "✅ Dependencies installed"
echo ""

# Start Supabase
echo "🗄️  Starting Supabase backend..."
echo ""
supabase start
echo ""

# Get Supabase status and extract credentials
echo "📊 Supabase Status:"
echo "-------------------"
supabase status
echo ""

# Start Neptino dev server
echo "🎨 Starting Neptino dev server on localhost:3000..."
echo ""
npm run dev
