import { createLogger, format, transports } from 'winston';
import path from 'path';
import fs from 'fs';

const logDir = path.join(process.cwd(), 'logs');

try {
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
} catch (err) {
  // eslint-disable-next-line no-console
  console.error('Failed to create logs directory:', err.message);
}

const razorpayWebhookLogger = createLogger({
  level: 'info',

  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
    format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}] - ${message}`;
    }),
  ),

  transports: [
    new transports.File({
      filename: path.join(logDir, 'razorpay-webhook.log'),
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
});

export default razorpayWebhookLogger;
