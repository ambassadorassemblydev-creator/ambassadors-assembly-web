import { csrfSync } from "csrf-sync";

const {
  invalidCsrfTokenError,
  generateToken,
  getTokenFromRequest,
  csrfSynchronisedProtection,
} = csrfSync({
  // High IQ: Read from both body and header for maximum compatibility with forms and AJAX
  getTokenFromRequest: (req) => (req.body ? req.body._csrf : undefined) || req.headers["x-csrf-token"],
});

/**
 * High IQ Wrapper for CSRF Protection
 * Skips CSRF if the request is authenticated via Bearer token (API usage from Admin Portal)
 */
const csrfProtection = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return next();
  }
  return csrfSynchronisedProtection(req, res, next);
};

/**
 * High IQ Error Handler
 * Specifically catches CSRF errors and returns a helpful message
 */
const csrfErrorHandler = (error, req, res, next) => {
  if (error === invalidCsrfTokenError) {
    // High IQ: If it's an AJAX request, return JSON. Otherwise, redirect back with error.
    if (req.xhr || req.headers.accept?.includes('json')) {
      return res.status(403).json({
        error: "CSRF token mismatch.",
        message: "Your session may have expired or been refreshed. Please try again."
      });
    }
    
    // Redirect back to previous page with an error query param
    const backURL = req.header('Referer') || '/';
    const separator = backURL.includes('?') ? '&' : '?';
    res.redirect(`${backURL}${separator}error=Security session expired. Please try again.`);
  } else {
    next(error);
  }
};

export { csrfProtection, generateToken, csrfErrorHandler };