import winston from 'winston';

const { combine, timestamp, printf, colorize, json, errors } = winston.format;

// High-Fidelity Terminal Format
const terminalFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
  let metaStr = Object.keys(meta).length ? `\n   ${JSON.stringify(meta, null, 2)}` : '';
  
  // If there's an error stack, append it
  const logContent = stack || message;
  
  return `${timestamp} ${level}: ${logContent}${metaStr}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true })
  ),
  transports: [
    // 1. Sleek Console for development
    new winston.transports.Console({
      format: combine(
        colorize({ all: true }),
        terminalFormat
      )
    }),
    // 2. Structured JSON for all system logs (Persistent)
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      format: combine(timestamp(), json())
    }),
    // 3. Dedicated Error Log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      format: combine(timestamp(), json())
    })
  ],
});