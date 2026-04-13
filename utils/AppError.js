export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Identifies errors we EXPECT (like bad passwords) vs System Crashes

    Error.captureStackTrace(this, this.constructor);
  }
}