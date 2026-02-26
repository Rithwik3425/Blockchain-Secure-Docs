import React, { useState } from "react";
import { ethers } from "ethers";
import { useWallet } from "../wallet";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "../blockchain/config";

/**
 * UpdateVersionModal.jsx  —  Phase 10
 *
 * Implements the 3-step canonical update flow:
 *   1. POST /prepare-version → pins to IPFS, returns { newCid, documentHash }
 *   2. Client wallet signs contract.updateDocument(documentHash, newCid)
 *   3. POST /confirm-version → server updates document index
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

const STEPS = [
  { id: 1, label: "Pinning to IPFS…" },
  { id: 2, label: "Awaiting wallet signature…" },
  { id: 3, label: "Confirming on-chain…" },
];

const UpdateVersionModal = ({ isOpen, onClose, document, onUpdated }) => {
  const { address, signature } = useWallet();
  const [uploadStep, setUploadStep] = useState(0); // 0 = idle, 1-3 = active
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [newDocContext, setNewDocContext] = useState(null);

  const isUploading = uploadStep > 0;

  const handleUpload = async (file) => {
    if (!file || !address || !signature || !document) return;
    
    setUploadStep(1);
    setError(null);
    setSuccess(false);

    try {
      // ── STEP 1: Server pins to IPFS ────────────────────────────────────────
      const formData = new FormData();
      formData.append("file", file);

      const prepRes = await fetch(`${API_BASE}/api/documents/${document._id}/prepare-version`, {
        method: "POST",
        headers: {
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
        body: formData,
      });

      const prepData = await prepRes.json();
      if (!prepData.success) throw new Error(prepData.error ?? "Failed to prepare version");

      const { newCid, documentHash } = prepData;
      if (!documentHash) throw new Error("Document is missing on-chain fingerprint");

      // ── STEP 2: Client signs updateDocument() tx ───────────────────────────
      setUploadStep(2);
      
      if (!window.ethereum) throw new Error("MetaMask not found");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

      const tx = await contract.updateDocument(documentHash, newCid);
      
      setUploadStep(3);
      const receipt = await tx.wait();

      // ── STEP 3: Confirm with Server ────────────────────────────────────────
      const confirmRes = await fetch(`${API_BASE}/api/documents/${document._id}/confirm-version`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
        body: JSON.stringify({
          newCid,
          txHash: receipt.hash,
          size: file.size,
        }),
      });

      const confirmData = await confirmRes.json();
      if (!confirmData.success) throw new Error(confirmData.error ?? "Failed to confirm version update");

      setSuccess(true);
      setNewDocContext({
        currentVersion: confirmData.document.currentVersion,
        cid: newCid,
      });
      onUpdated?.(confirmData.document);

    } catch (err) {
      console.error("[update-modal] error:", err);
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setError("Transaction cancelled in MetaMask.");
      } else {
        setError(err.reason || err.message || "Update failed");
      }
    } finally {
      if (!success) setUploadStep(0); // keep step at 3 if success
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  const handleClose = () => {
    setError(null);
    setSuccess(false);
    setUploadStep(0);
    setNewDocContext(null);
    onClose();
  };

  if (!isOpen) return null;

  const currentCid = document?.versions?.length 
    ? document.versions[document.versions.length - 1].ipfsHash 
    : document?.cid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800/80 px-6 py-4 bg-slate-900/50">
          <div>
            <h2 className="text-lg font-bold text-slate-100">New Version</h2>
            <p className="mt-0.5 text-xs text-slate-400 truncate max-w-[250px]">{document?.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Success State */}
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-base font-bold text-slate-100 mb-1">Version {newDocContext?.currentVersion} Anchored!</p>
                <div className="rounded-lg bg-slate-950 px-3 py-2 border border-slate-800 inline-block mt-2 text-left">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">New CID</p>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">{newDocContext?.cid}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-slate-700 active:scale-95"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              {/* Context info */}
              <div className="mb-5 rounded-xl bg-slate-950/40 p-3.5 border border-slate-800/50">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-slate-400">Current Version</span>
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">v{document?.currentVersion ?? 1}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {currentCid}
                </div>
              </div>

              {/* Upload Zone */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 px-4 text-center transition-all ${
                  isUploading
                    ? "border-primary-500/50 bg-primary-500/5"
                    : "border-slate-700 bg-slate-950/50 hover:border-primary-500/40 hover:bg-slate-900/50"
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3 w-full">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mb-2" />
                    <p className="text-sm font-medium text-primary-400">
                      {STEPS[uploadStep - 1]?.label}
                    </p>
                    <div className="flex gap-2">
                      {STEPS.map((s) => (
                        <div
                          key={s.id}
                          className={`h-1.5 w-8 rounded-full transition-all duration-300 ${
                            s.id <= uploadStep ? "bg-primary-500" : "bg-slate-800"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                        e.target.value = "";
                      }}
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    />
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/80 text-slate-400 transition-colors group-hover:bg-primary-500/10 group-hover:text-primary-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-300">Drag & drop new version</p>
                    <p className="mt-1 text-xs text-slate-500">or click to browse</p>
                  </>
                )}
              </div>

              {/* Error State */}
              {error && (
                <div className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 text-center">
                  {error}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateVersionModal;
