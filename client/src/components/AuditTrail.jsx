import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWallet } from "../wallet";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "../blockchain/config";

/**
 * AuditTrail.jsx
 * 
 * Phase 8/13 — Audit Trails (Event-Sourced)
 * 
 * Fetches and merges:
 *  1. Backend logs (for off-chain actions like FILE_VIEW)
 *  2. Smart Contract Events (for on-chain actions: Register, Update, Grant, Revoke)
 * 
 * Displays Block Number, Tx Hash, and IPFS CIDs where applicable.
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
      // 1. Fetch Backend Logs (FILE_VIEW, etc)
      const response = await fetch(`${API_BASE}/api/audits/my`, {
        headers: {
          "x-wallet-address": address,
          "x-wallet-signature": signature,
        },
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error ?? "Failed to fetch backend logs");
      
      let allLogs = data.audits.map(log => ({
        id: log._id,
        action: log.action,
        timestamp: new Date(log.createdAt).getTime(),
        documentName: log.documentId?.name || log.metadata?.name || "System event",
        metadata: log.metadata || {},
        source: "backend"
      }));

      // 2. Fetch Blockchain Events
      try {
        if (window.ethereum) {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

          // Get events where owner == address
          const registeredFilter = contract.filters.DocumentRegistered(null, address);
          const updatedFilter    = contract.filters.DocumentUpdated(null, address);
          const grantedFilter    = contract.filters.AccessGranted(null, address);
          const revokedFilter    = contract.filters.AccessRevoked(null, address);

          const [regEvents, updEvents, graEvents, revEvents] = await Promise.all([
            contract.queryFilter(registeredFilter, -50000),
            contract.queryFilter(updatedFilter, -50000),
            contract.queryFilter(grantedFilter, -50000),
            contract.queryFilter(revokedFilter, -50000),
          ]);

          const processEvent = async (e, actionType) => {
            const block = await e.getBlock();
            return {
              id: `${e.transactionHash}-${e.logIndex}`,
              action: actionType,
              timestamp: block.timestamp * 1000,
              documentName: `Doc: ${e.args.documentHash.slice(0, 10)}...`, // We don't have the string name off-chain easily, fallback string
              metadata: {
                documentHash: e.args.documentHash,
                txHash: e.transactionHash,
                blockNumber: e.blockNumber,
                cid: e.args.cid || e.args.newCid, // from registered/updated
                version: e.args.version ? Number(e.args.version) : undefined,
                recipient: e.args.user, // from granted/revoked
              },
              source: "blockchain"
            };
          };

          const eventPromises = [
            ...regEvents.map(e => processEvent(e, "ONCHAIN_REGISTER")),
            ...updEvents.map(e => processEvent(e, "ONCHAIN_UPDATE")),
            ...graEvents.map(e => processEvent(e, "ONCHAIN_GRANT")),
            ...revEvents.map(e => processEvent(e, "ONCHAIN_REVOKE")),
          ];

          const chainLogs = await Promise.all(eventPromises);
          allLogs = [...allLogs, ...chainLogs];
        }
      } catch (chainErr) {
        console.warn("Could not fetch blockchain events:", chainErr);
        // We will still show backend logs
      }

      // Sort descending by timestamp
      allLogs.sort((a, b) => b.timestamp - a.timestamp);
      
      setLogs(allLogs);
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
      case "ONCHAIN_REGISTER":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
        );
      case "VERSION_UPDATE":
      case "ONCHAIN_UPDATE":
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
      case "ONCHAIN_GRANT":
        return (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case "ACCESS_REVOKE":
      case "ONCHAIN_REVOKE":
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
      FILE_UPLOAD: "Upload Prepared (Off-chain)",
      UPLOAD: "Upload Prepared (Off-chain)",
      VERSION_UPDATE: "Update Prepared (Off-chain)",
      FILE_VIEW: "File Viewed",
      ACCESS_GRANT: "Access Granted",
      ACCESS_REVOKE: "Access Revoked",
      ONCHAIN_REGISTER: "Registered On-Chain",
      ONCHAIN_UPDATE: "Updated On-Chain",
      ONCHAIN_GRANT: "Access Granted On-Chain",
      ONCHAIN_REVOKE: "Access Revoked On-Chain",
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-700/60 bg-slate-900/20 p-12 text-center text-slate-500 shadow-inner backdrop-blur-sm">
        <svg xmlns="http://www.w3.org/2000/svg" className="mb-4 h-10 w-10 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-sm tracking-wide">No activity recorded yet.</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h2 className="text-lg font-bold tracking-tight text-slate-200">Activity Log</h2>
        <button 
          onClick={fetchLogs}
          className="rounded-full border border-slate-700/60 bg-slate-900/50 px-3 py-1.5 text-xs font-medium tracking-wide text-primary-400 shadow-inner backdrop-blur-sm transition-all duration-300 hover:border-primary-500/40 hover:bg-slate-800 hover:text-primary-300 hover:shadow-[0_0_10px_rgba(34,211,238,0.15)]"
        >
          Refresh Logs
        </button>
      </div>

      <div className="relative space-y-8 before:absolute before:left-[19px] before:top-4 before:h-[calc(100%-32px)] before:w-px before:bg-linear-to-b before:from-slate-800 before:via-slate-700 before:to-transparent">
        {logs.map((log) => (
          <div key={log.id} className="group relative pl-12">
            <div className="absolute left-0 top-1 shadow-[0_0_10px_rgba(0,0,0,0.5)] rounded-full z-10">
              {getActionIcon(log.action)}
            </div>
            
            <div className="space-y-3 rounded-xl border border-slate-800/80 bg-slate-900/40 p-5 shadow-lg backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900/60 hover:shadow-[0_0_15px_rgba(255,255,255,0.03)]">
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-200">
                    {getActionLabel(log.action)}
                  </span>
                  {log.source === "blockchain" && (
                    <span className="shrink-0 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.2)]">
                      On-Chain Event
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium tracking-wide text-slate-500 sm:text-right">
                  {new Date(log.timestamp).toLocaleString()}
                </span>
              </div>
              
              <div className="text-xs font-medium text-slate-400">
                {log.documentName}
              </div>
              
              {/* Detailed Metadata Grid */}
              <div className="mt-3 grid gap-1.5 text-[10px]">
                
                {log.metadata.recipient && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                    <span className="w-20 shrink-0 font-semibold tracking-wide text-slate-500 uppercase">Recipient:</span>
                    <span className="min-w-0 break-all font-mono text-slate-400">{log.metadata.recipient}</span>
                  </div>
                )}
                
                {log.metadata.version && (
                  <div className="flex items-start gap-2">
                    <span className="w-20 font-semibold text-slate-500">Version:</span>
                    <span className="font-bold text-emerald-400">v{log.metadata.version}</span>
                  </div>
                )}
                
                {log.metadata.documentHash && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                    <span className="w-20 shrink-0 font-semibold tracking-wide text-slate-500 uppercase">Doc Hash:</span>
                    <span className="min-w-0 break-all font-mono text-slate-400" title={log.metadata.documentHash}>
                      {log.metadata.documentHash}
                    </span>
                  </div>
                )}

                {log.metadata.cid && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                    <span className="w-20 shrink-0 font-semibold tracking-wide text-slate-500 uppercase">IPFS CID:</span>
                    <a
                      href={`https://ipfs.io/ipfs/${log.metadata.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 break-all font-mono text-primary-400/80 transition-colors hover:text-primary-300 hover:underline"
                      title={log.metadata.cid}
                    >
                      {log.metadata.cid}
                    </a>
                  </div>
                )}
                
                {log.source === "blockchain" && log.metadata.blockNumber && (
                  <div className="flex items-start gap-2">
                    <span className="w-20 font-semibold text-slate-500">Block:</span>
                    <span className="font-mono text-slate-300">#{log.metadata.blockNumber}</span>
                  </div>
                )}

                {log.source === "blockchain" && log.metadata.txHash && (
                  <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-2">
                    <span className="w-20 shrink-0 font-semibold tracking-wide text-slate-500 uppercase">Tx Hash:</span>
                    <a
                      href={`https://amoy.polygonscan.com/tx/${log.metadata.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 break-all font-mono text-slate-400 transition-colors hover:text-primary-400 hover:underline"
                      title={log.metadata.txHash}
                    >
                      {log.metadata.txHash}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AuditTrail;
