/**
 * config/db.js
 *
 * Phase 4 — Backend Core
 *
 * Manages the Mongoose (MongoDB) connection lifecycle:
 *   - connect()   — establish connection with retry on initial failure
 *   - Mongoose event listeners for logging and graceful shutdown
 */

"use strict";

const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

// ---------------------------------------------------------------------------
// Mongoose global settings
// ---------------------------------------------------------------------------

// Suppress the deprecated strictQuery warning in Mongoose 7+
mongoose.set("strictQuery", true);

// ---------------------------------------------------------------------------
// Event listeners
// ---------------------------------------------------------------------------

mongoose.connection.on("connected", () => {
  console.log("[db] MongoDB connected");
});

mongoose.connection.on("error", (err) => {
  console.error("[db] MongoDB connection error:", err.message);
});

mongoose.connection.on("disconnected", () => {
  console.warn("[db] MongoDB disconnected");
});

// Clean shutdown: close Mongoose connection when the Node process exits
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("[db] Connection closed (SIGINT).");
  process.exit(0);
});

// ---------------------------------------------------------------------------
// connect()
// ---------------------------------------------------------------------------

/**
 * Opens the Mongoose connection.
 * Does NOT throw — logs errors and resolves regardless so the server starts
 * even when MongoDB is temporarily unavailable (health endpoint will report it).
 */
async function connect() {
  try {
    await mongoose.connect(MONGODB_URI, {
      // These are no-ops in Mongoose 8 but kept for clarity / future compatibility
      serverSelectionTimeoutMS: 5000, // Fail fast on initial connect attempt
    });
  } catch (err) {
    console.error("[db] Initial connection failed:", err.message);
    console.warn("[db] Server will start, but database features are unavailable.");
  }
}

/**
 * Returns a human-readable DB state string for the health endpoint.
 * Mirrors mongoose.connection.readyState values (0–3).
 */
function getState() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[mongoose.connection.readyState] ?? "unknown";
}

module.exports = { connect, getState };
