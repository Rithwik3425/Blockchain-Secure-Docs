import React, { useState, useEffect } from "react";
import { useWallet } from "../wallet";

/**
 * AuditTrail.jsx
 * 
 * Phase 8 — Audit Trails
 * 
 * Fetches and displays the activity log for the current user.
 */
const AuditTrail = () => {
  const { address, signature } = useWallet();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

  const fetchLogs = async () => {
    if (!address || !signature) return;
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE}/api/audits/my`, {
        headers: {
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error ?? "Failed to fetch logs");
      
      setLogs(data.audits);
    } catch (err) {
      console.error("[audit-trail] fetch error:", err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [address, signature]);

  // UI Helpers
  const getActionIcon = (action) => {
    switch (action) {
      case "FILE_UPLOAD":
      case "UPLOAD": // legacy
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
        );
      case "VERSION_UPDATE":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
        );
      case "FILE_VIEW":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
        );
      case "ACCESS_GRANT":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "ACCESS_REVOKE":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500/10 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getActionLabel = (action) => {
    const labels = {
      FILE_UPLOAD: "File Upload",
      UPLOAD: "File Upload",
      VERSION_UPDATE: "Version Update",
      FILE_VIEW: "File Viewed",
      ACCESS_GRANT: "Access Granted",
      ACCESS_REVOKE: "Access Revoked",
    };
    return labels[action] ?? action.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  };

  if (isLoading && logs.length === 0) {
    return <div className="animate-pulse space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="h-16 rounded-xl bg-slate-800/20" />
      ))}
    </div>;
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/10 p-12 text-center text-slate-500">
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-200">Activity Log</h2>
        <button 
          onClick={fetchLogs}
          className="text-xs text-primary-400 hover:text-primary-300"
        >
          Refresh
        </button>
      </div>

      <div className="relative space-y-8 before:absolute before:left-4 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-slate-800">
        {logs.map((log) => (
          <div key={log._id} className="relative pl-12">
            <div className="absolute left-0 mt-0.5">
              {getActionIcon(log.action)}
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-200 capitalize">
                  {getActionLabel(log.action)}
                </span>
                <span className="text-[10px] text-slate-500">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
              
              <div className="text-xs text-slate-400">
                {log.documentId ? (
                  <>
                    Target document: <span className="text-primary-400/80">{log.documentId.name}</span>
                  </>
                ) : (
                  log.metadata.fileName || "System event"
                )}
              </div>
              
              {log.metadata.recipient && (
                <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
                  <span className="rounded bg-slate-800 px-1 py-0.5">To: {log.metadata.recipient.slice(0, 6)}...{log.metadata.recipient.slice(-4)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditTrail;
