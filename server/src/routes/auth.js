/**
 * routes/auth.js
 *
 * Phase 4 — Backend Core
 *
 * Wallet-based authentication flow:
 *
 *   POST /api/auth/nonce   { address }
 *     → Upsert user, return a fresh nonce for signing.
 *     The client uses this nonce to build and sign the challenge message.
 *
 *   POST /api/auth/verify  { address, signature }
 *     → Verify the signature against the stored nonce.
 *     On success: rotate nonce + update lastSeen, return success.
 *
 * Rate limiting is applied at the route level to mitigate brute-force.
 */

"use strict";

const { Router } = require("express");
const { ethers } = require("ethers");
const rateLimit = require("express-rate-limit");
const User = require("../models/User");
const { buildChallenge } = require("../middleware/auth");

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiter — 30 requests per minute per IP on auth routes
// ---------------------------------------------------------------------------

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests. Please wait a moment and try again.",
  },
});

router.use(authLimiter);

// ---------------------------------------------------------------------------
// POST /api/auth/nonce
// ---------------------------------------------------------------------------

/**
 * Request a sign-in nonce for a wallet address.
 *
 * Body: { address: string }
 *
 * Behaviour:
 *   - If the user does not yet exist, it is created.
 *   - A fresh nonce is returned each time this endpoint is called
 *     (existing nonce is NOT rotated on nonce request — rotation happens on verify).
 *
 * Response: { success, address, nonce, message }
 *   where `message` is the exact string the client should sign.
 */
router.post("/nonce", async (req, res, next) => {
  try {
    const { address: rawAddress } = req.body;

    if (!rawAddress) {
      return res.status(400).json({
        success: false,
        error: "address is required.",
      });
    }

    // Validate and checksum the address
    let address;
    try {
      address = ethers.getAddress(rawAddress);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid Ethereum address.",
      });
    }

    // Upsert user (findOrCreate is defined on the model)
    const user = await User.findOrCreate(address);

    const challenge = buildChallenge(address, user.nonce);

    return res.json({
      success: true,
      address,
      nonce: user.nonce,
      message: challenge, // client signs exactly this string
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/auth/verify
// ---------------------------------------------------------------------------

/**
 * Verify a wallet signature and complete authentication.
 *
 * Body: { address: string, signature: string }
 *
 * Behaviour:
 *   - Recovers the signer from the signature + nonce challenge.
 *   - If signer matches address → rotates nonce, updates lastSeen.
 *   - Nonce rotation means each signature can only be used once.
 *
 * Response: { success, address, authenticatedAt }
 */
router.post("/verify", async (req, res, next) => {
  try {
    const { address: rawAddress, signature } = req.body;

    if (!rawAddress || !signature) {
      return res.status(400).json({
        success: false,
        error: "address and signature are required.",
      });
    }

    // Validate address format
    let address;
    try {
      address = ethers.getAddress(rawAddress);
    } catch {
      return res.status(400).json({
        success: false,
        error: "Invalid Ethereum address.",
      });
    }

    // Load the user's current nonce
    const user = await User.findOne({ address });
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Address not registered. Call POST /api/auth/nonce first.",
      });
    }

    // Reconstruct the challenge and verify
    const challenge = buildChallenge(address, user.nonce);
    let recovered;
    try {
      recovered = ethers.verifyMessage(challenge, signature);
    } catch {
      return res.status(401).json({
        success: false,
        error: "Malformed signature.",
      });
    }

    if (recovered.toLowerCase() !== address.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: "Signature does not match the provided address.",
      });
    }

    // Authentication successful — store the session signature and rotate nonce
    // Passing signature saves it as user.sessionSignature for future requireAuth checks
    await user.rotateNonce(signature);

    console.log(`[auth] Verified: ${address} at ${new Date().toISOString()}`);

    return res.json({
      success: true,
      address,
      authenticatedAt: user.lastSeen,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
