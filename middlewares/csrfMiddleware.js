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
  getSessionIdentifier: (req) => {
    // High IQ: Prefer user ID for stability across session refreshes
    if (req.user && req.user.id) return req.user.id;
    if (req.cookies && req.cookies.jwt) return req.cookies.jwt;
    return "anonymous";
  },
  cookieName: process.env.NODE_ENV === "production" ? "__Host-aa.x-csrf-token" : "aa.x-csrf-token",
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
    res.status(403).json({
      error: "CSRF token mismatch.",
      debug: {
        providedToken: req.headers["x-csrf-token"] || req.body._csrf || "None",
        cookieToken: req.cookies["aa.x-csrf-token"] || req.cookies["__Host-aa.x-csrf-token"] || "NoneCookie"
      }
    });
  } else {
    next(error);
  }
};

export { invalidCsrfTokenError, doubleCsrfProtection, generateToken, csrfErrorHandler };