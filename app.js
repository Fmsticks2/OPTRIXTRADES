/**
 * OPTRIXTRADES Bot - Main Entry Point
 * 
 * This file serves as the entry point for the OPTRIXTRADES Telegram bot application.
 * It initializes the bot and all required services.
 * 
 * The bot can run in two modes:
 * 1. Polling mode - The bot polls Telegram servers for updates (default)
 * 2. Webhook mode - Telegram sends updates to our webhook endpoint
 * 
 * The mode is determined by the TELEGRAM_USE_WEBHOOK environment variable.
 */

// Start the bot
require('./src/index');

console.log('OPTRIXTRADES Bot application started');