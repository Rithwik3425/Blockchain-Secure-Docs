/**
 * middleware/auth.js
 *
 * Phase 4 — Backend Core (fixed in Phase 12)
 *
 * Wallet-based authentication middleware.
 *
 * Flow:
 *   1. POST /auth/nonce  → client gets nonce, builds challenge, signs it
 *   2. POST /auth/verify → backend verifies signature, stores it as sessionSignature,
 *                          rotates nonce so the same signature can't re-auth
 *   3. Every subsequent request → client sends address + signature headers
 *      requireAuth compares signature directly to user.sessionSignature
 *
 * WHY not re-verify against nonce each time?
 *   Because after /verify the nonce is rotated — re-computing the challenge
 *   with the new nonce will NEVER match the signature the client already holds.
 *   Storing sessionSignature solves this while still preventing replay attacks
 *   (a new login invalidates the old sessionSignature).
 */

"use strict";

const { ethers } = require("ethers");
const User = require("../models/User");

const buildChallenge = (address, nonce) =>
  `Welcome to Blockchain Secure Docs!\n\nSign this message to verify your wallet and authenticate.\n\nThis request will not trigger any blockchain transaction or cost any gas.\n\nWallet: ${address}\nNonce: ${nonce}`;

async function requireAuth(req, res, next) {
  const rawAddress = req.headers["x-wallet-address"];
  const signature  = req.headers["x-wallet-signature"];

  if (!rawAddress || !signature) {
    return res.status(401).json({
      success: false,
      error: "Missing auth headers (x-wallet-address, x-wallet-signature).",
    });
  }

  let address;
  try {
    address = ethers.getAddress(rawAddress);
  } catch {
    return res.status(401).json({ success: false, error: "Invalid wallet address." });
  }

  try {
    const user = await User.findOne({ address }).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Address not registered. Call POST /api/auth/nonce first.",
      });
    }

    // --- Primary check: compare against stored session signature ---
    if (user.sessionSignature && user.sessionSignature === signature) {
      req.walletAddress = address;
      return next();
    }

    // --- Fallback: allow if signature verifies against current nonce ---
    // (handles the very first request that arrives between sign and the
    //  /verify nonce rotation — edge case, but harmless to support)
    try {
      const challenge = buildChallenge(address, user.nonce);
      const recovered = ethers.verifyMessage(challenge, signature);
      if (recovered.toLowerCase() === address.toLowerCase()) {
        req.walletAddress = address;
        return next();
      }
    } catch {
      // fall through to 401
    }

    return res.status(401).json({
      success: false,
      error: "Signature verification failed. Please reconnect your wallet.",
    });
  } catch (err) {
    console.error("[auth] requireAuth error:", err.message);
    return res.status(500).json({ success: false, error: "Internal auth error." });
  }
}

module.exports = { requireAuth, buildChallenge };
