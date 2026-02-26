/**
 * models/Audit.js
 * 
 * Phase 8 — Audit Trails
 * 
 * Stores a tamper-evident history of document-related actions.
 */

"use strict";

const mongoose = require("mongoose");

const auditSchema = new mongoose.Schema(
  {
    walletAddress: {
      type: String,
      required: true,
      index: true,
      lowercase: true,
    },
    action: {
      type: String,
      required: true, // e.g., 'UPLOAD', 'ACCESS_GRANT', 'ACCESS_REVOKE', 'FILE_VIEW'
      enum: ["UPLOAD", "UPDATE", "ACCESS_GRANT", "ACCESS_REVOKE", "FILE_VIEW", "DELETE"],
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      index: true,
    },
    ipfsHash: {
      type: String,
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Use the system createdAt as the audit timestamp
    collection: "audits",
  }
);

// Compound index for efficient user-activity queries
auditSchema.index({ walletAddress: 1, createdAt: -1 });

module.exports = mongoose.model("Audit", auditSchema);
