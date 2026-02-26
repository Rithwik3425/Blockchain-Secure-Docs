/**
 * models/Document.js
 *
 * Phase 4-10 — Backend Core + Versioning
 *
 * Mongoose schema for document metadata, including full version history.
 *
 * Actual file bytes live on IPFS (added in Phase 7).
 * Ownership + access proofs live on-chain (added in Phase 5).
 * This collection stores the off-chain metadata layer:
 *   - human-readable name, MIME type, size
 *   - the IPFS content-address (CID)
 *   - the on-chain transaction hash that recorded it
 *   - the owner's wallet address
 *   - grant list (other wallet addresses authorised to view)
 *   - version counter (incremented on re-upload)
 */

"use strict";

const mongoose = require("mongoose");

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const documentSchema = new mongoose.Schema(
  {
    /**
     * bytes32 documentHash = keccak256(owner, cid, name, mimeType, timestamp)
     * This is the PRIMARY on-chain identifier — never changes after creation.
     * Stored as 0x-prefixed 64-char hex string.
     */
    documentHash: {
      type: String,
      trim: true,
      default: null,
      index: true,
    },

    /**
     * IPFS Content Identifier — always points to the LATEST version.
     */
    ipfsHash: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * Ordered history of file versions.
     * Each entry: { version, ipfsHash, size, createdAt }
     */
    versions: {
      type: [
        {
          version: { type: Number, required: true },
          ipfsHash: { type: String, required: true },
          size: { type: Number, default: 0 },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },

    /**
     * Current version number (mirrors on-chain). Starts at 1.
     */
    currentVersion: {
      type: Number,
      default: 1,
      min: [1, "Version must be at least 1."],
    },

    /**
     * Checksummed Ethereum address of the document owner.
     * Set at upload time from the authenticated wallet address.
     */
    owner: {
      type: String,
      required: [true, "Owner address is required."],
      trim: true,
      validate: {
        validator: (v) => /^0x[0-9a-fA-F]{40}$/.test(v),
        message: "Invalid owner address.",
      },
    },

    /** User-supplied document name. */
    name: {
      type: String,
      required: [true, "Document name is required."],
      trim: true,
      maxlength: [255, "Name must be 255 characters or fewer."],
    },

    /** MIME type of the original file, e.g. "application/pdf". */
    mimeType: {
      type: String,
      trim: true,
      default: "application/octet-stream",
    },

    /** File size in bytes. */
    size: {
      type: Number,
      min:  [0, "Size cannot be negative."],
      default: 0,
    },

    /**
     * True once the client's wallet has confirmed the on-chain tx.
     * Until then the document exists only as a pending index entry.
     */
    registeredOnChain: {
      type: Boolean,
      default: false,
    },

    /** The on-chain transaction hash from registerDocument(). */
    txHash: {
      type: String,
      default: null,
    },

    /** Optional human-readable description. */
    description: {
      type: String,
      trim: true,
      maxlength: [2000, "Description must be 2000 characters or fewer."],
      default: "",
    },

    /**
     * Array of wallet addresses that have been granted read access.
     * Validated against the smart contract in Phase 6 (for now stored here).
     */
    accessList: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          arr.every((a) => /^0x[0-9a-fA-F]{40}$/.test(a)),
        message: "All access list entries must be valid Ethereum addresses.",
      },
    },

    /**
     * Ethereum transaction hash from the smart contract write.
     * Set after on-chain registration (Phase 5+).
     */
    txHash: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * On-chain document ID (bytes32 / uint256 returned by the contract).
     * Set alongside txHash in Phase 5+.
     */
    onChainId: {
      type: String,
      trim: true,
      default: null,
    },

    /**
     * Soft-delete flag.
     */
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt + updatedAt
    versionKey: false,
  }
);

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

// Fast lookup by owner — the dashboard query
documentSchema.index({ owner: 1, createdAt: -1 });

// Fast lookup by IPFS hash — used in Phase 7 retrieval
documentSchema.index({ ipfsHash: 1 });

// ---------------------------------------------------------------------------
// Virtual — isShared
// ---------------------------------------------------------------------------

documentSchema.virtual("isShared").get(function () {
  return this.accessList.length > 0;
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

module.exports = mongoose.model("Document", documentSchema);
