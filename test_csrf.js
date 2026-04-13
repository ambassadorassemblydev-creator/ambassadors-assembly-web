import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { doubleCsrf } = require("csrf-csrf");

const doubleCsrfResult = doubleCsrf({
  getSecret: () => "secretsecretsecretsecretsecretsecret",
  cookieName: "__Host-aa.x-csrf-token",
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  },
  size: 64,
  ignoredMethods: ["GET", "HEAD", "OPTIONS"],
  getTokenFromRequest: (req) => req.body._csrf || req.headers["x-csrf-token"],
});

console.log(Object.keys(doubleCsrfResult));
