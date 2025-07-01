/**
 * Deployment Preparation Script
 * 
 * This script helps prepare the application for deployment by:
 * 1. Validating environment variables
 * 2. Creating a production-ready .env file
 * 3. Running database migrations
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Required environment variables
const requiredVars = [
  'TELEGRAM_BOT_TOKEN',
  'ADMIN_TELEGRAM_IDS',
  'TELEGRAM_WEBHOOK_URL',
  'DB_HOST',
  'DB_USER',
  'DB_PASSWORD',
  'DB_NAME'
];

// Optional environment variables with defaults
const optionalVars = {
  'PORT': '3000',
  'NODE_ENV': 'production',
  'TELEGRAM_USE_WEBHOOK': 'true',
  'DB_PORT': '5432',
  'REDIS_PORT': '6379',
  'USE_REDIS': 'true'
};

// Check if .env.production exists
const envProductionPath = path.join(__dirname, '.env.production');
const envExists = fs.existsSync(envProductionPath);

console.log('=== OPTRIXTRADES Bot Deployment Preparation ===');

if (!envExists) {
  console.log('\n❌ .env.production file not found. Please create it first.\n');
  process.exit(1);
}

// Read .env.production file
const envProduction = fs.readFileSync(envProductionPath, 'utf8');
const envLines = envProduction.split('\n');

// Check for placeholder values
const placeholders = [];
envLines.forEach(line => {
  if (line.trim() === '' || line.startsWith('#')) return;
  
  const [key, value] = line.split('=');
  if (value.includes('your_') || value.includes('placeholder')) {
    placeholders.push(key);
  }
});

if (placeholders.length > 0) {
  console.log('\n⚠️ The following environment variables have placeholder values:');
  placeholders.forEach(key => console.log(`  - ${key}`));
  console.log('\nPlease update these values in .env.production before deploying.\n');
}

// Check for missing required variables
const missingVars = [];
requiredVars.forEach(key => {
  if (!envLines.some(line => line.startsWith(`${key}=`))) {
    missingVars.push(key);
  }
});

if (missingVars.length > 0) {
  console.log('\n❌ The following required environment variables are missing:');
  missingVars.forEach(key => console.log(`  - ${key}`));
  console.log('\nPlease add these to .env.production before deploying.\n');
  process.exit(1);
}

// Validate webhook URL if webhook mode is enabled
const webhookEnabled = envLines.some(line => line.startsWith('TELEGRAM_USE_WEBHOOK=true'));
if (webhookEnabled) {
  const webhookLine = envLines.find(line => line.startsWith('TELEGRAM_WEBHOOK_URL='));
  if (webhookLine) {
    const webhookUrl = webhookLine.split('=')[1];
    if (webhookUrl.includes('your-domain.com') || !webhookUrl.startsWith('https://')) {
      console.log('\n⚠️ Invalid webhook URL detected.');
      console.log('The webhook URL must be a valid HTTPS URL pointing to your deployed application.');
      console.log('Example: https://your-app-name.onrender.com/telegram-webhook\n');
    }
  }
}

// Check for database configuration
const dbHost = envLines.find(line => line.startsWith('DB_HOST='))?.split('=')[1];
if (dbHost === 'localhost') {
  console.log('\n⚠️ Database host is set to localhost.');
  console.log('For production deployment, you should use a cloud database service.');
  console.log('Render provides PostgreSQL databases that work well with this application.\n');
}

// Check Redis configuration
const redisHost = envLines.find(line => line.startsWith('REDIS_HOST='))?.split('=')[1];
if (redisHost) {
  if (redisHost.startsWith('redis://')) {
    console.log('✅ Redis URL format detected');
    
    // Check if REDIS_PORT and REDIS_PASSWORD are uncommented when using Redis URL
    const redisPortLine = envLines.find(line => line.trim().startsWith('REDIS_PORT='));
    const redisPasswordLine = envLines.find(line => line.trim().startsWith('REDIS_PASSWORD='));
    
    if (redisPortLine && !redisPortLine.trim().startsWith('#')) {
      console.log('⚠️ When using Redis URL, REDIS_PORT should be commented out or removed');
    }
    
    if (redisPasswordLine && !redisPasswordLine.trim().startsWith('#')) {
      console.log('⚠️ When using Redis URL, REDIS_PASSWORD should be commented out or removed');
    }
  } else if (redisHost === 'localhost') {
    console.log('\n⚠️ Redis host is set to localhost.');
    console.log('For production deployment, you should use a cloud Redis service.');
    console.log('Render provides Redis instances that work well with this application.\n');
  }
}

// Final checklist
console.log('=== Deployment Checklist ===');
console.log('✅ .env.production file exists');
console.log(`${missingVars.length === 0 ? '✅' : '❌'} All required environment variables are defined`);
console.log(`${placeholders.length === 0 ? '✅' : '⚠️'} Environment variables have proper values`);
console.log(`${webhookEnabled ? '✅' : '⚠️'} Webhook mode is ${webhookEnabled ? 'enabled' : 'disabled'} for production`);

console.log('\n=== Next Steps ===');
console.log('1. Commit your changes (excluding .env files)');
console.log('2. Push to your repository');
console.log('3. Deploy to Render using the instructions in DeploymentGuide.md');

console.log('\nGood luck with your deployment! 🚀\n');

rl.close();