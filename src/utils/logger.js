import { createLogger, format, transports } from 'winston';

const LogLevel = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug',
};

// Define a custom format for log messages
const customFormat = format.printf(({ level, message, timestamp }) => `${timestamp} [${level}] - ${message}`);

// Export the configured logger
const logger = createLogger({
  level: LogLevel.INFO,

  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSS' }),
    format.json(), // Output log as JSON
    customFormat,
  ),

  transports: [new transports.Console()],
});

export default logger;
