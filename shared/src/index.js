// Shared configuration and basic types for the secure document management system.

const APP_NAME = "Blockchain Secure Docs";

const NETWORKS = {
  development: {
    chainId: 31337,
    name: "local-hardhat"
  },
  testnet: {
    chainId: 11155111,
    name: "sepolia"
  }
};

const ROLES = {
  OWNER: "OWNER",
  AUTHORIZED_USER: "AUTHORIZED_USER"
};

module.exports = {
  APP_NAME,
  NETWORKS,
  ROLES
};

