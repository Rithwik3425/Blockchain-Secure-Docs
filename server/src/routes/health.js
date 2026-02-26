/**
 * routes/health.js
 *
 * Phase 4 — Backend Core
 *
 * GET /api/health
 *
 * A lightweight endpoint for:
 *   - Uptime monitoring
 *   - CI smoke tests
 *   - Client "is the server reachable?" checks
 *
 * Returns 200 always (even when DB is down) so load balancers
 * don't prematurely remove the instance. The `db` field exposes
 * the actual state for alerting.
 */

"use strict";

const { Router } = require("express");
const { getState } = require("../config/db");
const { NODE_ENV } = require("../config/env");

const router = Router();

router.get("/", (req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "blockchain-secure-docs-api",
    version: "0.4.0", // bumped each phase
    environment: NODE_ENV,
    db: getState(),
    uptime: Math.floor(process.uptime()),   // seconds since Node started
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
