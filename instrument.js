import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN || "https://4469050dd192bf9d9f40d7b6a0d7b9f4@o4511230090149888.ingest.de.sentry.io/4511230096310352",
  integrations: [],

  // Performance Monitoring
  tracesSampleRate: 1.0, 
  
  // Environment
  environment: process.env.NODE_ENV || "production",

  // Structured Logging
  enableTracing: true,
  
  // Environment
  environment: process.env.NODE_ENV || "production",

  // Setting this option to true will send default PII data to Sentry.
  sendDefaultPii: true,
});

console.log("🛡️ Sentry Monitoring Initialized");
