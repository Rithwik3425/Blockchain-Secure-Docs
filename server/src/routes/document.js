/**
 * routes/document.js
 *
 * Phase 4–10 — IPFS Storage + Versioning
 *
 * Handles document uploads, retrieval, updating (new versions),
 * and version history.
 */

"use strict";

const { Router } = require("express");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const ipfsService = require("../services/ipfsService");
const Document = require("../models/Document");
const auditService = require("../services/auditService");
const blockchainService = require("../services/blockchainService");

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ---------------------------------------------------------------------------
// POST /api/documents/upload  — Initial document upload
// ---------------------------------------------------------------------------
router.post("/upload", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    const cid = await ipfsService.addFile(req.file.buffer);
    console.log(`[docs] File pinned to IPFS: ${cid}`);

    const document = await Document.create({
      ipfsHash: cid,
      originalHash: cid, // First upload = stable ID
      owner: req.walletAddress,
      name: req.body.name || req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      description: req.body.description || "",
      currentVersion: 1,
      versions: [{ version: 1, ipfsHash: cid, size: req.file.size }],
    });

    res.status(201).json({ success: true, document });

    auditService.log(req.walletAddress, "FILE_UPLOAD", document._id, {
      name: document.name,
      ipfsHash: cid,
      version: 1,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// POST /api/documents/:id/update  — Upload a new version
// ---------------------------------------------------------------------------
router.post("/:id/update", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    const document = await Document.findById(req.params.id);
    if (!document || document.isDeleted) {
      return res.status(404).json({ success: false, error: "Document not found." });
    }

    if (document.owner.toLowerCase() !== req.walletAddress.toLowerCase()) {
      return res.status(403).json({ success: false, error: "Only the document owner can upload new versions." });
    }

    // Pin new version to IPFS
    const newCid = await ipfsService.addFile(req.file.buffer);
    const newVersion = document.currentVersion + 1;

    // Update MongoDB
    document.ipfsHash = newCid; // latest hash
    document.currentVersion = newVersion;
    document.versions.push({ version: newVersion, ipfsHash: newCid, size: req.file.size });
    await document.save();

    res.json({ success: true, document });

    auditService.log(req.walletAddress, "VERSION_UPDATE", document._id, {
      name: document.name,
      newHash: newCid,
      version: newVersion,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/my  — List owner's documents
// ---------------------------------------------------------------------------
router.get("/my", requireAuth, async (req, res, next) => {
  try {
    const { search, sort } = req.query;

    const query = { owner: req.walletAddress, isDeleted: false };

    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    // sort=name → alphabetical, default → newest first
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

    // Owner or on-chain access required
    if (document.owner.toLowerCase() !== req.walletAddress.toLowerCase()) {
      const docId = document.originalHash || document.ipfsHash;
      const authorized = await blockchainService.hasAccess(req.walletAddress, docId);
      if (!authorized) {
        return res.status(403).json({ success: false, error: "Access denied." });
      }
    }

    res.json({
      success: true,
      documentId: document._id,
      name: document.name,
      currentVersion: document.currentVersion,
      versions: document.versions,
    });
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/documents/:id  — Single document detail (with on-chain check)
// ---------------------------------------------------------------------------
router.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.isDeleted) {
      return res.status(404).json({ success: false, error: "Document not found." });
    }

    if (document.owner.toLowerCase() === req.walletAddress.toLowerCase()) {
      return res.json({ success: true, document });
    }

    const docId = document.originalHash || document.ipfsHash;
    const isAuthorized = await blockchainService.hasAccess(req.walletAddress, docId);
    if (!isAuthorized) {
      return res.status(403).json({ success: false, error: "Access denied: No on-chain permission." });
    }

    res.json({ success: true, document });

    auditService.log(req.walletAddress, "FILE_VIEW", document._id, { name: document.name });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
