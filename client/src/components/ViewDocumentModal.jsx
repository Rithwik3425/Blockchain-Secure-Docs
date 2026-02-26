import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "../blockchain/config";

/**
 * ViewDocumentModal.jsx
 * 
 * Phase 9 — Document Viewer Access Control
 * 
 * Intercepts the "View" click, checks `contract.hasAccess()`,
 * and either opens the IPFS link or blocks the user.
 */
const ViewDocumentModal = ({ isOpen, onClose, document, walletAddress }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const checkAccess = async () => {
      if (!isOpen || !document || !walletAddress) return;
      
      setIsChecking(true);
      setError(null);
      setHasAccess(null);

      try {
        const docId = document.documentHash;
        if (!docId) {
          throw new Error("Missing documentHash (pending on-chain registration)");
        }

        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

        const authorized = await contract.hasAccess(docId, walletAddress);
        
        if (!cancelled) {
          setHasAccess(authorized);
          if (authorized) {
            // Auto-open after a brief success message
            setTimeout(() => {
              const latestCid = document.versions?.length 
                ? document.versions[document.versions.length - 1].ipfsHash 
                : document.cid;
              window.open(`https://ipfs.io/ipfs/${latestCid}`, '_blank');
              onClose();
            }, 1000);
          }
        }
      } catch (err) {
        console.error("[view-doc] access check failed:", err);
        if (!cancelled) setError(err.message || "Failed to verify on-chain access");
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    if (isOpen) {
      checkAccess();
    }

    return () => { cancelled = true; };
  }, [isOpen, document, walletAddress, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-950/60">
      <div className="w-full max-w-sm overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="p-6 text-center">
          
          {isChecking && (
            <div className="flex flex-col items-center py-4">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent mb-4" />
              <h3 className="text-lg font-bold text-slate-100 mb-1">Verifying Access</h3>
              <p className="text-sm text-slate-400">Querying Polygon Amoy...</p>
            </div>
          )}

          {!isChecking && hasAccess === true && (
            <div className="flex flex-col items-center py-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">Access Granted</h3>
              <p className="text-sm text-slate-400">Opening secure document...</p>
            </div>
          )}

          {!isChecking && hasAccess === false && (
            <div className="flex flex-col items-center py-4">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">Access Denied</h3>
              <p className="text-sm text-red-400 mb-6">Your wallet is not authorized to view this document.</p>
              <button 
                onClick={onClose}
                className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-slate-700 active:scale-95"
              >
                Close
              </button>
            </div>
          )}

          {!isChecking && error && (
            <div className="flex flex-col items-center py-4 text-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-100 mb-1">Blockchain Error</h3>
              <p className="text-xs text-amber-400/80 mb-6">{error}</p>
              <button 
                onClick={onClose}
                className="w-full rounded-xl bg-slate-800 py-3 text-sm font-bold text-slate-200 transition-all hover:bg-slate-700 active:scale-95"
              >
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default ViewDocumentModal;
