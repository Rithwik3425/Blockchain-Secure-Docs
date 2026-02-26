/**
 * middleware/errorHandler.js
 *
 * Phase 4 — Backend Core
 *
 * Global Express error handler (4-argument middleware).
 * Mount this LAST in the middleware chain in index.js.
 *
 * Catches:
 *   - Errors passed via next(err)
 *   - Mongoose validation / cast errors
 *   - Any unhandled async errors (when using express-async-errors or wrapper)
 */

"use strict";

const { NODE_ENV } = require("../config/env");

/**
 * Structured error response shape:
 * {
 *   success: false,
 *   error:   "short human-readable message",
 *   details: { ... }   // only in development
 * }
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  // Default to 500 unless the error carries an explicit status
  let status = err.status ?? err.statusCode ?? 500;
  let message = err.message ?? "Internal server error.";

  // Mongoose validation error → 400
  if (err.name === "ValidationError") {
    status = 400;
    const fields = Object.values(err.errors).map((e) => e.message);
    message = `Validation failed: ${fields.join(", ")}`;
  }

  // Mongoose cast error (bad ObjectId, etc.) → 400
  if (err.name === "CastError") {
    status = 400;
    message = `Invalid value for field "${err.path}".`;
  }

  // Mongoose duplicate key → 409
  if (err.code === 11000) {
    status = 409;
    const field = Object.keys(err.keyValue ?? {})[0] ?? "field";
    message = `Duplicate value for ${field}.`;
  }

  // Log server errors (not client 4xx noise)
  if (status >= 500) {
    console.error(`[error] ${req.method} ${req.originalUrl} → ${status}:`, err);
  }

  const body = { success: false, error: message };

  // Include stack trace in development builds
  if (NODE_ENV === "development" && status >= 500) {
    body.stack = err.stack;
  }

  res.status(status).json(body);
}

/**
 * 404 handler — mount before errorHandler, after all routes.
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
