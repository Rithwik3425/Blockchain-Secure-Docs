import React, { useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "../wallet";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "../blockchain/config";
import DocumentList from "./DocumentList";
import AuditTrail from "./AuditTrail";

/**
 * Dashboard.jsx
 *
 * Phase 6 — Canonical upload flow:
 *
 *   Step 1 — Server: Pin to IPFS, compute keccak256 → { cid, documentHash }
 *   Step 2 — Client: MetaMask signs registerDocument(documentHash, cid)
 *   Step 3 — Server: POST /confirm → mark registeredOnChain:true in index
 */

const AMOY_CHAIN_ID = 80002;
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

// Upload step labels shown in the UI
const STEPS = [
  { id: 1, label: "Pinning to IPFS…"            },
  { id: 2, label: "Awaiting wallet signature…"  },
  { id: 3, label: "Confirming on-chain…"        },
];

const Dashboard = () => {
  const { address, signature, network, switchNetwork, disconnect } = useWallet();

  const [uploadStep,    setUploadStep]    = useState(0);   // 0 = idle, 1-3 = active step
  const [uploadError,   setUploadError]   = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab,     setActiveTab]     = useState("vault");
  const [searchQuery,   setSearchQuery]   = useState("");
  const [sortBy,        setSortBy]        = useState("date");

  const isUploading = uploadStep > 0;

  // ---------------------------------------------------------------------------
  // Canonical 3-step upload handler
  // ---------------------------------------------------------------------------
  const handleFileUpload = useCallback(async (file) => {
    if (!file || !address || !signature) return;

    setUploadStep(1);
    setUploadError(null);

    try {
      // ── STEP 1: Server — pin to IPFS + compute keccak256 ──────────────────
      const formData = new FormData();
      formData.append("file", file);
      formData.append("name", file.name);

      const uploadRes = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: {
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
        body: formData,
      });

      const uploadData = await uploadRes.json();

      if (!uploadData.success) {
        if (uploadRes.status === 401) disconnect();
        throw new Error(uploadData.error ?? "Upload failed");
      }

      const { cid, documentHash, documentId } = uploadData;

      // ── STEP 2: Client — MetaMask signs the on-chain registration tx ───────
      setUploadStep(2);

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

      const tx = await contract.registerDocument(documentHash, cid);
      setUploadStep(3);
      const receipt = await tx.wait();

      // ── STEP 3: Server — confirm index entry ───────────────────────────────
      await fetch(`${API_BASE}/api/documents/${documentId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
        body: JSON.stringify({ txHash: receipt.hash }),
      });

      setRefreshTrigger((n) => n + 1);
    } catch (err) {
      console.error("[dashboard] upload error:", err);
      // User rejection from MetaMask is not an error we want to show as red
      if (err.code === 4001 || err.code === "ACTION_REJECTED") {
        setUploadError("Transaction cancelled. The file was pinned to IPFS but not registered on-chain.");
      } else {
        setUploadError(err.message);
      }
    } finally {
      setUploadStep(0);
    }
  }, [address, signature, disconnect]);

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    // Reset input so the same file can be re-selected
    e.target.value = "";
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const isWrongNetwork = network?.id !== AMOY_CHAIN_ID;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">

      {/* Network Guard */}
      {isWrongNetwork && (
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-400">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">
              You are on <span className="font-bold">{network?.label ?? "an unknown network"}</span>.
              This app only supports <span className="font-semibold text-slate-100">Polygon Amoy</span>.
            </p>
          </div>
          <button
            onClick={() => switchNetwork(AMOY_CHAIN_ID)}
            className="ml-4 shrink-0 rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition-all hover:bg-amber-400 active:scale-95"
          >
            Switch Network
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Your Secure Vault</h1>
          <p className="mt-2 text-slate-400">
            Documents pinned to IPFS and anchored on Polygon Amoy.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm text-slate-400">
          <span className="mr-2 text-emerald-400">●</span>
          Connected as{" "}
          <span className="text-slate-200">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-8 border-b border-slate-800">
        {["vault", "activity"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-4 text-sm font-semibold capitalize transition-all ${
              activeTab === tab
                ? "border-b-2 border-primary-500 text-primary-400"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "vault" ? "My Vault" : "Activity Log"}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {activeTab === "vault" ? (
          <>
            {/* ── Upload Panel ──────────────────────────────────────────────── */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-200">Upload Document</h2>

                {/* Drop Zone */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className={`group relative flex h-56 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
                    isUploading
                      ? "border-primary-500/50 bg-primary-500/5"
                      : "border-slate-800 bg-slate-950/50 hover:border-primary-500/30 hover:bg-slate-900/50"
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center gap-3 px-4 text-center">
                      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                      <p className="text-sm font-medium text-primary-400">
                        {STEPS[uploadStep - 1]?.label}
                      </p>
                      {/* Step progress dots */}
                      <div className="flex gap-2 mt-1">
                        {STEPS.map((s) => (
                          <div
                            key={s.id}
                            className={`h-1.5 w-6 rounded-full transition-all ${
                              s.id <= uploadStep
                                ? "bg-primary-500"
                                : "bg-slate-700"
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-slate-500">Step {uploadStep} of {STEPS.length}</p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        id="file-upload"
                        onChange={onFileSelect}
                        disabled={isWrongNetwork}
                        className="absolute inset-0 z-10 cursor-pointer opacity-0 disabled:cursor-not-allowed"
                      />
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-4 rounded-full bg-slate-800/50 p-4 text-slate-400 transition-colors group-hover:bg-primary-500/10 group-hover:text-primary-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-300">Drag & drop or click to browse</p>
                        <p className="mt-1 text-xs text-slate-500">Max 10 MB</p>
                      </div>
                    </>
                  )}
                </div>

                {/* Error */}
                {uploadError && (
                  <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400">
                    {uploadError}
                  </div>
                )}

                {/* Info bullets */}
                <ul className="mt-5 space-y-2 text-xs text-slate-500">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                    File pinned to IPFS — content-addressed, immutable.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                    Ownership anchored on Polygon Amoy by your wallet.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                    Only you can grant or revoke access.
                  </li>
                </ul>
              </div>
            </div>

            {/* ── Document List ──────────────────────────────────────────────── */}
            <div className="lg:col-span-2">
              {/* Search & Sort */}
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search documents…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900/50 py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:border-primary-500/50 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="rounded-xl border border-slate-800 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-300 focus:border-primary-500/50 focus:outline-none"
                >
                  <option value="date">Newest First</option>
                  <option value="name">By Name</option>
                </select>
              </div>

              <DocumentList
                refreshTrigger={refreshTrigger}
                searchQuery={searchQuery}
                sortBy={sortBy}
              />
            </div>
          </>
        ) : (
          <div className="lg:col-span-3">
            <AuditTrail />
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
