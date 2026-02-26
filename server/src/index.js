/**
 * src/index.js
 *
 * Phase 4 — Backend Core
 *
 * Express application bootstrap.
 *
 * Startup order:
 *   1. Load + validate environment variables
 *   2. Connect to MongoDB (non-blocking — server starts regardless)
 *   3. Configure global middleware (security, CORS, body parsing)
 *   4. Mount API routes
 *   5. Attach 404 + global error handler
 *   6. Start HTTP listener
 */

"use strict";

// Step 1 — env must be loaded first (other modules read from it on require)
const env = require("./config/env");

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const db = require("./config/db");
const { errorHandler, notFoundHandler } = require("./middleware/errorHandler");

// Route modules
const healthRouter = require("./routes/health");
const authRouter = require("./routes/auth");
const userRouter = require("./routes/user");
const documentRouter = require("./routes/document");
const auditRouter = require("./routes/audit");

// ---------------------------------------------------------------------------
// Step 2 — Connect to MongoDB (non-fatal)
// ---------------------------------------------------------------------------

db.connect();

// ---------------------------------------------------------------------------
// Step 3 — Express app setup
// ---------------------------------------------------------------------------

const app = express();

// Security headers (XSS, HSTS, content sniffing, etc.)
app.use(helmet());

// CORS — allow requests from the configured React origin(s)
const allowedOrigins = env.CLIENT_ORIGIN.split(",").map((o) => o.trim());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin "${origin}" not allowed.`));
    },
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "x-wallet-address",
      "x-wallet-signature",
    ],
    credentials: true,
  })
);

// Parse JSON bodies (limit 1 MB to guard against payload attacks)
app.use(express.json({ limit: "1mb" }));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: false }));

// ---------------------------------------------------------------------------
// Step 4 — API routes
// ---------------------------------------------------------------------------

app.use("/api/health", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/documents", documentRouter);
app.use("/api/audits", auditRouter);

// Placeholder roots to communicate what's coming
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Blockchain Secure Docs API",
    version: "0.4.0",
    docs: "Phase 4 & 7 — endpoints live at /api/auth/*, /api/user/*, and /api/documents/*",
  });
});

// ---------------------------------------------------------------------------
// Step 5 — 404 + Global error handler (must come last)
// ---------------------------------------------------------------------------

app.use(notFoundHandler);
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Step 6 — Start HTTP listener
// ---------------------------------------------------------------------------

const { PORT, NODE_ENV } = env;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════╗
║   Blockchain Secure Docs — API Server            ║
╠══════════════════════════════════════════════════╣
║  Phase  : 4 (Backend Core)                       ║
║  Port   : ${String(PORT).padEnd(38)}║
║  Env    : ${NODE_ENV.padEnd(38)}║
╚══════════════════════════════════════════════════╝
  `);
});

module.exports = app; // exported for future integration tests
