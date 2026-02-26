/**
 * routes/audit.js
 * 
 * Phase 8 — Audit Trails
 * 
 * Exposes the activity history for the authenticated user.
 */

"use strict";

const express = require("express");
const Audit = require("../models/Audit");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

/**
 * GET /api/audits/my
 * 
 * Returns the last 50 audit entries for the connected wallet.
 */
router.get("/my", requireAuth, async (req, res) => {
  try {
    const audits = await Audit.find({ walletAddress: req.walletAddress })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("documentId", "name"); // Join with document names

    res.json({
      success: true,
      audits,
    });
  } catch (err) {
    console.error("[audit-route] fetch error:", err.message);
    res.status(500).json({
      success: false,
      error: "Failed to fetch activity log",
    });
  }
});

module.exports = router;
