import React, { useState, useEffect } from "react";
import { useWallet } from "../wallet";
import ShareModal from "./ShareModal";
import VersionHistoryModal from "./VersionHistoryModal";
import UpdateVersionModal from "./UpdateVersionModal";

/**
 * DocumentList.jsx  —  Phase 7 + 9 + 10
 *
 * Displays authenticated user's documents with options to:
 * - View on IPFS
 * - Share (grant on-chain access)
 * - Upload a new version
 * - Browse version history
 */
const DocumentList = ({ refreshTrigger, searchQuery, sortBy = "date" }) => {
  const { address, signature, disconnect } = useWallet();
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

  const fetchDocuments = async () => {
    if (!address || !signature) return;
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (sortBy && sortBy !== "date") params.append("sort", sortBy);

      const response = await fetch(`${API_BASE}/api/documents/my?${params}`, {
        headers: {
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
      });

      const data = await response.json();

      if (!data.success) {
        if (response.status === 401) {
          disconnect();
          throw new Error("Session expired. Please reconnect your wallet.");
        }
        throw new Error(data.error ?? "Failed to fetch documents");
      }

      setDocuments(data.documents);
    } catch (err) {
      console.error("[doc-list] fetch error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [address, signature, refreshTrigger, searchQuery]);

  const openShare = (doc) => { setSelectedDoc(doc); setIsShareModalOpen(true); };
  const openHistory = (doc) => { setSelectedDoc(doc); setIsHistoryModalOpen(true); };
  const openUpdate = (doc) => { setSelectedDoc(doc); setIsUpdateModalOpen(true); };

  const getFileIcon = (mimeType = "") => {
    if (mimeType.startsWith("image/")) return "🖼️";
    if (mimeType === "application/pdf") return "📄";
    if (mimeType.startsWith("video/")) return "🎬";
    if (mimeType.startsWith("audio/")) return "🎵";
    if (mimeType.includes("zip") || mimeType.includes("tar")) return "📦";
    return "📝";
  };

  if (isLoading && documents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-red-400">Failed to load documents: {error}</p>
        <button onClick={fetchDocuments} className="mt-4 text-sm text-primary-400 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 text-center">
        <div className="mb-4 text-slate-600">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-slate-400">
          {searchQuery ? `No documents matching "${searchQuery}"` : "No documents in your vault."}
        </p>
        {!searchQuery && <p className="mt-1 text-sm text-slate-600">Drag a file into the upload zone to get started.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">Recent Uploads</h2>
        <span className="text-xs text-slate-500">{documents.length} document(s)</span>
      </div>

      <div className="grid gap-3">
        {documents.map((doc) => (
          <div
            key={doc._id}
            className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900/50"
          >
            {/* Left — icon + metadata */}
            <div className="flex items-center gap-4 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-xl group-hover:bg-primary-500/20">
                {getFileIcon(doc.mimeType)}
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium text-slate-200">{doc.name}</h3>
                <div className="mt-1 flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{(doc.size / 1024).toFixed(1)} KB</span>
                  <span>·</span>
                  <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  <span>·</span>
                  <span className="text-primary-400/80 font-mono">CID: {doc.ipfsHash?.slice(0, 6)}...{doc.ipfsHash?.slice(-6)}</span>
                  {doc.currentVersion > 1 && (
                    <>
                      <span>·</span>
                      <span className="text-emerald-400 font-semibold">v{doc.currentVersion}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right — action buttons */}
            <div className="flex shrink-0 items-center gap-1.5 ml-3">
              {/* View latest — always use the latest version's CID */}
              {(() => {
                // Prefer the last entry in the versions array (most recent upload)
                const latestCid =
                  doc.versions?.length > 0
                    ? doc.versions[doc.versions.length - 1].ipfsHash
                    : doc.ipfsHash;
                const isMock = !latestCid || latestCid.startsWith("mock-");
                return isMock ? (
                  <span
                    title="This file was uploaded before IPFS was running. Re-upload to get a real CID."
                    className="cursor-not-allowed rounded-lg bg-slate-800/40 px-2.5 py-1.5 text-xs font-medium text-slate-600"
                  >
                    No IPFS
                  </span>
                ) : (
                  <a
                    href={`https://ipfs.io/ipfs/${latestCid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`View on IPFS: ${latestCid}`}
                    className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700"
                  >
                    View
                  </a>
                );
              })()}

              {/* History */}
              <button
                onClick={() => openHistory(doc)}
                title="Version History"
                className="rounded-lg bg-slate-800/50 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>

              {/* Upload new version */}
              <button
                onClick={() => openUpdate(doc)}
                title="Upload New Version"
                className="rounded-lg bg-slate-800/50 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-emerald-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>

              {/* Share */}
              <button
                onClick={() => openShare(doc)}
                title="Share On-Chain"
                className="rounded-lg bg-primary-500/10 px-2.5 py-1.5 text-xs font-medium text-primary-400 transition-colors hover:bg-primary-500/20"
              >
                Share
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        document={selectedDoc}
        onShared={(recipient) => console.log(`Shared ${selectedDoc?.name} with ${recipient}`)}
      />
      <VersionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        document={selectedDoc}
      />
      <UpdateVersionModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        document={selectedDoc}
        onUpdated={() => {
          setIsUpdateModalOpen(false);
          fetchDocuments();
        }}
      />
    </div>
  );
};

export default DocumentList;
