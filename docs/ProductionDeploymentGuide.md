# Production Deployment Guide for OPTRIXTRADES Telegram Bot

This guide provides comprehensive instructions for deploying the OPTRIXTRADES Telegram bot to a production environment. Following these steps will ensure a secure, stable, and scalable deployment.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Preparation](#environment-preparation)
3. [Application Deployment](#application-deployment)
4. [Database Setup](#database-setup)
5. [Redis Configuration](#redis-configuration)
6. [Webhook Configuration](#webhook-configuration)
7. [Process Management](#process-management)
8. [Monitoring and Logging](#monitoring-and-logging)
9. [Backup Strategy](#backup-strategy)
10. [Security Considerations](#security-considerations)
11. [Scaling Considerations](#scaling-considerations)
12. [Maintenance Procedures](#maintenance-procedures)

## Prerequisites

Before deploying to production, ensure you have:

- A Linux server (Ubuntu 20.04 LTS or later recommended)
- Domain name with SSL certificate
- Node.js (v14.x or later)
- PostgreSQL (v12 or later)
- Redis (v6 or later)
- Git
- Nginx or another reverse proxy
- PM2 or another process manager

## Environment Preparation

### Update System Packages

```bash
sudo apt update
sudo apt upgrade -y
```

### Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
```

### Install PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
```

### Install Redis

```bash
sudo apt install redis-server -y
```

### Configure Redis for Production

Edit the Redis configuration file:

```bash
sudo nano /etc/redis/redis.conf
```

Make the following changes:

1. Set `supervised systemd`
2. Set a strong password: `requirepass your_strong_password`
3. Bind to localhost only: `bind 127.0.0.1`

Restart Redis:

```bash
sudo systemctl restart redis
```

### Install Nginx

```bash
sudo apt install nginx -y
```

### Install PM2

```bash
sudo npm install -g pm2
```

## Application Deployment

### Create Application Directory

```bash
sudo mkdir -p /var/www/optrixtrades
sudo chown $USER:$USER /var/www/optrixtrades
```

### Clone Repository

```bash
cd /var/www/optrixtrades
git clone https://your-repository-url.git .
```

### Install Dependencies

```bash
npm ci --production
```

### Create Production Environment File

Create a `.env.production` file:

```bash
nano .env.production
```

Add the following configuration (adjust values as needed):

```
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_ADMIN_IDS=admin_id_1,admin_id_2
TELEGRAM_CHANNEL_ID=your_channel_id
TELEGRAM_WEBHOOK_URL=https://your-domain.com

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=optrixtrades
DB_USER=optrixtrades_user
DB_PASSWORD=your_strong_password

# Redis Configuration
REDIS_URL=redis://:your_redis_password@localhost:6379

# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_BUCKET_NAME=optrixtrades-files

# Server Configuration
PORT=8080
NODE_ENV=production
LOG_LEVEL=info
IS_RENDER=true
```

> **IMPORTANT**: For security reasons, `.env` and `.env.production` files are excluded from Git via `.gitignore`. Never commit these files to your repository as they contain sensitive information. For detailed instructions on managing environment variables, see `docs/EnvironmentVariablesGuide.md`.

## Database Setup

### Create Database and User

```bash
sudo -u postgres psql
```

In the PostgreSQL prompt:

```sql
CREATE DATABASE optrixtrades;
CREATE USER optrixtrades_user WITH ENCRYPTED PASSWORD 'your_strong_password';
GRANT ALL PRIVILEGES ON DATABASE optrixtrades TO optrixtrades_user;
\q
```

### Run Database Migrations

If you're using a migration tool like Knex.js:

```bash
NODE_ENV=production npm run migrate
```

## Redis Configuration

Redis should already be configured from the environment preparation steps. Verify it's working:

```bash
redis-cli -a your_redis_password ping
```

You should receive a `PONG` response.

## Webhook Configuration

### Configure Nginx

Create a new Nginx configuration file:

```bash
sudo nano /etc/nginx/sites-available/optrixtrades
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    
    # Bot Webhook
    location /bot {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health Check Endpoint
    location /health {
        proxy_pass http://localhost:8080/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the configuration and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/optrixtrades /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Set Up SSL Certificate

Install Certbot:

```bash
sudo apt install certbot python3-certbot-nginx -y
```

Obtain SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com
```

### Set Webhook URL

Create a script to set the webhook URL:

```bash
nano scripts/set-webhook.js
```

Add the following code:

```javascript
require('dotenv').config({ path: '.env.production' });
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const webhookUrl = process.env.TELEGRAM_WEBHOOK_URL;

async function setWebhook() {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}/bot${token}`
    );
    console.log('Webhook set successfully:', response.data);
  } catch (error) {
    console.error('Error setting webhook:', error.message);
  }
}

setWebhook();
```

Run the script:

```bash
node scripts/set-webhook.js
```

## Process Management

### Create PM2 Configuration

Create a PM2 ecosystem file:

```bash
nano ecosystem.config.js
```

Add the following configuration:

```javascript
module.exports = {
  apps: [{
    name: 'optrixtrades-bot',
    script: 'src/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    env_file: '.env.production',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

### Start the Application

```bash
pm2 start ecosystem.config.js
```

### Configure PM2 to Start on Boot

```bash
pm2 startup
```

Follow the instructions provided by PM2 to set up the startup script.

```bash
pm2 save
```

## Monitoring and Logging

### Configure Application Logging

Ensure your application uses a proper logging system. If using Winston, configure it to write to files in production:

```javascript
// src/utils/logger.js
const winston = require('winston');
const path = require('path');

const logDir = process.env.NODE_ENV === 'production' ? '/var/log/optrixtrades' : './logs';

// Create log directory if it doesn't exist
const fs = require('fs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'optrixtrades-bot' },
  transports: [
    // Write to console in all environments
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // Write to files in production
    ...(process.env.NODE_ENV === 'production' ? [
      new winston.transports.File({ filename: path.join(logDir, 'error.log'), level: 'error' }),
      new winston.transports.File({ filename: path.join(logDir, 'combined.log') })
    ] : [])
  ],
});

module.exports = logger;
```

### Create Log Directory

```bash
sudo mkdir -p /var/log/optrixtrades
sudo chown $USER:$USER /var/log/optrixtrades
```

### Set Up Log Rotation

Create a logrotate configuration:

```bash
sudo nano /etc/logrotate.d/optrixtrades
```

Add the following configuration:

```
/var/log/optrixtrades/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reload optrixtrades-bot
    endscript
}
```

### Monitor with PM2

View logs:

```bash
pm2 logs optrixtrades-bot
```

Monitor application:

```bash
pm2 monit
```

## Backup Strategy

### Database Backup

Create a backup script:

```bash
nano scripts/backup-db.sh
```

Add the following content:

```bash
#!/bin/bash

# Load environment variables
source /var/www/optrixtrades/.env.production

# Set backup directory
BACKUP_DIR="/var/backups/optrixtrades/database"
MKDIR -p $BACKUP_DIR

# Set filename with date
FILENAME="optrixtrades_$(date +%Y%m%d_%H%M%S).sql"

# Create backup
PGPASSWORD=$DB_PASSWORD pg_dump -h $DB_HOST -U $DB_USER -d $DB_NAME -F c -f "$BACKUP_DIR/$FILENAME"

# Compress backup
gzip "$BACKUP_DIR/$FILENAME"

# Remove backups older than 30 days
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +30 -delete
```

Make the script executable:

```bash
chmod +x scripts/backup-db.sh
```

Set up a cron job to run the backup daily:

```bash
crontab -e
```

Add the following line:

```
0 2 * * * /var/www/optrixtrades/scripts/backup-db.sh >> /var/log/optrixtrades/backup.log 2>&1
```

### Application Backup

Set up a cron job to back up the application code:

```bash
crontab -e
```

Add the following line:

```
0 3 * * * tar -czf /var/backups/optrixtrades/app_$(date +\%Y\%m\%d_\%H\%M\%S).tar.gz -C /var/www optrixtrades --exclude="optrixtrades/node_modules" >> /var/log/optrixtrades/backup.log 2>&1
```

## Security Considerations

### Firewall Configuration

Install and configure UFW (Uncomplicated Firewall):

```bash
sudo apt install ufw -y
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw enable
```

### Secure PostgreSQL

Edit PostgreSQL configuration:

```bash
sudo nano /etc/postgresql/12/main/pg_hba.conf
```

Ensure it only allows local connections with password authentication.

### Secure Environment Variables

Restrict access to environment files:

```bash
chmod 600 .env.production
```

### Regular Security Updates

Set up automatic security updates:

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Scaling Considerations

### Horizontal Scaling

If you need to scale the application horizontally:

1. Set up multiple application servers
2. Use a load balancer (e.g., Nginx or HAProxy)
3. Ensure session persistence if needed
4. Use a centralized Redis instance for shared state

### Vertical Scaling

For vertical scaling:

1. Increase server resources (CPU, RAM)
2. Optimize application performance
3. Consider using PM2 cluster mode:

```javascript
module.exports = {
  apps: [{
    name: 'optrixtrades-bot',
    script: 'src/index.js',
    instances: 'max', // Use all available CPUs
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
    },
    env_file: '.env.production',
  }]
};
```

## Maintenance Procedures

### Deploying Updates

Create a deployment script:

```bash
nano scripts/deploy.sh
```

Add the following content:

```bash
#!/bin/bash

set -e

cd /var/www/optrixtrades

# Pull latest changes
git pull

# Install dependencies
npm ci --production

# Run migrations if needed
NODE_ENV=production npm run migrate

# Restart the application
pm2 reload optrixtrades-bot

# Set webhook URL (in case it changed)
node scripts/set-webhook.js

echo "Deployment completed successfully"
```

Make the script executable:

```bash
chmod +x scripts/deploy.sh
```

### Monitoring System Health

Install and configure a monitoring tool like Prometheus with Grafana or use a service like New Relic or Datadog.

### Regular Maintenance Tasks

Set up regular maintenance tasks:

1. Log rotation (already configured)
2. Database vacuuming:

```bash
crontab -e
```

Add:

```
0 4 * * 0 PGPASSWORD=$DB_PASSWORD vacuumdb -h $DB_HOST -U $DB_USER -d $DB_NAME -z >> /var/log/optrixtrades/vacuum.log 2>&1
```

3. Check disk space regularly:

```bash
crontab -e
```

Add:

```
0 5 * * * df -h / /var/www /var/log | mail -s "Disk Space Report for OPTRIXTRADES Server" your-email@example.com
```

---

By following this comprehensive guide, you should have a robust, secure, and scalable production deployment of the OPTRIXTRADES Telegram bot. Remember to regularly review logs, monitor performance, and apply security updates to maintain a healthy production environment.