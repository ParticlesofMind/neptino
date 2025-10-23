#!/bin/bash
# Jules Setup Script for Neptino
# Simple commands for dependency installation and environment prep

# Install Node dependencies
npm install

# Build the project
npm run build

# Install Playwright browsers for testing
npx playwright install chromium --with-deps
