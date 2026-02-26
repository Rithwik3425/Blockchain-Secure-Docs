/**
 * models/User.js
 *
 * Phase 4 — Backend Core
 *
 * Mongoose schema for a platform user.
 *
 * Identity model: wallet address IS the user — no email or password.
 * A random nonce is stored per user. Each authentication cycle:
 *   1. Client requests a nonce   → POST /api/auth/nonce
 *   2. Client signs the nonce    → MetaMask
 *   3. Client submits signature  → POST /api/auth/verify
 *   4. Server rotates nonce      → prevents replay attacks
 */

"use strict";

const mongoose = require("mongoose");
const { randomBytes } = require("crypto");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Generate a fresh random 32-byte hex nonce. */
function generateNonce() {
  return randomBytes(32).toString("hex");
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const userSchema = new mongoose.Schema(
  {
    /**
     * Checksummed Ethereum wallet address (EIP-55).
     * Unique — one document per wallet address.
     */
    address: {
      type: String,
      required: [true, "Wallet address is required."],
      unique: true,
      lowercase: false, // stored in original checksum form
      trim: true,
      validate: {
        validator: (v) => /^0x[0-9a-fA-F]{40}$/.test(v),
        message: "Invalid Ethereum address format.",
      },
    },

    /**
     * Current one-time nonce used for the sign-in challenge.
     * Rotated after every successful authentication to prevent replay attacks.
     */
    nonce: {
      type: String,
      required: true,
      default: generateNonce,
    },

    /**
     * The last successfully verified signature.
     * Stored here so requireAuth can verify by equality — not by nonce recomputation.
     * Cleared when the nonce is rotated.
     */
    sessionSignature: {
      type: String,
      default: null,
    },

    lastSeen: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

userSchema.index({ address: 1 });

/** Rotate the nonce after successful verify, and store the active session signature. */
userSchema.methods.rotateNonce = async function (newSignature) {
  this.nonce = generateNonce();
  this.lastSeen = new Date();
  if (newSignature !== undefined) this.sessionSignature = newSignature;
  await this.save();
};

// ---------------------------------------------------------------------------
// Static methods
// ---------------------------------------------------------------------------

/**
 * findOrCreate(address)
 *
 * Upsert a user by wallet address.
 * Returns the document (existing or newly created).
 */
userSchema.statics.findOrCreate = async function (address) {
  let user = await this.findOne({ address });
  if (!user) {
    user = await this.create({ address });
    console.log(`[User] New user registered: ${address}`);
  }
  return user;
};

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

module.exports = mongoose.model("User", userSchema);
