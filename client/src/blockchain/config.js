/**
 * config.js
 *
 * Blockchain configuration — canonical lifecycle (Feature 1 refactor).
 * Targeting: Polygon Amoy Testnet (chain ID 80002)
 *
 * Primary key is bytes32 documentHash = keccak256(owner+cid+name+mime+ts)
 * computed server-side and signed by the client wallet.
 *
 * NOTE: REGISTRY_ADDRESS is auto-patched by blockchain/scripts/deploy.js
 *       after each deploy — do not edit it manually.
 */

export const REGISTRY_ADDRESS = "0xD2aD2651026bE58e90F50a1dec73e3Ecf70eC43D";

export const REGISTRY_ABI = [
  // --- Registration & Versioning ---
  "function registerDocument(bytes32 documentHash, string calldata cid) external",
  "function updateDocument(bytes32 documentHash, string calldata newCid) external",

  // --- Access Control ---
  "function grantAccess(bytes32 documentHash, address user) external",
  "function revokeAccess(bytes32 documentHash, address user) external",
  "function hasAccess(bytes32 documentHash, address user) external view returns (bool)",

  // --- Getters ---
  "function getDocument(bytes32 documentHash) external view returns (address owner, string memory cid, uint256 createdAt, uint256 updatedAt, uint256 versionCount)",
  "function getVersionCount(bytes32 documentHash) external view returns (uint256)",
  "function getVersionAtIndex(bytes32 documentHash, uint256 index) external view returns (string memory)",

  // --- Events ---
  "event DocumentRegistered(bytes32 indexed documentHash, address indexed owner, string cid)",
  "event DocumentUpdated(bytes32 indexed documentHash, address indexed owner, uint256 version, string newCid)",
  "event AccessGranted(bytes32 indexed documentHash, address indexed owner, address indexed user)",
  "event AccessRevoked(bytes32 indexed documentHash, address indexed owner, address indexed user)"
];

// Legacy export for backward compatibility
export const REGISTRY_CONFIG = {
  address: REGISTRY_ADDRESS,
  abi: REGISTRY_ABI,
};
