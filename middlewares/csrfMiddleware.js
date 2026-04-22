import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { doubleCsrf } = require("csrf-csrf");

const csrfSecret = process.env.CSRF_SECRET || "AA-SUPER-SECRET-32-CHAR-KEY-1234567890";

const {
  invalidCsrfTokenError,
  doubleCsrfProtection,
  generateCsrfToken: generateToken,
} = doubleCsrf({
  getSecret: () => csrfSecret,
  // High IQ Resilience: Restore session identifier to satisfy library token hashing logic.
  getSessionIdentifier: () => "static-session",
  cookieName: "aa.csrf",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req) => req.body._csrf || req.headers["x-csrf-token"],
});

const csrfErrorHandler = (error, req, res, next) => {
  if (error === invalidCsrfTokenError) {
    const cookie = req.cookies["aa.csrf"];
    
    res.status(403).json({
      error: "CSRF token mismatch.",
      debug: {
        providedToken: req.headers["x-csrf-token"] || req.body._csrf || "None",
        cookieToken: cookie || "NoneCookie",
        cookieName: cookie ? "aa.csrf" : "Missing",
        tokenSource: req.body._csrf ? "body" : (req.headers["x-csrf-token"] ? "header" : "unknown")
      }
    });
  } else {
    next(error);
  }
};

export { invalidCsrfTokenError, doubleCsrfProtection, generateToken, csrfErrorHandler };