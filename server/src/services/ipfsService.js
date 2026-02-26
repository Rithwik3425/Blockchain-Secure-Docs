/**
 * services/ipfsService.js
 * 
 * Phase 7 — IPFS Storage
 * 
 * Interface for pinning files to the IPFS decentralized network.
 * Uses the Kubo RPC API (typically on port 5001).
 * 
 * Note: Uses dynamic import for kubo-rpc-client as it is an ESM-only package.
 */

"use strict";

const { IPFS_API_URL } = require("../config/env");

let ipfs;

/**
 * getIPFS
 * 
 * Lazy initializer for the IPFS client using dynamic import.
 */
async function getIPFS() {
  if (ipfs) return ipfs;
  try {
    const { create } = await import("kubo-rpc-client");
    ipfs = create({ url: IPFS_API_URL });
    console.log(`[ipfs] client initialized at ${IPFS_API_URL}`);
    return ipfs;
  } catch (err) {
    // Fail silently but log, allowing mock fallback in addFile
    console.warn(`[ipfs] Could not connect to Kubo RPC at ${IPFS_API_URL}: ${err.message}`);
    return null;
  }
}

/**
 * addFile
 *
 * Pins a buffer to IPFS and returns the CID (Content Identifier).
 *
 * @param {Buffer} buffer - The file content to pin.
 * @returns {Promise<string>} - The resulting IPFS CID.
 */
async function addFile(buffer) {
  const client = await getIPFS();

  if (!client) {
    console.warn("[ipfs] No client - using mock CID for development.");
    return `mock-cid-${Date.now()}`;
  }

  try {
    const result = await client.add(buffer);
    return result.path;
  } catch (err) {
    console.warn(`[ipfs] Upload failed: ${err.message}. Falling back to mock CID.`);
    return `mock-cid-${Date.now()}`;
  }
}

module.exports = { addFile };
