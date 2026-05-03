import "./instrument.js";
import * as Sentry from "@sentry/node";
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import cors from 'cors';
import { RedisStore as RateLimitRedisStore } from 'rate-limit-redis';


import { redis } from './config/redis.js';
import session from 'express-session';
import RedisStore from "connect-redis";



import { logger } from './config/logger.js';
import { globalErrorHandler } from './middlewares/errorHandler.js';
import { AppError } from './utils/AppError.js';
import indexRouter from './routes/index.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { authMiddleware } from './middlewares/authMiddleware.js';
import { siteConfigMiddleware } from './middlewares/siteConfigMiddleware.js';
import { csrfProtection, generateToken, csrfErrorHandler } from './middlewares/csrfMiddleware.js';

import { accountController } from './controllers/accountController.js';
import statusMonitor from 'express-status-monitor';


dotenv.config();

// Sentry is already initialized in instrument.js
const app = express();

// ==========================================
// 🛡️ BOT SHIELD MIDDLEWARE
// Silently handle common bot scans (WP, etc) to keep logs clean
// ==========================================
const BOT_PATHS = [
  '/wp-includes/', 
  '/wp-admin/', 
  '/.env', 
  '/wlwmanifest.xml', 
  '/xmlrpc.php',
  '/wp-content/'
];
app.use((req, res, next) => {
  if (BOT_PATHS.some(path => req.url.includes(path))) {
    // High IQ: Silent 404 - no logging, just drop
    return res.status(404).send('Not Found');
  }
  next();
});

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

// 0. COMPRESSION (High IQ: Must be first to compress all responses)
app.use(compression());

// High IQ: Allow Admin Portal to talk to API
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://172.28.48.1:3000', process.env.ADMIN_PORTAL_URL].filter(Boolean),
  credentials: true
}));


// ==========================================
// 1. GLOBAL MIDDLEWARES (Security & Parsing)
// ==========================================

// Rate Limiter (High IQ Security)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RateLimitRedisStore({
    sendCommand: (...args) => redis.call(...args),
  }),
  message: { error: "Too many attempts. Please try again in 15 minutes." }
});



// Set Security HTTP Headers (High IQ: Enabling CSP with specific exceptions)
// Set Security HTTP Headers (High IQ: Enabling CSP with specific exceptions)
app.use(helmet({
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://checkout.paystack.com", "https://js.paystack.co", "https://www.google.com/recaptcha/", "https://www.gstatic.com/recaptcha/", "https://js.sentry-cdn.com", "https://unpkg.com", "https://*.unpkg.com", "https://uptime.betterstack.com", "https://*.betterstack.com", "https://*.multiscreensite.com", "https://code.jquery.com", "https://*.supabase.co", "https://*.dudacdn.net", "https://static-cdn.dwhitelabel.com", "https://irp.cdn-website.com", "https://lirp.cdn-website.com", "https://www.googletagmanager.com", "https://*.google-analytics.com", "https://vapi.ai", "https://*.vapi.ai", "https://api.elevenlabs.io", "https://storage.googleapis.com"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://unpkg.com", "https://uptime.betterstack.com", "https://*.betterstack.com", "https://*.supabase.co", "https://*.dudacdn.net", "https://static-cdn.dwhitelabel.com", "https://*.multiscreensite.com"],
      "img-src": ["'self'", "data:", "https://res.cloudinary.com", "https://irp.cdn-website.com", "https://lirp.cdn-website.com", "https://*.cdn-website.com", "https://static.cdn-website.com", "https://*.unsplash.com", "https://api.dicebear.com", "https://*.cloudinary.com", "https://*.multiscreensite.com", "https://*.betterstack.com", "https://*.betteruptime.com", "https://*.supabase.co", "https://*.duda.co", "https://*.dudacdn.net", "https://i.ytimg.com", "https://*.ytimg.com", "https://*.youtube.com", "https://www.gstatic.com"],
      "connect-src": ["'self'", "data:", "https://res.cloudinary.com", "https://*.cloudinary.com", "https://irp.cdn-website.com", "https://lirp.cdn-website.com", "https://*.cdn-website.com", "https://*.unsplash.com", "https://api.dicebear.com", "https://cdnjs.cloudflare.com", "https://code.jquery.com", "https://www.gstatic.com", "https://api.paystack.co", "https://www.google.com/recaptcha/", "https://www.google-analytics.com", "https://*.google-analytics.com", "https://www.googletagmanager.com", "https://vitals.vercel-insights.com", "*.sentry.io", "https://rtc.multiscreensite.com", "https://*.multiscreensite.com", "https://cdn.jsdelivr.net", "https://sourcemaps-lambda.dwhitelabel.com", "https://unpkg.com", "https://*.unpkg.com", "https://uptime.betterstack.com", "https://*.betterstack.com", "https://*.supabase.co", "wss://*.supabase.co", "https://bxlmmvunfyvsbqakgxed.supabase.co", "wss://bxlmmvunfyvsbqakgxed.supabase.co", "https://vapi.ai", "https://*.vapi.ai", "wss://*.vapi.ai", "https://api.elevenlabs.io", "wss://api.elevenlabs.io"],
      "frame-src": ["'self'", "https://ambassadors.betteruptime.com", "https://*.betterstack.com", "https://checkout.paystack.com", "https://paystack.com", "https://pstk.co", "https://www.youtube.com", "https://*.youtube.com", "https://*.youtube-nocookie.com", "https://player.vimeo.com", "https://*.supabase.co", "https://www.google.com", "https://www.google.com/recaptcha/"],
      "font-src": ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "data:", "https://*.multiscreensite.com", "https://static.cdn-website.com", "https://static-cdn.dwhitelabel.com", "https://irp.cdn-website.com", "https://lirp.cdn-website.com", "https://*.betterstack.com", "https://*.betteruptime.com", "https://unpkg.com", "https://*.supabase.co", "https://*.dudacdn.net"],
      "media-src": ["'self'", "https://res.cloudinary.com", "https://*.cloudinary.com", "https://*.supabase.co"],
      "script-src-attr": ["'unsafe-inline'"],
      "object-src": ["'none'"],
      "upgrade-insecure-requests": []
    }


  },
  crossOriginEmbedderPolicy: false
}));



