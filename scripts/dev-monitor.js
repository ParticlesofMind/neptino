#!/usr/bin/env node

/**
 * Development Server Monitor
 * Monitors the Vite dev server and restarts it if it crashes
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

let devServer = null;
let restartCount = 0;
const maxRestarts = 5;
const restartDelay = 2000; // 2 seconds

function log(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

function startDevServer() {
  if (restartCount >= maxRestarts) {
    log(`❌ Maximum restart attempts (${maxRestarts}) reached. Please check your configuration.`);
    process.exit(1);
  }

  log(`🚀 Starting Vite dev server (attempt ${restartCount + 1})`);

  devServer = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true,
    cwd: process.cwd()
  });

  devServer.on('close', (code) => {
    if (code !== 0) {
      restartCount++;
      log(`⚠️  Dev server exited with code ${code}. Restarting in ${restartDelay}ms...`);
      setTimeout(startDevServer, restartDelay);
    } else {
      log('✅ Dev server stopped gracefully');
    }
  });

  devServer.on('error', (err) => {
    log(`❌ Failed to start dev server: ${err.message}`);
    restartCount++;
    setTimeout(startDevServer, restartDelay);
  });

  // Reset restart count on successful start
  setTimeout(() => {
    if (devServer && !devServer.killed) {
      restartCount = 0;
      log('✅ Dev server running stably');
    }
  }, 10000); // Consider stable after 10 seconds
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  log('🛑 Shutting down dev server monitor');
  if (devServer) {
    devServer.kill('SIGTERM');
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('🛑 Received SIGTERM, shutting down');
  if (devServer) {
    devServer.kill('SIGTERM');
  }
  process.exit(0);
});

// Start the server
log('🔍 Starting development server monitor');
startDevServer();
