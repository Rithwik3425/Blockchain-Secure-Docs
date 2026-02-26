/**
 * routes/user.js
 *
 * Phase 4 — Backend Core
 *
 * Protected user routes.
 */

"use strict";

const { Router } = require("express");
const { requireAuth } = require("../middleware/auth");
const User = require("../models/User");

const router = Router();

/**
 * GET /api/user/me
 * 
 * Returns the authenticated user's profile.
 * Proves that the requireAuth middleware is working.
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findOne({ address: req.walletAddress }).lean();
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    res.json({
      success: true,
      user: {
        address: user.address,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
