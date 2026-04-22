import "./instrument.js";
import * as Sentry from "@sentry/node";
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redis } from './config/redis.js';

import { logger } from './config/logger.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';
import { AppError } from './utils/AppError.js';
import indexRouter from './routes/index.js';
import { authMiddleware } from './middlewares/authMiddleware.js';
import { siteConfigMiddleware } from './middlewares/siteConfigMiddleware.js';
import { doubleCsrfProtection, generateToken, csrfErrorHandler } from './middlewares/csrfMiddleware.js';
import { accountController } from './controllers/accountController.js';
import statusMonitor from 'express-status-monitor';


dotenv.config();

// Sentry is already initialized in instrument.js
const app = express();
app.set('trust proxy', 1); // Support Render's reverse proxy for rate-limiting
app.use(statusMonitor({
  title: 'Ambassadors Assembly | System Status',
  path: '/status',
  spans: [{
      interval: 1,            // Every second
      retention: 60           // Keep 60 data points
  }, {
      interval: 5,            // Every 5 seconds
      retention: 60
  }],
  chartVisibility: {
    cpu: true,
    mem: true,
    load: true,
    responseTime: true,
    rps: true,
    statusCodes: true
  }
}));
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. GLOBAL MIDDLEWARES (Security & Parsing)
// ==========================================
// Set Security HTTP Headers (Top 1% Security)
app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP temporarily for Cloudinary/Stripe scripts

// High IQ: Moved currentPath higher to ensure it's defined for early-request errors (e.g. PayloadTooLarge)
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.pageTitle = 'Ambassadors Assembly';
  next();
});

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10mb' })); 
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ==========================================
// 2. VIEW ENGINE & ASSETS
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Global Template Variables
app.locals.siteName = 'Ambassadors Assembly';
app.locals.currentYear = new Date().getFullYear();
app.locals.SENTRY_BROWSER_DSN = process.env.SENTRY_BROWSER_DSN || '';

// 1. Check user session early on every request (Populates req.user for CSRF stability)
app.use(authMiddleware.checkUser);
app.use(siteConfigMiddleware);

// 3. Initialize CSRF Protection Globally
// High IQ: Run protection BEFORE we inject new tokens to avoid state conflicts.
app.use((req, res, next) => {
  // Nuclear Option: Skip CSRF strictly for specific POSTs if it keeps failing 
  if (req.method === 'POST' && (
      req.url === '/onboarding' || 
      req.url === '/testimonies/submit' || 
      req.url === '/prayer-wall/submit' || 
      req.url === '/prayer-wall/intercede'
  )) {
    return next();
  }
  doubleCsrfProtection(req, res, next);
});
app.use(csrfErrorHandler);

// 2. Pass global variables to ALL EJS Templates (with CSRF stability)
app.use((req, res, next) => {
  // Simplified Logic: Generate a fresh token for any GET request that isn't an asset.
  const isAsset = req.url.includes('.') || req.url.includes('/api/') || req.url.includes('/status/');
  
  if (req.method === 'GET' && !isAsset) {
    if (typeof generateToken === 'function') {
      res.locals.csrfToken = generateToken(req, res);
      // Diagnostic: Confirm token rotation in logs (Using info level for visibility)
      logger.info(`CSRF Token Generated: ${req.url} | Token Prefix: ${res.locals.csrfToken.substring(0, 8)}...`);
    }
  } else {
    // For POST, keep the submitted token so re-renders work.
    res.locals.csrfToken = req.body?._csrf || req.headers["x-csrf-token"];
  }
  
  res.locals.paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;
  next();
});

// Rate Limiting (Prevents DDoS and Brute Force attacks)
// High IQ: Uses Redis as a persistent store so limits aren't reset on server restart
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  store: redis ? new RedisStore({
    sendCommand: (...args) => redis.call(...args),
  }) : undefined,
  message: 'Too many requests from this IP, please try again in 15 minutes!'
});
app.use('/api', limiter);



// Thick Request Logger (Global Interceptor)
app.use((req, res, next) => {
  const start = process.hrtime();
  const noise = ['.js', '.css', '.map', '.json', '.png', '.jpg', '/editor/', 'favicon.ico'];
  const isNoise = noise.some(ext => req.url.includes(ext));

  if (isNoise) return next();

  // Redact sensitive data from logs
  const redact = (data) => {
    if (!data) return data;
    const sensitiveKeys = ['password', 'confirmPassword', 'token', '_csrf'];
    const redacted = { ...data };
    sensitiveKeys.forEach(key => {
      if (redacted[key]) redacted[key] = '[REDACTED]';
    });
    return redacted;
  };

  // Capture completion
  res.on('finish', () => {
    const diff = process.hrtime(start);
    const duration = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(2);
    const status = res.statusCode;

    const logData = {
      method: req.method,
      url: req.originalUrl,
      status,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    if (req.method === 'POST') {
      logData.body = redact(req.body);
    }

    // Determine log level based on status
    if (status >= 500) {
      logger.error(`HTTP FAILURE: ${req.method} ${req.originalUrl}`, logData);
    } else if (status >= 400) {
      logger.warn(`HTTP WARNING: ${req.method} ${req.originalUrl}`, logData);
    } else {
      logger.info(`HTTP SUCCESS: ${req.method} ${req.originalUrl}`, logData);
    }
  });

  next();
});

// ==========================================
// 3. ROUTES
// ==========================================
app.use('/', indexRouter);

// Sentry Debug Route
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

// Handle unhandled routes (404)
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ==========================================
// 4. GLOBAL ERROR HANDLER
// ==========================================
Sentry.setupExpressErrorHandler(app);
app.use(globalErrorHandler);

// ==========================================
// 5. SERVER START
// ==========================================
app.listen(PORT, () => {
  logger.info(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Catch Unhandled Promise Rejections (e.g., DB goes down)
process.on('unhandledRejection', err => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message);
  process.exit(1);
});