/**
 * WalletBadge.jsx
 *
 * Phase 3 — Wallet Authentication
 *
 * Compact header component shown when status === "connected".
 * Displays:
 *   - ENS name (if available) or truncated wallet address
 *   - Network pill (green = supported, amber = unsupported)
 *   - ETH balance
 *   - Click → dropdown with "Copy address" and "Disconnect"
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "./wallet";

// ---------------------------------------------------------------------------
// Helper — truncate address
// ---------------------------------------------------------------------------
const truncateAddress = (addr) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

// ---------------------------------------------------------------------------
// NetworkPill
// ---------------------------------------------------------------------------
const NetworkPill = ({ network, status }) => {
  const isUnsupported = status === "unsupported_network";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-medium ${
        isUnsupported
          ? "border border-amber-500/40 bg-amber-500/10 text-amber-300"
          : "border border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isUnsupported ? "bg-amber-400" : "bg-emerald-400"
        }`}
      />
      {network?.label ?? (isUnsupported ? "Wrong network" : "Unknown")}
    </span>
  );
};

// ---------------------------------------------------------------------------
// CopyIcon / CheckIcon (inline SVG)
// ---------------------------------------------------------------------------
const CopyIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
);

const SmallCheckIcon = () => (
  <svg
    className="h-3.5 w-3.5 text-emerald-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const SignOutIcon = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// WalletBadge
// ---------------------------------------------------------------------------
const WalletBadge = () => {
  const { address, status, network, balance, ensName, disconnect } =
    useWallet();

  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef(null);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  const handleCopy = useCallback(() => {
    if (!address) return;
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }, [address]);

  const handleDisconnect = useCallback(() => {
    setOpen(false);
    disconnect();
  }, [disconnect]);

  if (!address) return null;

  const displayName = ensName ?? truncateAddress(address);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Badge button */}
      <button
        type="button"
        id="wallet-badge-btn"
        onClick={() => setOpen((o) => !o)}
        className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-primary-500/40 bg-slate-900/80 px-4 py-2 text-[0.75rem] font-semibold tracking-wide text-primary-100 shadow-[0_0_15px_rgba(34,211,238,0.1)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-400/80 hover:bg-primary-500/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)]"
        aria-haspopup="true"
        aria-expanded={open}
      >
        {/* Status dot */}
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === "connected" ? "bg-emerald-400" : "bg-amber-400"
          }`}
        />

        {/* Label */}
        <span>{displayName}</span>

        {/* Balance */}
        {balance && (
          <>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">{balance} ETH</span>
          </>
        )}

        {/* Network pill */}
        <NetworkPill network={network} status={status} />

        {/* Chevron */}
        <svg
          className={`h-3 w-3 text-slate-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-40 mt-3 w-64 rounded-2xl border border-slate-700/60 bg-slate-900/90 py-2 shadow-[0_0_30px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fade-in"
        >
          {/* Address display */}
          <div className="border-b border-slate-700/50 px-5 py-3">
            <p className="text-[0.65rem] text-slate-500">Connected as</p>
            <p className="mt-0.5 break-all font-mono text-[0.7rem] text-slate-200">
              {address}
            </p>
          </div>

          {/* Copy */}
          <button
            type="button"
            role="menuitem"
            id="wallet-badge-copy-btn"
            onClick={handleCopy}
            className="flex w-full items-center gap-3 px-5 py-3 text-[0.8rem] font-medium text-slate-300 transition-colors hover:bg-slate-800/60 hover:text-slate-100 focus:bg-slate-800/60"
          >
            {copied ? <SmallCheckIcon /> : <CopyIcon />}
            {copied ? "Address copied!" : "Copy address"}
          </button>

          {/* Disconnect */}
          <button
            type="button"
            role="menuitem"
            id="wallet-badge-disconnect-btn"
            onClick={handleDisconnect}
            className="flex w-full items-center gap-3 px-5 py-3 text-[0.8rem] font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300 focus:bg-rose-500/10"
          >
            <SignOutIcon />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
};

export default WalletBadge;
