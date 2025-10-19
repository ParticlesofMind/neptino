#!/usr/bin/env node

/**
 * Start the OAuth/OIDC Server
 * This server runs alongside the Vite dev server to provide OAuth endpoints
 */

import './oidc-server.js';

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down OAuth server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down OAuth server...');
  process.exit(0);
});

