/**
 * services/auditService.js
 * 
 * Phase 8 — Audit Trails
 * 
 * Provides a unified way to record activity logs across the application.
 */

"use strict";

const Audit = require("../models/Audit");

/**
 * log
 * 
 * Records a new entry in the audit trail.
 * 
 * @param {string} walletAddress - The wallet performing the action.
 * @param {string} action - The action type (e.g., 'UPLOAD').
 * @param {string|null} documentId - Optional ID of the document involved.
 * @param {object|null} metadata - Additional info (recipient, filename, etc.)
 */
async function log(walletAddress, action, documentId = null, metadata = {}) {
  try {
    const entry = await Audit.create({
      walletAddress,
      action,
      documentId,
      metadata,
    });
    console.log(`[audit] Logged action: ${action} for ${walletAddress}`);
    return entry;
  } catch (err) {
    // Audit failures should not block main application flow, but should be logged
    console.error(`[audit] Failed to record log: ${err.message}`);
    return null;
  }
}

module.exports = { log };
