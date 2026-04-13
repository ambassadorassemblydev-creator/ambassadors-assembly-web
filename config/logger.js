import winston from 'winston';

const { combine, timestamp, printf, colorize } = winston.format;

// Sleek Terminal Format
const terminalFormat = printf(({ level, message }) => {
  return `[AA] ${level}: ${message}`;
});

export const logger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 1. Sleek Console for development (No 404s will be sent here from handler)
    new winston.transports.Console({
      format: combine(colorize(), terminalFormat),
      level: 'info'
    }),
    // 2. Secret file for all the noisy 404s and errors
    new winston.transports.File({ filename: 'logs/system.log' })
  ],
});