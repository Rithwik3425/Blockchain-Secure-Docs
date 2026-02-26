const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DocumentRegistry", function () {
  let documentRegistry;
  let owner;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const DocumentRegistry = await ethers.getContractFactory("DocumentRegistry");
    documentRegistry = await DocumentRegistry.deploy();
  });

  describe("Registration", function () {
    it("Should register a new document", async function () {
      const ipfsHash = "QmTest123456789";
      const name = "Test Document";

      await expect(documentRegistry.connect(addr1).registerDocument(ipfsHash, name))
        .to.emit(documentRegistry, "DocumentRegistered")
        .withArgs(ipfsHash, addr1.address, name);

      const doc = await documentRegistry.getDocument(ipfsHash);
      expect(doc.ipfsHash).to.equal(ipfsHash);
      expect(doc.name).to.equal(name);
      expect(doc.owner).to.equal(addr1.address);
      expect(doc.version).to.equal(1);
    });

    it("Should fail if IPFS hash is empty", async function () {
      await expect(documentRegistry.registerDocument("", "Empty Hash"))
        .to.be.revertedWith("IPFS hash is required");
    });

    it("Should fail if document is already registered", async function () {
      const ipfsHash = "QmDuplicate123";
      await documentRegistry.registerDocument(ipfsHash, "Original");
      await expect(documentRegistry.registerDocument(ipfsHash, "Duplicate"))
        .to.be.revertedWith("Document already registered");
    });
  });

  describe("Updates", function () {
    it("Should allow the owner to update a document", async function () {
      const ipfsHash = "QmUpdateTest";
      await documentRegistry.connect(addr1).registerDocument(ipfsHash, "Initial");
      
      await expect(documentRegistry.connect(addr1).updateDocument(ipfsHash))
        .to.emit(documentRegistry, "DocumentUpdated")
        .withArgs(ipfsHash, addr1.address, 2);

      const doc = await documentRegistry.getDocument(ipfsHash);
      expect(doc.version).to.equal(2);
    });

    it("Should prevent non-owners from updating", async function () {
      const ipfsHash = "QmNonOwnerTest";
      await documentRegistry.connect(addr1).registerDocument(ipfsHash, "Initial");
      
      await expect(documentRegistry.connect(addr2).updateDocument(ipfsHash))
        .to.be.revertedWith("Not the document owner");
    });
  });

  describe("Access Control", function () {
    const ipfsHash = "QmAccessTest";

    beforeEach(async function () {
      await documentRegistry.connect(addr1).registerDocument(ipfsHash, "Access Controlled Doc");
    });

    it("Should allow the owner to grant and revoke access", async function () {
      // Initially no access for addr2
      expect(await documentRegistry.hasAccess(ipfsHash, addr2.address)).to.be.false;

      // Grant access
      await expect(documentRegistry.connect(addr1).grantAccess(ipfsHash, addr2.address))
        .to.emit(documentRegistry, "AccessGranted")
        .withArgs(ipfsHash, addr1.address, addr2.address);

      expect(await documentRegistry.hasAccess(ipfsHash, addr2.address)).to.be.true;

      // Revoke access
      await expect(documentRegistry.connect(addr1).revokeAccess(ipfsHash, addr2.address))
        .to.emit(documentRegistry, "AccessRevoked")
        .withArgs(ipfsHash, addr1.address, addr2.address);

      expect(await documentRegistry.hasAccess(ipfsHash, addr2.address)).to.be.false;
    });

    it("Should confirm the owner always has access", async function () {
      expect(await documentRegistry.hasAccess(ipfsHash, addr1.address)).to.be.true;
    });

    it("Should prevent non-owners from granting or revoking access", async function () {
      await expect(documentRegistry.connect(addr2).grantAccess(ipfsHash, addr2.address))
        .to.be.revertedWith("Not the document owner");

      await expect(documentRegistry.connect(addr2).revokeAccess(ipfsHash, addr1.address))
        .to.be.revertedWith("Not the document owner");
    });

    it("Should return false for non-existent documents", async function () {
      expect(await documentRegistry.hasAccess("QmDoesNotExist", addr1.address)).to.be.false;
    });
  });
});
