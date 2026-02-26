/**
 * config.js
 *
 * Phase 9–10  —  Centralized blockchain configuration.
 * Targeting: Polygon Amoy Testnet (chain ID 80002)
 *
 * NOTE: REGISTRY_ADDRESS is auto-patched by blockchain/scripts/deploy.js
 *       after each deploy — do not edit it manually.
 */

export const REGISTRY_ADDRESS = "0x4B1B352b0990Ff4E8C42cd0bf65f050ef5faf86C";

export const REGISTRY_ABI = [
  // --- Registration & Versioning ---
  "function registerDocument(string memory _ipfsHash, string memory _name) public",
  "function updateDocument(string memory _docId, string memory _newHash) public",

  // --- Access Control ---
  "function grantAccess(string memory _docId, address _user) public",
  "function revokeAccess(string memory _docId, address _user) public",
  "function hasAccess(string memory _docId, address _user) public view returns (bool)",

  // --- Getters ---
  "function getDocument(string memory _docId) public view returns (string originalHash, string name, address owner, uint256 timestamp, uint256 currentVersion, string latestHash)",
  "function getVersionCount(string memory _docId) public view returns (uint256)",
  "function getVersionAtIndex(string memory _docId, uint256 _index) public view returns (string memory)",

  // --- Events ---
  "event DocumentRegistered(string indexed docId, address indexed owner, string name)",
  "event DocumentUpdated(string indexed docId, address indexed owner, uint256 version, string newHash)",
  "event AccessGranted(string indexed docId, address indexed owner, address indexed user)",
  "event AccessRevoked(string indexed docId, address indexed owner, address indexed user)"
];

// Legacy export maintained for backward compatibility
export const REGISTRY_CONFIG = {
  address: REGISTRY_ADDRESS,
  abi: REGISTRY_ABI,
};