// Apply rate limiting to sensitive routes
app.use('/account/login', authLimiter);
app.use('/account/register', authLimiter);
app.use('/auth/reset-password', authLimiter);


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

// High IQ: Session configuration using Redis for persistence
// Setting a specific name and domain for cross-subdomain compatibility
app.use(session({
  name: 'aa_session_v1',
  store: redis ? new RedisStore({ client: redis, prefix: "aa_sess:" }) : undefined,
  secret: process.env.SESSION_SECRET || "AA-AMBASSADORS-SESSION-KEY-2024",
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.theambassadorsassembly.org' : undefined,
    maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
  }
}));


// ==========================================
// 2. VIEW ENGINE & ASSETS
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  etag: true,
  lastModified: true
}));
app.get('/favicon.ico', (req, res) => res.status(204).end());

// Global Template Variables
app.locals.siteName = 'Ambassadors Assembly';
app.locals.currentYear = new Date().getFullYear();
app.locals.SENTRY_BROWSER_DSN = process.env.SENTRY_BROWSER_DSN || '';

// 1. Check user session early on every request (Populates req.user for CSRF stability)
app.use(authMiddleware.checkUser);
app.use(siteConfigMiddleware);

// Maintenance Mode Interceptor
app.use((req, res, next) => {
  const isMaintenance = res.locals.churchSettings?.maintenance_mode === 'true';
  const allowedPaths = ['/maintenance', '/auth/login', '/auth/logout', '/api/health', '/status', '/css', '/js', '/images', '/fonts'];
  const isAllowed = allowedPaths.some(path => req.path.startsWith(path));

  if (isMaintenance && !isAllowed && (!req.user || req.user.role !== 'admin')) {
    return res.redirect('/maintenance');
  }
  next();
});

// 3. Initialize CSRF Protection Globally
// High IQ: No more exclusions needed as csrf-sync is rock solid with sessions.
app.use(csrfProtection);
app.use(csrfErrorHandler);


// 4. Pass global variables to ALL EJS Templates (with CSRF stability)
app.use((req, res, next) => {
  // Simplified Logic: Generate a fresh token for any GET request that isn't an asset.
  const isAsset = req.url.includes('.') || req.url.includes('/status/');
  const isAPI = req.url.startsWith('/api/');
  
  if (req.method === 'GET' && !isAsset && !isAPI) {
    if (typeof generateToken === 'function') {
      res.locals.csrfToken = generateToken(req, res);
      // Diagnostic: Confirm token rotation in logs
      logger.info(`[CSRF] Generated: ${req.url} | SESS: ${req.sessionID?.substring(0, 8)}...`);
    }
  } else {
    // For non-GET or assets, attempt to reuse the existing token
    res.locals.csrfToken = req.body?._csrf || req.headers["x-csrf-token"];
  }
  
  res.locals.paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY;
  res.locals.recaptchaSiteKey = process.env.RECAPTCHA_SITE_KEY;
  next();
});

// Rate Limiting (Prevents DDoS and Brute Force attacks)
// High IQ: Uses Redis as a persistent store so limits aren't reset on server restart
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  store: redis ? new RateLimitRedisStore({
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
app.use('/api/notifications', notificationRoutes);


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