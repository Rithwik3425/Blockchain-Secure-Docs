const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying DocumentRegistry...");

  const DocumentRegistry = await hre.ethers.getContractFactory("DocumentRegistry");
  const registry = await DocumentRegistry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();

  console.log("====================================================");
  console.log(`DocumentRegistry deployed to: ${address}`);
  console.log("====================================================");

  // --- Auto-update server/.env ---
  const serverEnvPath = path.resolve(__dirname, "../../server/.env");
  if (fs.existsSync(serverEnvPath)) {
    let envContent = fs.readFileSync(serverEnvPath, "utf8");
    if (envContent.includes("REGISTRY_CONTRACT_ADDRESS=")) {
      envContent = envContent.replace(
        /REGISTRY_CONTRACT_ADDRESS=.*/,
        `REGISTRY_CONTRACT_ADDRESS=${address}`
      );
    } else {
      envContent += `\nREGISTRY_CONTRACT_ADDRESS=${address}\n`;
    }
    fs.writeFileSync(serverEnvPath, envContent);
    console.log(`✅  server/.env updated with REGISTRY_CONTRACT_ADDRESS=${address}`);
  }

  // --- Auto-update client/src/blockchain/config.js ---
  const clientConfigPath = path.resolve(__dirname, "../../client/src/blockchain/config.js");
  if (fs.existsSync(clientConfigPath)) {
    let configContent = fs.readFileSync(clientConfigPath, "utf8");
    configContent = configContent.replace(
      /REGISTRY_ADDRESS\s*=\s*"0x[0-9a-fA-F]{40}"/,
      `REGISTRY_ADDRESS = "${address}"`
    );
    fs.writeFileSync(clientConfigPath, configContent);
    console.log(`✅  client/src/blockchain/config.js updated with address=${address}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
