import React, { useState } from "react";
import { useWallet } from "../wallet";

/**
 * UpdateVersionModal.jsx  —  Phase 10
 *
 * Drag-and-drop upload modal for adding a new version to an existing document.
 */
const UpdateVersionModal = ({ isOpen, onClose, document, onUpdated }) => {
  const { address, signature } = useWallet();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [newDoc, setNewDoc] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

  const handleUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE}/api/documents/${document._id}/update`, {
        method: "POST",
        headers: {
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? "Update failed");
      setSuccess(true);
      setNewDoc(data.document);
      onUpdated?.(data.document);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsUploading(false);
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
    setNewDoc(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Upload New Version</h2>
            <p className="mt-0.5 text-xs text-slate-400 truncate max-w-xs">{document?.name}</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {success ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-base font-semibold text-slate-100">Version {newDoc?.currentVersion} Uploaded!</p>
                <p className="mt-1 text-xs text-slate-400 font-mono">CID: {newDoc?.ipfsHash?.slice(0, 10)}...{newDoc?.ipfsHash?.slice(-8)}</p>
              </div>
              <button
                onClick={handleClose}
                className="mt-2 w-full rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <div className="mb-4 rounded-lg bg-slate-800/50 p-3 text-xs text-slate-400 border border-slate-700">
                <span className="text-slate-200 font-medium">Current:</span> Version {document?.currentVersion}
                {" · "}
                <span className="font-mono">{document?.ipfsHash?.slice(0, 8)}...{document?.ipfsHash?.slice(-6)}</span>
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={onDrop}
                className={`relative flex h-44 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all ${
                  isUploading
                    ? "border-primary-500/50 bg-primary-500/5"
                    : "border-slate-700 bg-slate-950/50 hover:border-primary-500/40 hover:bg-slate-900/50"
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
                    <p className="text-sm text-primary-400">Pinning to IPFS...</p>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUpload(file);
                      }}
                      className="absolute inset-0 z-10 cursor-pointer opacity-0"
                    />
                    <div className="flex flex-col items-center text-center">
                      <div className="mb-3 rounded-full bg-slate-800 p-3 text-slate-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                      </div>
                      <p className="text-sm font-medium text-slate-300">Drop new version here</p>
                      <p className="mt-1 text-xs text-slate-500">or click to browse</p>
                    </div>
                  </>
                )}
              </div>

              {error && (
                <div className="mt-3 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
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
