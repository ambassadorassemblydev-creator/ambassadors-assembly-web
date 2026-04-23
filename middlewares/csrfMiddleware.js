import { csrfSync } from "csrf-sync";

const {
  invalidCsrfTokenError,
  generateToken,
  getTokenFromRequest,
  csrfSynchronisedProtection: csrfProtection,
} = csrfSync({
  // High IQ: Read from both body and header for maximum compatibility with forms and AJAX
  getTokenFromRequest: (req) => req.body._csrf || req.headers["x-csrf-token"],
});

/**
 * High IQ Error Handler
 * Specifically catches CSRF errors and returns a helpful message
 */
const csrfErrorHandler = (error, req, res, next) => {
  if (error === invalidCsrfTokenError) {
    res.status(403).json({
      error: "CSRF token mismatch.",
      message: "Your session may have expired or been refreshed. Please try again.",
      debug: {
        tokenSource: req.body._csrf ? "body" : (req.headers["x-csrf-token"] ? "header" : "none")
      }
    });
  } else {
    next(error);
  }
};

export { csrfProtection, generateToken, csrfErrorHandler };