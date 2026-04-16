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
import { doubleCsrfProtection, generateToken, csrfErrorHandler } from './middlewares/csrfMiddleware.js';
import { accountController } from './controllers/accountController.js';


dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==========================================
// 1. GLOBAL MIDDLEWARES (Security & Parsing)
// ==========================================
// Set Security HTTP Headers (Top 1% Security)
app.use(helmet({ contentSecurityPolicy: false })); // Disabled CSP temporarily for Cloudinary/Stripe scripts

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' })); 
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
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

// 1. Check user session early on every request (Populates req.user for CSRF stability)
app.use(authMiddleware.checkUser);

// 2. Initialize CSRF Protection Globally
app.use(doubleCsrfProtection);
app.use(csrfErrorHandler);

// 3. Pass global variables to ALL EJS Templates (with CSRF stability)
app.use((req, res, next) => {
  // Only generate a new CSRF token for HTML page requests to prevent
  // background requests (images, favicon, etc.) from rotating the token prematurely.
  if (req.accepts('html') && req.method === 'GET' && !req.xhr) {
    res.locals.csrfToken = generateToken(req, res);
  } else {
    // For non-HTML or POST requests, we just try to read the existing one for re-use if needed
    // though usually they'll use the one from the hidden field.
    res.locals.csrfToken = req.body?._csrf || req.headers["x-csrf-token"];
  }
  
  // High IQ: Set global fallbacks to prevent "is not defined" crashes
  res.locals.pageTitle = 'Ambassadors Assembly';
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



// Request Logger (High IQ Filtering)
app.use((req, res, next) => {
  const noise = ['.js', '.css', '.map', '.json', '.png', '.jpg', '/editor/'];
  const isNoise = noise.some(ext => req.url.includes(ext));

  if (!isNoise) {
    logger.info(`${req.method} ${req.originalUrl}`);
  }
  next();
});

// ==========================================
// 3. ROUTES
// ==========================================
app.use('/', indexRouter);

// Handle unhandled routes (404)
app.use((req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

// ==========================================
// 4. GLOBAL ERROR HANDLER
// ==========================================
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