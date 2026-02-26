// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DocumentRegistry
 * @dev Phase 10: Versioned document registry.
 * Each document has a stable ID (its first IPFS hash). New versions push
 * new CIDs into a history array while preserving access control.
 */
contract DocumentRegistry is Ownable {
    struct DocumentMetadata {
        string originalHash;   // Stable ID — never changes
        string name;
        address owner;
        uint256 timestamp;     // Last-updated timestamp
        uint256 currentVersion;
    }

    // Stable ID => metadata
    mapping(string => DocumentMetadata) private documents;
    // Stable ID => exists?
    mapping(string => bool) private docExists;
    // Stable ID => ordered list of version CIDs (index 0 = v1)
    mapping(string => string[]) private versionHistory;
    // Stable ID => user address => has access?
    mapping(string => mapping(address => bool)) private accessList;

    // Events
    event DocumentRegistered(string indexed docId, address indexed owner, string name);
    event DocumentUpdated(string indexed docId, address indexed owner, uint256 version, string newHash);
    event AccessGranted(string indexed docId, address indexed owner, address indexed user);
    event AccessRevoked(string indexed docId, address indexed owner, address indexed user);

    constructor() Ownable(msg.sender) {}

    // -------------------------------------------------------------------------
    // Core CRUD
    // -------------------------------------------------------------------------

    /**
     * @dev Registers a new document. The IPFS hash provided becomes the
     *      stable document ID as well as the first version entry.
     */
    function registerDocument(string memory _ipfsHash, string memory _name) public {
        require(bytes(_ipfsHash).length > 0, "IPFS hash required");
        require(!docExists[_ipfsHash], "Document already registered");

        documents[_ipfsHash] = DocumentMetadata({
            originalHash: _ipfsHash,
            name: _name,
            owner: msg.sender,
            timestamp: block.timestamp,
            currentVersion: 1
        });

        docExists[_ipfsHash] = true;
        versionHistory[_ipfsHash].push(_ipfsHash);

        emit DocumentRegistered(_ipfsHash, msg.sender, _name);
    }

    /**
     * @dev Uploads a new version of an existing document.
     * @param _docId    The stable ID (original IPFS hash) of the document.
     * @param _newHash  The IPFS hash of the new file content.
     */
    function updateDocument(string memory _docId, string memory _newHash) public {
        require(docExists[_docId], "Document not found");
        require(documents[_docId].owner == msg.sender, "Not the document owner");
        require(bytes(_newHash).length > 0, "New hash required");

        documents[_docId].currentVersion += 1;
        documents[_docId].timestamp = block.timestamp;
        versionHistory[_docId].push(_newHash);

        emit DocumentUpdated(_docId, msg.sender, documents[_docId].currentVersion, _newHash);
    }

    // -------------------------------------------------------------------------
    // Access Control
    // -------------------------------------------------------------------------

    function grantAccess(string memory _docId, address _user) public {
        require(docExists[_docId], "Document not found");
        require(documents[_docId].owner == msg.sender, "Not the document owner");
        require(_user != address(0), "Invalid address");

        accessList[_docId][_user] = true;
        emit AccessGranted(_docId, msg.sender, _user);
    }

    function revokeAccess(string memory _docId, address _user) public {
        require(docExists[_docId], "Document not found");
        require(documents[_docId].owner == msg.sender, "Not the document owner");

        accessList[_docId][_user] = false;
        emit AccessRevoked(_docId, msg.sender, _user);
    }

    function hasAccess(string memory _docId, address _user) public view returns (bool) {
        if (!docExists[_docId]) return false;
        if (documents[_docId].owner == _user) return true;
        return accessList[_docId][_user];
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    function getDocument(string memory _docId) public view returns (
        string memory originalHash,
        string memory name,
        address owner,
        uint256 timestamp,
        uint256 currentVersion,
        string memory latestHash
    ) {
        require(docExists[_docId], "Document not found");
        DocumentMetadata memory doc = documents[_docId];
        string[] memory history = versionHistory[_docId];
        return (
            doc.originalHash,
            doc.name,
            doc.owner,
            doc.timestamp,
            doc.currentVersion,
            history[history.length - 1]
        );
    }

    function getVersionCount(string memory _docId) public view returns (uint256) {
        require(docExists[_docId], "Document not found");
        return versionHistory[_docId].length;
    }

    function getVersionAtIndex(string memory _docId, uint256 _index) public view returns (string memory) {
        require(docExists[_docId], "Document not found");
        require(_index < versionHistory[_docId].length, "Index out of bounds");
        return versionHistory[_docId][_index];
    }
}
