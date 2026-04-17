import { logger } from '../config/logger.js';

export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // 1. Silent 404 handling (The Noise Filter)
  if (err.statusCode === 404) {
    logger.debug(`404 Quietly Swallowed: ${req.originalUrl}`);
    
    if (req.path.includes('.') || req.originalUrl.startsWith('/editor/')) {
        return res.status(404).send('Not Found');
    }

    return res.status(404).render('pages/errors/404', {
      pageTitle: 'Page Not Found',
      statusCode: 404,
      msg: "The page you are looking for doesn't exist."
    });
  }

  // 2. Handle real system errors (500s)
  logger.error(`Critical Exception: ${err.message}`, err);

  // Return JSON for API routes
  if (req.originalUrl && req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // 3. Status-Specific Routing
  const statusTemplates = [403, 404, 500];
  if (statusTemplates.includes(err.statusCode)) {
      return res.status(err.statusCode).render(`pages/errors/${err.statusCode}`, {
          pageTitle: `${err.statusCode} | Ambassadors Assembly`,
          statusCode: err.statusCode,
          msg: err.message,
          error: process.env.NODE_ENV === 'development' ? err : {}
      });
  }

  // 4. Final Fallback (The Professional Redesign)
  res.status(err.statusCode).render('pages/error', {
    pageTitle: 'Error | Ambassadors Assembly',
    statusCode: err.statusCode,
    msg: process.env.NODE_ENV === 'production' ? 'An internal error occurred.' : err.message,
    err: process.env.NODE_ENV === 'development' ? err : {}
  });
};