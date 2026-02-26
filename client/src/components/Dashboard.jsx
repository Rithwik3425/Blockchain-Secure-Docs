import React, { useState, useCallback, useEffect } from "react";
import { useWallet } from "../wallet";
import DocumentList from "./DocumentList";
import AuditTrail from "./AuditTrail";

/**
 * Dashboard.jsx
 *
 * Phase 7 — IPFS Storage & Upload Dashboard
 *
 * The private area of the application. Provides:
 *  - Secure file upload to IPFS.
 *  - Real-time document listing.
 *  - Integration with the backend metadata API.
 */
const Dashboard = () => {
  const { address, signature, network, switchNetwork, disconnect } = useWallet();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeTab, setActiveTab] = useState("vault");

  // Phase 11 — Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date");

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

  /**
   * handleFileUpload
   * 
   * Handlers the actual upload to our backend.
   */
  const handleFileUpload = async (file) => {
    if (!file || !address || !signature) return;

    setIsUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", file.name);

    try {
      const response = await fetch(`${API_BASE}/api/documents/upload`, {
        method: "POST",
        headers: {
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
        body: formData,
      });

      const data = await response.json();

      if (!data.success) {
        if (response.status === 401) {
          disconnect();
        }
        throw new Error(data.error ?? "Upload failed");
      }

      // Trigger a list refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("[dashboard] upload error:", err);
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Network Alert (Phase 9 Verification Helper) */}
      {network?.id !== 31337 && (
        <div className="mb-8 flex items-center justify-between rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-amber-400">
          <div className="flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm font-medium">
              You are on <span className="font-bold">{network?.label ?? "an Unknown Network"}</span>. 
              Please switch to <span className="text-slate-100">Local Hardhat</span> for Phase 9 testing.
            </p>
          </div>
          <button 
            onClick={() => switchNetwork(31337)}
            className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-slate-950 transition-all hover:bg-amber-400 active:scale-95"
          >
            Switch to Hardhat
          </button>
        </div>
      )}

      {/* Header Section */}
      <div className="mb-12 flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">Your Secure Vault</h1>
          <p className="mt-2 text-slate-400">
            Upload, manage, and share your documents with blockchain-anchored integrity.
          </p>
        </div>
        
        <div className="flex gap-4">
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm text-slate-400">
            <span className="mr-2 text-primary-400">●</span>
            Connected as <span className="text-slate-200">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-8 flex gap-8 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("vault")}
          className={`pb-4 text-sm font-semibold transition-all ${
            activeTab === "vault"
              ? "border-b-2 border-primary-500 text-primary-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          My Vault
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={`pb-4 text-sm font-semibold transition-all ${
            activeTab === "activity"
              ? "border-b-2 border-primary-500 text-primary-400"
              : "text-slate-500 hover:text-slate-300"
          }`}
        >
          Activity Log
        </button>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {activeTab === "vault" ? (
          <>
            {/* Upload Panel */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur-sm">
                <h2 className="mb-4 text-lg font-semibold text-slate-200">Upload New Document</h2>
                
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={onDrop}
                  className={`group relative flex h-64 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-200 ${
                    isUploading 
                      ? "border-primary-500/50 bg-primary-500/5" 
                      : "border-slate-800 bg-slate-950/50 hover:border-primary-500/30 hover:bg-slate-900/50"
                  }`}
                >
                  {isUploading ? (
                    <div className="flex flex-col items-center">
                      <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                      <p className="mt-4 text-sm font-medium text-primary-400">Pinning to IPFS...</p>
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        onChange={onFileSelect}
                        className="absolute inset-0 z-10 cursor-pointer opacity-0"
                      />
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-4 rounded-full bg-slate-800/50 p-4 text-slate-400 transition-colors group-hover:bg-primary-500/10 group-hover:text-primary-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-300">
                          Drag and drop file here
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          or click to browse (Max 10MB)
                        </p>
                      </div>
                    </>
                  )}
                </div>

                {uploadError && (
                  <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-xs text-red-400 border border-red-500/20">
                    {uploadError}
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                    <p className="text-xs text-slate-500">Files are encrypted and stored on the decentralized IPFS network.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500" />
                    <p className="text-xs text-slate-500">Metadata is anchored to the blockchain for tamper-proof auditing.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* List Panel */}
            <div className="lg:col-span-2">
              {/* Search & Sort Bar (Phase 11) */}
              <div className="mb-4 flex items-center gap-3">
                <div className="relative flex-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search documents..."
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
              <DocumentList refreshTrigger={refreshTrigger} searchQuery={searchQuery} sortBy={sortBy} />
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
