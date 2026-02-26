/**
 * config/env.js
 *
 * Phase 4 — Backend Core
 *
 * Validates and exports all required environment variables.
 * Fails fast with a clear message if a required var is missing,
 * so misconfiguration is caught at startup rather than at runtime.
 */

"use strict";

require("dotenv").config();

// ---------------------------------------------------------------------------
// Required variables — the server will refuse to start without these
// ---------------------------------------------------------------------------

const REQUIRED = ["MONGODB_URI"];

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(
    `[env] Missing required environment variables: ${missing.join(", ")}\n` +
      `      Copy .env.example to server/.env and fill in the values.`
  );
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Exported config object
// ---------------------------------------------------------------------------

module.exports = {
  /** TCP port the Express server listens on. */
  PORT: parseInt(process.env.PORT ?? "4000", 10),

  /** MongoDB connection string, e.g. mongodb://localhost:27017/bsdms */
  MONGODB_URI: process.env.MONGODB_URI,

  /**
   * Allowed CORS origin(s) for the React client.
   * Accepts a comma-separated list, e.g. "http://localhost:5173,https://app.example.com"
   */
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",

  /** "development" | "production" | "test" */
  NODE_ENV: process.env.NODE_ENV ?? "development",

  /** RPC endpoint for reading blockchain state (used in later phases). */
  BLOCKCHAIN_RPC_URL:
    process.env.BLOCKCHAIN_RPC_URL ?? "http://127.0.0.1:8545",

  /** IPFS HTTP API URL (used in Phase 7). */
  IPFS_API_URL: process.env.IPFS_API_URL ?? "http://127.0.0.1:5001",
};
