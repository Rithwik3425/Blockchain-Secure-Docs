// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/**
 * @title  DocumentRegistry
 * @notice Canonical lifecycle — Phase 13 refactor.
 *
 * Key design rules (immutable):
 *   - Files are NEVER stored on-chain.
 *   - The primary key is a bytes32 documentHash = keccak256(metadata).
 *   - The CID is stored as a reference to IPFS content only.
 *   - Every write must be signed by the document owner's wallet.
 *   - Access control lives entirely on-chain.
 */
contract DocumentRegistry {

    // -------------------------------------------------------------------------
    // Structs
    // -------------------------------------------------------------------------

    struct DocumentMetadata {
        address owner;          // Wallet that registered the document
        string  cid;            // Latest IPFS CID
        uint256 createdAt;      // Block timestamp of first registration
        uint256 updatedAt;      // Block timestamp of latest update
        uint256 versionCount;   // Number of versions (starts at 1)
        bool    exists;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    /// documentHash => metadata
    mapping(bytes32 => DocumentMetadata) private _docs;

    /// documentHash => ordered CID history (index 0 = v1)
    mapping(bytes32 => string[]) private _versions;

    /// documentHash => user address => granted?
    mapping(bytes32 => mapping(address => bool)) private _access;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event DocumentRegistered(
        bytes32 indexed documentHash,
        address indexed owner,
        string  cid
    );

    event DocumentUpdated(
        bytes32 indexed documentHash,
        address indexed owner,
        uint256         version,
        string          newCid
    );

    event AccessGranted(
        bytes32 indexed documentHash,
        address indexed owner,
        address indexed user
    );

    event AccessRevoked(
        bytes32 indexed documentHash,
        address indexed owner,
        address indexed user
    );

    // -------------------------------------------------------------------------
    // Modifiers
    // -------------------------------------------------------------------------

    modifier onlyOwner(bytes32 documentHash) {
        require(_docs[documentHash].exists, "Document not found");
        require(_docs[documentHash].owner == msg.sender, "Not the document owner");
        _;
    }

    // -------------------------------------------------------------------------
    // Core: Register & Update
    // -------------------------------------------------------------------------

    /**
     * @notice Register a new document on-chain.
     * @param  documentHash  keccak256(owner, cid, name, mimeType, timestamp)
     *                       computed off-chain by the server before returning
     *                       to the client.
     * @param  cid           IPFS Content Identifier of the file.
     */
    function registerDocument(bytes32 documentHash, string calldata cid) external {
        require(documentHash != bytes32(0),     "documentHash required");
        require(bytes(cid).length > 0,          "CID required");
        require(!_docs[documentHash].exists,    "Document already registered");

        _docs[documentHash] = DocumentMetadata({
            owner:        msg.sender,
            cid:          cid,
            createdAt:    block.timestamp,
            updatedAt:    block.timestamp,
            versionCount: 1,
            exists:       true
        });

        _versions[documentHash].push(cid);

        emit DocumentRegistered(documentHash, msg.sender, cid);
    }

    /**
     * @notice Push a new version CID under an existing document.
     * @param  documentHash  Stable identifier (same bytes32 as registration).
     * @param  newCid        IPFS CID of the updated file content.
     */
    function updateDocument(bytes32 documentHash, string calldata newCid)
        external
        onlyOwner(documentHash)
    {
        require(bytes(newCid).length > 0, "New CID required");

        _docs[documentHash].cid          = newCid;
        _docs[documentHash].updatedAt    = block.timestamp;
        _docs[documentHash].versionCount += 1;

        _versions[documentHash].push(newCid);

        emit DocumentUpdated(
            documentHash,
            msg.sender,
            _docs[documentHash].versionCount,
            newCid
        );
    }

    // -------------------------------------------------------------------------
    // Access Control
    // -------------------------------------------------------------------------

    function grantAccess(bytes32 documentHash, address user)
        external
        onlyOwner(documentHash)
    {
        require(user != address(0), "Invalid address");
        _access[documentHash][user] = true;
        emit AccessGranted(documentHash, msg.sender, user);
    }

    function revokeAccess(bytes32 documentHash, address user)
        external
        onlyOwner(documentHash)
    {
        _access[documentHash][user] = false;
        emit AccessRevoked(documentHash, msg.sender, user);
    }

    /**
     * @notice Returns true if `user` is the owner OR has been granted access.
     */
    function hasAccess(bytes32 documentHash, address user)
        external
        view
        returns (bool)
    {
        if (!_docs[documentHash].exists) return false;
        if (_docs[documentHash].owner == user) return true;
        return _access[documentHash][user];
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    function getDocument(bytes32 documentHash)
        external
        view
        returns (
            address owner,
            string memory cid,
            uint256 createdAt,
            uint256 updatedAt,
            uint256 versionCount
        )
    {
        require(_docs[documentHash].exists, "Document not found");
        DocumentMetadata storage d = _docs[documentHash];
        return (d.owner, d.cid, d.createdAt, d.updatedAt, d.versionCount);
    }

    function getVersionCount(bytes32 documentHash)
        external
        view
        returns (uint256)
    {
        require(_docs[documentHash].exists, "Document not found");
        return _versions[documentHash].length;
    }

    function getVersionAtIndex(bytes32 documentHash, uint256 index)
        external
        view
        returns (string memory)
    {
        require(_docs[documentHash].exists, "Document not found");
        require(index < _versions[documentHash].length, "Index out of bounds");
        return _versions[documentHash][index];
    }
}
