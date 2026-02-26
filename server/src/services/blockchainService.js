/**
 * services/blockchainService.js
 *
 * Phase 9–10  —  Shared Document Access + Versioning
 *
 * Backend interface to the DocumentRegistry smart contract.
 * Updated for Phase 10 ABI: hasAccess(docId, user), getDocument updated.
 */

"use strict";

const { ethers } = require("ethers");

const BLOCKCHAIN_RPC_URL =
  process.env.BLOCKCHAIN_RPC_URL || "http://127.0.0.1:8545";
const CONTRACT_ADDRESS =
  process.env.REGISTRY_CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// Minimal ABI for what the backend needs
const REGISTRY_ABI = [
  "function hasAccess(string memory _docId, address _user) public view returns (bool)",
  "function getDocument(string memory _docId) public view returns (string originalHash, string name, address owner, uint256 timestamp, uint256 currentVersion, string latestHash)",
  "function getVersionCount(string memory _docId) public view returns (uint256)",
];

let provider;
let contract;

function getContract() {
  if (!contract) {
    provider = new ethers.JsonRpcProvider(BLOCKCHAIN_RPC_URL);
    contract = new ethers.Contract(CONTRACT_ADDRESS, REGISTRY_ABI, provider);
  }
  return contract;
}

/**
 * hasAccess
 *
 * Checks if a given wallet has on-chain permission to a document.
 * Owners always return true from the contract; no special handling needed.
 *
 * @param {string} walletAddress  - Ethereum address of the viewer.
 * @param {string} docId          - Stable document ID (original IPFS hash).
 * @returns {Promise<boolean>}
 */
async function hasAccess(walletAddress, docId) {
  try {
    const c = getContract();
    return await c.hasAccess(docId, walletAddress);
  } catch (err) {
    console.error(`[blockchain-service] hasAccess error: ${err.message}`);
    return false; // Fail closed
  }
}

/**
 * getVersionCount
 *
 * Returns the number of versions for a document.
 * Used for informational display; not access-critical.
 *
 * @param {string} docId - Stable document ID.
 * @returns {Promise<number>}
 */
async function getVersionCount(docId) {
  try {
    const c = getContract();
    const count = await c.getVersionCount(docId);
    return Number(count);
  } catch (err) {
    console.error(`[blockchain-service] getVersionCount error: ${err.message}`);
    return 0;
  }
}

module.exports = { hasAccess, getVersionCount };
