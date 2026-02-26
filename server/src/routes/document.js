/**
 * routes/document.js
 *
 * Canonical lifecycle — Phase 4: Backend Core
 *
 * Rules:
 *   1. Server NEVER calls the smart contract (write ops only).
 *   2. Server pins file to IPFS, computes keccak256 metadata hash,
 *      and returns { cid, documentHash } to the client.
 *   3. The CLIENT wallet signs and sends registerDocument() on-chain.
 *   4. MongoDB is an index only — blockchain is source of truth.
 */

"use strict";

const { Router }  = require("express");
const multer      = require("multer");
const { ethers }  = require("ethers");
const { requireAuth } = require("../middleware/auth");
const ipfsService     = require("../services/ipfsService");
const Document        = require("../models/Document");
const auditService    = require("../services/auditService");
const blockchainService = require("../services/blockchainService");

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * computeDocumentHash
 *
 * Replicates the on-chain semantics:
 *   keccak256(abi.encodePacked(owner, cid, name, mimeType, timestamp))
 *
 * The returned bytes32 hex string becomes the primary key on the contract.
 *
 * @param {string} owner     - checksummed wallet address
 * @param {string} cid       - IPFS Content Identifier
 * @param {string} name      - original filename
 * @param {string} mimeType  - MIME type of the file
 * @param {number} timestamp - Unix seconds (Math.floor(Date.now() / 1000))
 * @returns {string} 0x-prefixed bytes32 hex string
 */
function computeDocumentHash(owner, cid, name, mimeType, timestamp) {
  return ethers.solidityPackedKeccak256(
    ["address", "string", "string", "string", "uint256"],
    [owner, cid, name, mimeType, timestamp]
  );
}

// ---------------------------------------------------------------------------
// POST /api/documents/upload  — Pin to IPFS, compute hash, return to client
// ---------------------------------------------------------------------------

router.post("/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    // Step 1 — Pin to IPFS
    const cid = await ipfsService.addFile(req.file.buffer);
    console.log(`[docs] IPFS pin complete: ${cid}`);

    // Step 2 — Build metadata + compute integrity hash
    const timestamp = Math.floor(Date.now() / 1000);
    const name      = req.body.name || req.file.originalname;
    const mimeType  = req.file.mimetype;
    const owner     = ethers.getAddress(req.walletAddress); // EIP-55 checksum

    const documentHash = computeDocumentHash(owner, cid, name, mimeType, timestamp);

    // Step 3 — Index in MongoDB (NEVER primary source of truth)
    const document = await Document.create({
      documentHash,          // bytes32 hex — primary identifier
      ipfsHash:    cid,      // latest CID
      originalHash: documentHash, // stable key alias
      owner,
      name,
      mimeType,
      size:        req.file.size,
      description: req.body.description || "",
      currentVersion: 1,
      versions: [{ version: 1, ipfsHash: cid, size: req.file.size }],
      registeredOnChain: false, // client will flip this after tx confirms
    });

    // Step 4 — Return {cid, documentHash} to client — NO contract call here
    res.status(201).json({
      success: true,
      cid,
      documentHash,
      documentId: document._id, // MongoDB id for polling / confirming
    });

    auditService.log(owner, "FILE_UPLOAD", document._id, { name, cid, documentHash });

  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/documents/:id/confirm  — Client calls after on-chain tx confirms
// Mark document as registered on-chain (index update only).
// ---------------------------------------------------------------------------

router.post("/:id/confirm", requireAuth, async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ success: false, error: "Document not found." });
    }
    if (document.owner.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Forbidden." });
    }

    document.registeredOnChain = true;
    document.txHash = req.body.txHash || null;
    await document.save();

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/documents/:id/prepare-version  — Pin new version file, return CID
// Client will call updateDocument() on-chain with this CID.
// ---------------------------------------------------------------------------

router.post("/:id/prepare-version", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    const document = await Document.findById(req.params.id);
    if (!document || document.isDeleted) {
      return res.status(404).json({ success: false, error: "Document not found." });
    }
    if (document.owner.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Only the owner can update." });
    }

    // Pin new version to IPFS — return to client, do NOT update DB yet
    const newCid = await ipfsService.addFile(req.file.buffer);

    res.json({
      success: true,
      newCid,
      documentHash: document.documentHash,  // client needs this for the tx
      documentId:   document._id,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/documents/:id/confirm-version  — Called after on-chain tx confirms
// ---------------------------------------------------------------------------

router.post("/:id/confirm-version", requireAuth, async (req, res, next) => {
  try {
    const { newCid, txHash } = req.body;
    if (!newCid) {
      return res.status(400).json({ success: false, error: "newCid required." });
    }

    const document = await Document.findById(req.params.id);
    if (!document || document.isDeleted) {
      return res.status(404).json({ success: false, error: "Document not found." });
    }
    if (document.owner.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Forbidden." });
    }

    const newVersion = document.currentVersion + 1;
    document.ipfsHash        = newCid;
    document.currentVersion  = newVersion;
    document.txHash          = txHash || null;
    document.versions.push({ version: newVersion, ipfsHash: newCid, size: req.body.size || 0 });
    await document.save();

    auditService.log(req.walletAddress, "VERSION_UPDATE", document._id, {
      newCid, version: newVersion,
    });

    res.json({ success: true, document });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/my  — List owner's documents (index only)
// ---------------------------------------------------------------------------

router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const { search, sort } = req.query;
    const query = { owner: req.walletAddress, isDeleted: false };
    if (search) query.name = { $regex: search, $options: "i" };
    const sortOrder = sort === "name" ? { name: 1 } : { createdAt: -1 };
    const documents = await Document.find(query).sort(sortOrder);
    res.json({ success: true, documents });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/:id/versions  — Version history
// ---------------------------------------------------------------------------

router.get("/:id/versions", requireAuth, async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.isDeleted) {
      return res.status(404).json({ success: false, error: "Document not found." });
    }

    const isOwner = document.owner.toLowerCase() === req.walletAddress.toLowerCase();
    if (!isOwner) {
      const authorized = await blockchainService.hasAccess(
        req.walletAddress,
        document.documentHash
      );
      if (!authorized) {
        return res.status(403).json({ success: false, error: "Access denied." });
      }
    }

    res.json({
      success: true,
      documentHash: document.documentHash,
      name: document.name,
      currentVersion: document.currentVersion,
      versions: document.versions,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/:id  — Single document (access-checked)
// ---------------------------------------------------------------------------

router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.isDeleted) {
      return res.status(404).json({ success: false, error: "Document not found." });
    }

    const isOwner = document.owner.toLowerCase() === req.walletAddress.toLowerCase();
    if (!isOwner) {
      const authorized = await blockchainService.hasAccess(
        req.walletAddress,
        document.documentHash
      );
      if (!authorized) {
        return res.status(403).json({ success: false, error: "Access denied." });
      }
    }

    res.json({ success: true, document });
    auditService.log(req.walletAddress, "FILE_VIEW", document._id, { name: document.name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
