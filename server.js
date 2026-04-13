import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';


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

// 1. Initialize CSRF Protection Globally
app.use(doubleCsrfProtection);
app.use(csrfErrorHandler);

// 2. Pass the CSRF Token to ALL EJS Templates automatically
app.use((req, res, next) => {
  res.locals.csrfToken = generateToken(req, res);
  next();
});

// Rate Limiting (Prevents DDoS and Brute Force attacks)
const limiter = rateLimit({
  max: 100, // Limit each IP to 100 requests per windowMs
  windowMs: 60 * 60 * 1000, // 1 Hour
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// ==========================================
// 2. VIEW ENGINE & ASSETS
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Global Template Variables
app.locals.siteName = 'Ambassadors Assembly';
app.locals.currentYear = new Date().getFullYear();

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
// Check for a logged-in user on EVERY page load
app.use(authMiddleware.checkUser);

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