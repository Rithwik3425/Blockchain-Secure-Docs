import React, { useState, useEffect } from "react";
import { useWallet } from "../wallet";

/**
 * VersionHistoryModal.jsx  —  Phase 10
 *
 * Shows all uploaded versions of a document with IPFS links.
 */
const VersionHistoryModal = ({ isOpen, onClose, document }) => {
  const { address, signature } = useWallet();
  const [versions, setVersions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

  useEffect(() => {
    if (!isOpen || !document) return;

    const fetchVersions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/api/documents/${document._id}/versions`, {
          headers: {
            "x-wallet-address": address,
            "x-wallet-signature": signature,
          },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error ?? "Failed to fetch versions");
        setVersions(data.versions ?? []);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVersions();
  }, [isOpen, document]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">Version History</h2>
            <p className="mt-0.5 text-xs text-slate-400 truncate max-w-xs">{document?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : error ? (
            <p className="text-center text-sm text-red-400">{error}</p>
          ) : versions.length === 0 ? (
            <p className="text-center text-sm text-slate-500">No version history found.</p>
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-[19px] top-3 bottom-3 w-px bg-slate-700" />
              {[...versions].reverse().map((v) => (
                <div key={v.version} className="relative flex items-start gap-4 pb-6">
                  {/* Dot */}
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${
                    v.version === Math.max(...versions.map(x => x.version))
                      ? "border-primary-500 bg-primary-500/10 text-primary-400"
                      : "border-slate-700 bg-slate-800 text-slate-400"
                  }`}>
                    <span className="text-xs font-bold">v{v.version}</span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pt-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm font-medium ${
                        v.version === Math.max(...versions.map(x => x.version))
                          ? "text-primary-400" : "text-slate-300"
                      }`}>
                        {v.version === Math.max(...versions.map(x => x.version)) ? "Latest" : `Version ${v.version}`}
                      </span>
                      <a
                        href={`https://ipfs.io/ipfs/${v.ipfsHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        View
                      </a>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500 font-mono">
                      {v.ipfsHash.slice(0, 12)}...{v.ipfsHash.slice(-8)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-600">
                      {new Date(v.createdAt).toLocaleString()} · {(v.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VersionHistoryModal;
