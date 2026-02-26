require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    // ── Local development (kept for offline testing) ──────────────────────
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },

    // ── Polygon Amoy Testnet (chain ID 80002) ─────────────────────────────
    amoy: {
      url: process.env.AMOY_RPC_URL || "https://rpc-amoy.polygon.technology",
      chainId: 80002,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
      // Explicit gas price to avoid Hardhat's 1 ETH safety cap being
      // triggered by inflated public RPC estimates.
      // 35 gwei × ~2 M gas ≈ 0.07 MATIC — safe for Amoy testnet.
      gasPrice: 35_000_000_000, // 35 gwei
    },
  },
};
