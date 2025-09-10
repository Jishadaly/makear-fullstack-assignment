/**
 * Error handling middleware
 * Clean and centralized error handling
 */

// 404 Not Found
const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global Error Handler
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);

  let statusCode = res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || 'Internal Server Error';

  // Common error cases
  if (err.code === 11000) { // MongoDB duplicate key
    statusCode = 409;
    message = 'Duplicate field value entered';
  }

  if (err.name === 'ValidationError') { // Mongoose validation
    statusCode = 400;
    message = Object.values(err.errors).map(val => val.message).join(', ');
  }

  if (err.name === 'CastError') { // Invalid Mongo ID
    statusCode = 400;
    message = 'Invalid resource ID';
  }

  // Logging
  if (process.env.NODE_ENV !== 'production') {
    console.error(`[Error] ${req.method} ${req.originalUrl}`);
    console.error(err);
  }

  res.status(statusCode).json({
    error: message,
    statusCode,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
};

// Async wrapper for routes
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Custom AppError class (optional, for throwing controlled errors)
class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  notFound,
  errorHandler,
  asyncHandler,
  AppError
};
