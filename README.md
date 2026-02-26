# Blockchain Secure Docs — Complete System Guide

A fully decentralized document management platform with:
- **Wallet–based identity** (MetaMask sign-in)
- **IPFS file storage** with mock fallback
- **On-chain ownership & access control** (Ethereum / Hardhat)
- **Document versioning** — track every upload
- **Shared access** — grant permissions to other wallets
- **Audit trails** — full activity timeline
- **Search & filtering** — find documents instantly

---

## Architecture

```
client/      React + Vite + Tailwind   (localhost:5174)
server/      Express + MongoDB          (localhost:4000)
blockchain/  Solidity + Hardhat         (localhost:8545)
```

---

## Quick Start

### 1 — Install dependencies
```bash
npm install          # root workspace
```

### 2 — Configure environment

Copy `.env.example` files and fill in values:
```bash
cp server/.env.example server/.env
cp client/.env.example client/.env   # if present
```

Key variables (`server/.env`):
```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/bsdms
CLIENT_ORIGIN=http://localhost:5174
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
REGISTRY_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
IPFS_API_URL=http://127.0.0.1:5001
```

### 3 — Start services (separate terminals)

```bash
# Terminal 1 — Blockchain node
cd blockchain && npx hardhat node

# Terminal 2 — Deploy contract (only needed after node restart)
cd blockchain && npx hardhat run scripts/deploy.js --network localhost

# Terminal 3 — Backend API
cd server && npm run dev

# Terminal 4 — Frontend
cd client && npm run dev
```

---

## Feature Guide

| Feature | How to Use |
|---------|-----------|
| **Connect Wallet** | Click "Connect Wallet" → Sign in MetaMask |
| **Upload Document** | Drag file into the upload zone |
| **Search** | Type in the search bar above the document list |
| **Sort** | Select "Newest First" or "By Name" |
| **Share** | Click "Share" → enter recipient address → Grant |
| **Update Version** | Click ↑ icon → drop updated file |
| **Version History** | Click 🕐 icon → see all CIDs |
| **Activity Log** | Switch to "Activity Log" tab in dashboard |

---

## Smart Contract

`DocumentRegistry.sol` — deployed at `REGISTRY_CONTRACT_ADDRESS`.

| Function | Description |
|----------|-------------|
| `registerDocument(hash, name)` | Register first upload |
| `updateDocument(docId, newHash)` | Add a new version |
| `grantAccess(docId, user)` | Share with another wallet |
| `revokeAccess(docId, user)` | Remove a wallet's access |
| `hasAccess(docId, user)` | Query access (used by backend) |
| `getVersionCount(docId)` | Number of versions |
| `getVersionAtIndex(docId, i)` | CID of a specific version |

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/nonce` | Get sign challenge |
| `POST` | `/api/auth/verify` | Verify signature → JWT |
| `POST` | `/api/documents/upload` | Upload new document |
| `POST` | `/api/documents/:id/update` | Upload new version |
| `GET` | `/api/documents/my?search=&sort=` | List own documents |
| `GET` | `/api/documents/:id` | Get document (access-checked) |
| `GET` | `/api/documents/:id/versions` | Version history |
| `GET` | `/api/audits/my` | Activity log |

---

## Phases Completed

| # | Phase |
|---|-------|
| 1 | Project Setup & Monorepo |
| 2 | Frontend Foundation |
| 3 | Wallet Authentication |
| 4 | Backend Core (Express + MongoDB) |
| 5 | Smart Contracts (DocumentRegistry) |
| 6 | Access Control |
| 7 | IPFS Storage & Upload Dashboard |
| 8 | Audit Trails |
| 9 | Shared Document Access |
| 10 | Document Versioning |
| 11 | Search & Filtering |
| 12 | Production Hardening ✅ |
