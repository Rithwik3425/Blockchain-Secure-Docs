/**
 * services/blockchainService.js
 *
 * Canonical lifecycle — read-only backend interface to DocumentRegistry.
 *
 * The server NEVER writes to the chain. Only the client wallet does.
 * This service is used solely to verify on-chain access for document reads.
 *
 * documentHash is bytes32 — passed as 0x-prefixed hex string from the DB.
 */

"use strict";

const { ethers } = require("ethers");

const BLOCKCHAIN_RPC_URL =
  process.env.BLOCKCHAIN_RPC_URL || "https://rpc-amoy.polygon.technology";
const CONTRACT_ADDRESS =
  process.env.REGISTRY_CONTRACT_ADDRESS;

// Minimal read-only ABI — only what the backend needs
const REGISTRY_ABI = [
  "function hasAccess(bytes32 documentHash, address user) external view returns (bool)",
  "function getDocument(bytes32 documentHash) external view returns (address owner, string memory cid, uint256 createdAt, uint256 updatedAt, uint256 versionCount)",
];

let _provider = null;
let _contract = null;

function getContract() {
  if (!_contract) {
    _provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
    _contract = new ethers.Contract(CONTRACT_ADDRESS, REGISTRY_ABI, _provider);
  }
  return _contract;
}

/**
 * hasAccess
 *
 * Returns true if `walletAddress` is the owner or has been granted access
 * to the document identified by `documentHash` (bytes32 hex string).
 *
 * Fails closed (returns false) on any RPC error.
 */
async function hasAccess(walletAddress, documentHash) {
  try {
    const contract = getContract();
    return await contract.hasAccess(documentHash, walletAddress);
  } catch (err) {
    console.error(`[blockchain-service] hasAccess error: ${err.message}`);
    return false; // Fail closed
  }
}

module.exports = { hasAccess };
