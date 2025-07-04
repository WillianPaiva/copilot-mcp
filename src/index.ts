#!/usr/bin/env node

import { config } from 'dotenv';
import { CopilotMCPServer } from './server.js';
import { ServerConfig } from './types.js';

config();


console.log('CLI runing aplication: copilot-mcp-server is running');
function loadConfig(): ServerConfig {
  const githubConfig = {
    token: process.env.GITHUB_TOKEN,
    appId: process.env.GITHUB_APP_ID,
    privateKeyPath: process.env.GITHUB_APP_PRIVATE_KEY_PATH,
    installationId: process.env.GITHUB_INSTALLATION_ID,
    org: process.env.GITHUB_ORG,
  };

  // Note: We don't check for authentication here as the CopilotClient will auto-detect
  // GitHub Copilot tokens from the standard config files

  return {
    github: githubConfig,
    logLevel: (process.env.LOG_LEVEL as any) || 'info',
    debug: process.env.DEBUG === 'true',
    maxRequestsPerMinute: parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60'),
  };
}

async function main() {
  console.log('CLI inside main: copilot-mcp-server is running');
  try {
    console.error('Starting Copilot MCP Server...');
    const serverConfig = loadConfig();
    console.error('Configuration loaded successfully');
    
    const server = new CopilotMCPServer(serverConfig);
    console.error('Server instance created');
    
    process.on('SIGINT', () => {
      console.error('Received SIGINT, shutting down gracefully...');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.error('Received SIGTERM, shutting down gracefully...');
      process.exit(0);
    });

    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      process.exit(1);
    });

    await server.start();
    console.error('Server started successfully and waiting for connections...');
  } catch (error) {
    console.error('Failed to start Copilot MCP Server:', error);
    console.error('Error details:', error instanceof Error ? error.stack : error);
    process.exit(1);
  }
}

// Always run main when this file is executed directly
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
