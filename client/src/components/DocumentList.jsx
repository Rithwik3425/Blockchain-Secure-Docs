import React, { useState } from "react";
import { useWallet } from "../wallet";
import { useDocuments } from "../hooks/useDocuments";
import ShareModal from "./ShareModal";
import VersionHistoryModal from "./VersionHistoryModal";
import UpdateVersionModal from "./UpdateVersionModal";
import ViewDocumentModal from "./ViewDocumentModal";

/**
 * DocumentList.jsx  —  Phase 7
 *
 * Sourced from contract events (via useDocuments hook).
 * Shows on-chain registration status per document.
 */
const DocumentList = ({ refreshTrigger, searchQuery, sortBy = "date" }) => {
  const { address, signature, disconnect } = useWallet();
  const { documents, isLoading, error, refresh } = useDocuments(
    address, signature, searchQuery, sortBy
  );

  // Re-fetch whenever parent increments refreshTrigger
  React.useEffect(() => { if (refreshTrigger > 0) refresh(); }, [refreshTrigger]);

  const [shareDoc,   setShareDoc]   = useState(null);
  const [historyDoc, setHistoryDoc] = useState(null);
  const [updateDoc,  setUpdateDoc]  = useState(null);
  const [viewDoc,    setViewDoc]    = useState(null);

  const getFileIcon = (mimeType = "") => {
    if (mimeType.startsWith("image/"))   return "🖼️";
    if (mimeType === "application/pdf")  return "📄";
    if (mimeType.startsWith("video/"))   return "🎬";
    if (mimeType.startsWith("audio/"))   return "🎵";
    if (mimeType.includes("zip") || mimeType.includes("tar")) return "📦";
    return "📝";
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading && documents.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-8 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button onClick={refresh} className="mt-4 text-xs text-primary-400 hover:underline">
          Retry
        </button>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────────────────────────
  if (documents.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-4 h-10 w-10 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="text-sm text-slate-400">
          {searchQuery ? `No documents matching "${searchQuery}"` : "No documents yet."}
        </p>
        {!searchQuery && <p className="mt-1 text-xs text-slate-600">Upload a file to get started.</p>}
      </div>
    );
  }

  // ── List ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
          Documents
        </h2>
        <span className="text-xs text-slate-600">{documents.length} file{documents.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid gap-3">
        {documents.map((doc) => {
          const latestCid = doc.versions?.length
            ? doc.versions[doc.versions.length - 1].ipfsHash
            : doc.cid;
          const isMockCid   = !latestCid || latestCid.startsWith("mock-");
          const isOnChain   = doc.registeredOnChain;

          return (
            <div
              key={doc._id ?? doc.documentHash}
              className="group flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/30 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/50"
            >
              {/* Left — icon + metadata */}
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-500/10 text-xl group-hover:bg-primary-500/20">
                  {getFileIcon(doc.mimeType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-medium text-slate-200">{doc.name}</h3>
                    {/* On-chain status badge */}
                    {isOnChain ? (
                      <span className="shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-400">
                        on-chain
                      </span>
                    ) : (
                      <span className="shrink-0 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                        pending
                      </span>
                    )}
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                    <span>{((doc.size ?? 0) / 1024).toFixed(1)} KB</span>
                    <span>·</span>
                    <span>{doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : "—"}</span>
                    {latestCid && !isMockCid && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-primary-400/70">
                          {latestCid.slice(0, 8)}…{latestCid.slice(-6)}
                        </span>
                      </>
                    )}
                    {(doc.currentVersion ?? 1) > 1 && (
                      <>
                        <span>·</span>
                        <span className="font-semibold text-emerald-400">v{doc.currentVersion}</span>
                      </>
                    )}
                    {/* documentHash short display */}
                    {doc.documentHash && (
                      <>
                        <span>·</span>
                        <span
                          className="font-mono text-slate-600"
                          title={`documentHash: ${doc.documentHash}`}
                        >
                          #{doc.documentHash.slice(2, 8)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right — actions */}
              <div className="ml-3 flex shrink-0 items-center gap-1.5">
                {/* View on IPFS */}
                {isMockCid ? (
                  <span
                    title="This file has a mock CID — re-upload to pin to real IPFS."
                    className="cursor-not-allowed rounded-lg bg-slate-800/40 px-2.5 py-1.5 text-xs font-medium text-slate-600"
                  >
                    No IPFS
                  </span>
                ) : (
                  <button
                    onClick={() => setViewDoc(doc)}
                    title={`View document`}
                    disabled={!isOnChain}
                    className="rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    View
                  </button>
                )}

                {/* Version History */}
                <button
                  onClick={() => setHistoryDoc(doc)}
                  title="Version history"
                  className="rounded-lg bg-slate-800/50 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>

                {/* Upload New Version */}
                <button
                  onClick={() => setUpdateDoc(doc)}
                  title="Upload new version"
                  disabled={!isOnChain}
                  className="rounded-lg bg-slate-800/50 p-1.5 text-slate-400 transition-colors hover:bg-slate-700 hover:text-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                </button>

                {/* Share */}
                <button
                  onClick={() => setShareDoc(doc)}
                  title="Share on-chain"
                  disabled={!isOnChain}
                  className="rounded-lg bg-primary-500/10 px-2.5 py-1.5 text-xs font-medium text-primary-400 transition-colors hover:bg-primary-500/20 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Share
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={!!shareDoc}
        onClose={() => setShareDoc(null)}
        document={shareDoc}
        onShared={() => { setShareDoc(null); refresh(); }}
      />
      <VersionHistoryModal
        isOpen={!!historyDoc}
        onClose={() => setHistoryDoc(null)}
        document={historyDoc}
      />
      <UpdateVersionModal
        isOpen={!!updateDoc}
        onClose={() => setUpdateDoc(null)}
        document={updateDoc}
        onUpdated={() => { setUpdateDoc(null); refresh(); }}
      />
      <ViewDocumentModal
        isOpen={!!viewDoc}
        onClose={() => setViewDoc(null)}
        document={viewDoc}
        walletAddress={address}
      />
    </div>
  );
};

export default DocumentList;
