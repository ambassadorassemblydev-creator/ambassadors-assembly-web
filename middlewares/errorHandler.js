import { logger } from '../config/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 1. Silent 404 handling (The Noise Filter)
  if (err.statusCode === 404) {
    // Log 404s quietly to the file ONLY, not the terminal
    logger.debug(`404 Quietly Swallowed: ${req.originalUrl}`);
    
    // If it's a browser requesting a missing .js or .css file, just send a 404 and STOP
    if (req.path.includes('.') || req.originalUrl.startsWith('/editor/')) {
        return res.status(404).send('Not Found');
    }

    // If it's a real page request, render the error page
    return res.status(404).render('pages/error', {
      pageTitle: 'Page Not Found',
      statusCode: 404,
      msg: "The page you are looking for doesn't exist."
    });
  }

  // 2. Handle real system errors (500s)
  logger.error(`Critical Error: ${err.message}`);

  // Return JSON for API routes
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  if (process.env.NODE_ENV === 'development') {
    res.status(err.statusCode).render('pages/error', {
      pageTitle: 'Error',
      statusCode: err.statusCode,
      msg: err.message
    });
  } else {
    // Production: Hide details
    res.status(500).render('pages/error', {
      pageTitle: 'System Error',
      statusCode: 500,
      msg: 'An internal error occurred.'
    });
  }
};