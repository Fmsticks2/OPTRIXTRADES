# Webhook Security Guide for OPTRIXTRADES

## Overview

This guide explains the security measures implemented for the OPTRIXTRADES Telegram bot webhook endpoint. Proper security for webhooks is essential to prevent unauthorized access and potential abuse of your bot.

## Security Measures Implemented

### 1. Request Structure Validation

All incoming webhook requests are validated to ensure they have the expected Telegram update structure. Specifically, each request must contain an `update_id` field, which is present in all legitimate Telegram updates.

```javascript
if (!req.body || !req.body.update_id) {
  logger.warn('Received invalid webhook request without proper Telegram structure');
  return res.status(403).send('Unauthorized');
}
```

### 2. Secret Token Validation

Telegram supports adding a secret token to webhook requests. When configured, Telegram will include this token in the `X-Telegram-Bot-Api-Secret-Token` header of all webhook requests.

To enable this feature:

1. Set the `TELEGRAM_WEBHOOK_SECRET` environment variable to a secure random string
2. The bot will automatically configure this secret when setting up the webhook

```javascript
const secretToken = process.env.TELEGRAM_WEBHOOK_SECRET;
if (secretToken) {
  const headerToken = req.headers['x-telegram-bot-api-secret-token'];
  if (headerToken !== secretToken) {
    logger.warn('Webhook request rejected: Invalid secret token');
    return res.status(403).send('Unauthorized');
  }
}
```

### 3. IP Address Validation

In production environments, the webhook endpoint validates that requests come from Telegram's IP ranges. This prevents attackers from sending fake updates to your bot.

The following IP ranges are allowed:
- `149.154.160.0/20`
- `91.108.4.0/22`

```javascript
if (process.env.NODE_ENV === 'production') {
  const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
  const isValidIP = TELEGRAM_IP_RANGES.some(range => ipInRange(ip, range));
  
  if (!isValidIP) {
    logger.warn(`Webhook request rejected: IP not from Telegram: ${ip}`);
    return res.status(403).send('Unauthorized');
  }
}
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_WEBHOOK_URL` | Full URL to your webhook endpoint | Yes |
| `TELEGRAM_USE_WEBHOOK` | Set to 'true' to enable webhook mode | Yes |
| `TELEGRAM_WEBHOOK_SECRET` | Secret token for webhook validation | Recommended |
| `NODE_ENV` | Set to 'production' to enable IP validation | Recommended |

## Testing Your Webhook Security

1. **Check Webhook Info**:
   ```
   https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo
   ```
   Verify that the `has_custom_certificate` field is `false` and the URL matches your webhook endpoint.

2. **Test with Invalid Token**:
   Send a request to your webhook endpoint with an incorrect or missing secret token. It should return a 403 Unauthorized response.

3. **Test with Invalid IP**:
   In production mode, send a request from a non-Telegram IP address. It should be rejected.

## Troubleshooting

- If legitimate webhook requests are being rejected, check your server logs for specific error messages
- Ensure your `TELEGRAM_WEBHOOK_SECRET` matches the one configured in the bot
- In development environments, IP validation is disabled by default to allow for local testing

## Additional Security Recommendations

1. **Use HTTPS**: Always use HTTPS for your webhook endpoint (required by Telegram)
2. **Keep Dependencies Updated**: Regularly update your dependencies to patch security vulnerabilities
3. **Monitor Logs**: Set up alerts for repeated webhook validation failures, which could indicate an attack attempt
4. **Rate Limiting**: Consider implementing rate limiting on your webhook endpoint to prevent DoS attacks