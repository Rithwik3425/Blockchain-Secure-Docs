import React, { useState } from "react";
import { ethers } from "ethers";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "../blockchain/config";

/**
 * ShareModal.jsx
 * 
 * Phase 8 — Access Control UI
 * 
 * Bridges the UI to the DocumentRegistry smart contract for granting and revoking access.
 */
const ShareModal = ({ isOpen, onClose, document, onShared }) => {
  const [activeTab, setActiveTab] = useState("grant"); // "grant" | "revoke"
  const [recipient, setRecipient] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error'|'info', msg: string }

  const handleAction = async (e) => {
    e.preventDefault();
    if (!recipient || !document) return;

    setIsProcessing(true);
    setStatus({ type: "info", msg: "Requesting signature..." });

    try {
      if (!window.ethereum) throw new Error("MetaMask not found");

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        REGISTRY_ADDRESS, 
        REGISTRY_ABI, 
        signer
      );

      setStatus({ type: "info", msg: "Transacting on-chain..." });

      // Phase 8: Use documentHash as the stable on-chain ID
      const docId = document.documentHash;
      if (!docId) throw new Error("Document is missing on-chain fingerprint");

      let tx;
      if (activeTab === "grant") {
        tx = await contract.grantAccess(docId, recipient);
      } else {
        tx = await contract.revokeAccess(docId, recipient);
      }
      
      setStatus({ type: "info", msg: "Waiting for confirmation..." });
      
      await tx.wait();

      setStatus({ 
        type: "success", 
        msg: activeTab === "grant" ? "Access granted successfully!" : "Access revoked successfully!" 
      });
      onShared && onShared(recipient);
      
      // Close after delay
      setTimeout(() => {
        setStatus(null);
        setRecipient("");
        onClose();
      }, 2000);
    } catch (err) {
      console.error("[share-modal] error:", err);
      // Catch metamask rejection
      if (err.code === "ACTION_REJECTED" || err.code === 4001) {
        setStatus({ type: "error", msg: "Transaction rejected in MetaMask" });
      } else {
        setStatus({ 
          type: "error", 
          msg: err.reason || err.message || "Transaction failed" 
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm bg-slate-950/60">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <h3 className="text-xl font-bold text-slate-100">Manage Access</h3>
            <button onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-800 hover:text-slate-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          <div className="mb-6 rounded-xl bg-slate-950/50 p-4 border border-slate-800/50">
            <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Document</p>
            <p className="text-sm text-slate-300 truncate mt-1">{document?.name}</p>
          </div>

          <div className="flex bg-slate-800 p-1 rounded-xl items-center mb-6">
            <button
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'grant' ? 'bg-slate-700 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              onClick={() => { setActiveTab('grant'); setStatus(null); }}
            >
              Grant Access
            </button>
            <button
              type="button"
              className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-all ${activeTab === 'revoke' ? 'bg-slate-700 text-slate-100 shadow-sm' : 'text-slate-400 hover:text-slate-300'}`}
              onClick={() => { setActiveTab('revoke'); setStatus(null); }}
            >
              Revoke Access
            </button>
          </div>

          <form onSubmit={handleAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                User Wallet Address
              </label>
              <input
                type="text"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                placeholder="0x..."
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            {status && (
              <div className={`rounded-xl p-3 text-xs border ${
                status.type === 'error' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                status.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                'bg-primary-500/10 text-primary-400 border-primary-500/20'
              }`}>
                {status.msg}
              </div>
            )}

            <button
              type="submit"
              disabled={isProcessing || !recipient}
              className={`w-full rounded-xl py-3 text-sm font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shadow-lg ${
                activeTab === "grant" ? "bg-primary-600 hover:bg-primary-500 shadow-primary-900/20" : "bg-red-600 hover:bg-red-500 shadow-red-900/20"
              }`}
            >
              {isProcessing ? "Processing..." : activeTab === "grant" ? "Grant On-Chain Access" : "Revoke On-Chain Access"}
            </button>
          </form>
        </div>
        
        <div className="bg-slate-950/40 p-4 border-t border-slate-800">
          <p className="text-[10px] text-center text-slate-600 leading-relaxed">
            Changing permissions triggers an ETH transaction that anchors the recipient's access list update to the blockchain.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
