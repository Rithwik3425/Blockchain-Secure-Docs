/**
 * WalletModal.jsx
 *
 * Phase 3 — Wallet Authentication
 *
 * A full-screen overlay modal that guides the user through the MetaMask
 * connection + sign-in challenge flow.
 *
 * States handled:
 *   disconnected        → idle / "Connect with MetaMask" CTA
 *   connecting          → spinner, "Awaiting MetaMask approval"
 *   signing             → spinner, "Sign the challenge message"
 *   unsupported_network → warning + switch-network instructions
 *   error               → error card + retry button
 *   connected           → brief success confirmation (parent closes modal)
 */

import React, { useEffect } from "react";
import { useWallet } from "./wallet";

// ---------------------------------------------------------------------------
// Icons (inline SVG to keep deps minimal)
// ---------------------------------------------------------------------------

const MetaMaskIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="h-10 w-10" aria-hidden="true">
    <path
      d="M36.2 3L22.1 13.3l2.6-6.1L36.2 3z"
      fill="#E17726"
      stroke="#E17726"
      strokeWidth="0.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M3.8 3l14 10.4-2.5-6.2L3.8 3zm26.8 23.8l-3.8 5.8 8.1 2.2 2.3-7.9-6.6-.1zm-29.7.1L3.2 34.8l8.1-2.2-3.8-5.8-6.6.1z"
      fill="#E27625"
      stroke="#E27625"
      strokeWidth="0.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11 17.8l-2.2 3.4 7.9.4-.3-8.5L11 17.8zm18 0l-5.5-4.8-.3 8.6 7.9-.4L29 17.8zM11.3 32.6l4.8-2.3-4.1-3.2-.7 5.5zm12.6-2.3l4.8 2.3-.7-5.5-4.1 3.2z"
      fill="#E27625"
      stroke="#E27625"
      strokeWidth="0.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M23.9 30.3l-4.8-2.3.4 3.1-.0.4 4.4-1.2zm-7.8 0l4.4 1.2v-.4l.4-3.1-4.8 2.3z"
      fill="#D5BFB2"
      stroke="#D5BFB2"
      strokeWidth="0.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M16.2 24.5l-4-1.2 2.8-1.3 1.2 2.5zm7.6 0l1.2-2.5 2.8 1.3-4 1.2z"
      fill="#233447"
      stroke="#233447"
      strokeWidth="0.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M11.3 32.6l.7-5.8-4.5.1 3.8 5.7zm16.7-5.8l.7 5.8 3.8-5.7-4.5-.1zm3.8-9.6l-7.9.4.7 4.1 1.2-2.5 2.8 1.3 3.2-3.3zm-22.5 3.3l2.8-1.3 1.2 2.5.7-4.1-7.9-.4 3.2 3.3z"
      fill="#CC6228"
      stroke="#CC6228"
      strokeWidth="0.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.8 21.2l3.3 6.4-.1-3.2-3.2-3.2zm19.2 3.2l-.1 3.2 3.3-6.4-3.2 3.2zm-11.3-.8l-.7-4.1-1.7 8.2 2.4-4.1zm5.2 0l2.4 4.1-1.7-8.2-.7 4.1z"
      fill="#E27525"
      stroke="#E27525"
      strokeWidth="0.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M23.9 30.3l-4.4 1.2.4 3.3h-.1l4.5-1.3-.4-3.2zm-7.7 0l-.4 3.2 4.5 1.3-.1-3.3-4-1.2z"
      fill="#F5841F"
      stroke="#F5841F"
      strokeWidth="0.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const SpinnerIcon = () => (
  <svg
    className="h-8 w-8 animate-spin text-primary-400"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const CheckIcon = () => (
  <svg
    className="h-10 w-10 text-emerald-400"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

// ---------------------------------------------------------------------------
// Sub-panels
// ---------------------------------------------------------------------------

/** Step indicator dots at the top of the modal */
const StepDots = ({ current }) => {
  const steps = ["connect", "sign", "done"];
  return (
    <div className="flex items-center justify-center gap-2 mb-6" aria-hidden="true">
      {steps.map((s, i) => (
        <span
          key={s}
          className={`h-1.5 rounded-full transition-all duration-300 ${
            current === i
              ? "w-6 bg-primary-400"
              : current > i
              ? "w-3 bg-emerald-400"
              : "w-3 bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
};

/** Idle panel — shown when status is  "disconnected" or "error" (before retry) */
const IdlePanel = ({ onConnect, isMetaMask }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <StepDots current={0} />

    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-primary-500/30 bg-slate-900/60 shadow-[0_0_20px_rgba(34,211,238,0.15)] backdrop-blur-sm">
      <MetaMaskIcon />
    </div>

    <div className="space-y-2">
      <h2 className="text-xl font-bold tracking-tight text-slate-100">Connect your wallet</h2>
      <p className="max-w-xs text-[0.85rem] leading-relaxed text-slate-400">
        Your wallet address is your identity — no passwords, no sign-up. You
        will be asked to sign a message to prove ownership.
      </p>
    </div>

    {!isMetaMask && (
      <div className="w-full rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[0.75rem] text-amber-300">
        MetaMask not detected. Install the{" "}
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-amber-200"
        >
          MetaMask extension
        </a>{" "}
        and refresh the page.
      </div>
    )}

    <button
      type="button"
      id="wallet-modal-connect-btn"
      onClick={onConnect}
      disabled={!isMetaMask}
      className="w-full min-h-[48px] rounded-xl bg-primary-500 px-5 py-3 text-sm font-bold tracking-wide text-slate-100 shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all duration-300 hover:-translate-y-1 hover:bg-primary-400 hover:shadow-[0_0_30px_rgba(34,211,238,0.4)] disabled:cursor-not-allowed disabled:opacity-40 disabled:translate-y-0 disabled:shadow-none"
    >
      Connect with MetaMask
    </button>

    <p className="text-[0.7rem] text-slate-500">
      By connecting you agree that this app reads your public address only.
    </p>
  </div>
);

/** Connecting / Signing spinner panel */
const LoadingPanel = ({ status }) => {
  const isSigning = status === "signing";
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <StepDots current={isSigning ? 1 : 0} />

      <SpinnerIcon />

      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-slate-100">
          {isSigning ? "Sign to verify ownership" : "Awaiting approval…"}
        </h2>
        <p className="max-w-xs text-[0.8rem] leading-relaxed text-slate-400">
          {isSigning
            ? "Check MetaMask — sign the message to prove you control this wallet. No gas is spent."
            : "MetaMask is requesting permission. Approve in the extension popup."}
        </p>
      </div>

      <div className="w-full rounded-xl border border-slate-800/80 bg-slate-900/60 px-4 py-3 text-left text-[0.7rem] text-slate-400">
        {isSigning ? (
          <>
            <span className="block font-medium text-primary-300 mb-1">What you are signing</span>
            <span>A short human-readable challenge unique to your address. It cannot be used to move funds or execute transactions.</span>
          </>
        ) : (
          <>
            <span className="block font-medium text-primary-300 mb-1">Why MetaMask opened</span>
            <span>
              The app is requesting access to your wallet address — the first step before
              authentication.
            </span>
          </>
        )}
      </div>
    </div>
  );
};

/** Unsupported network warning panel */
const UnsupportedNetworkPanel = ({ onDisconnect }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <StepDots current={1} />

    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
      <span className="text-3xl">⚠️</span>
    </div>

    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-amber-300">Unsupported network</h2>
      <p className="max-w-xs text-[0.8rem] leading-relaxed text-slate-400">
        This app currently supports <strong className="text-slate-200">Local Hardhat</strong> and{" "}
        <strong className="text-slate-200">Polygon Amoy</strong>. Switch networks in MetaMask to continue.
      </p>
    </div>

    <div className="w-full space-y-2 text-left text-[0.75rem] text-slate-300">
      <p className="font-medium text-slate-200">How to switch:</p>
      <ol className="list-decimal pl-4 space-y-1 text-slate-400">
        <li>Open the MetaMask extension.</li>
        <li>Click the network selector at the top.</li>
        <li>Choose <span className="text-slate-200">Local Hardhat (31337)</span> or <span className="text-slate-200">Polygon Amoy</span>.</li>
        <li>The page will reload automatically.</li>
      </ol>
    </div>

    <button
      type="button"
      onClick={onDisconnect}
      className="w-full rounded-xl border border-slate-700/80 bg-slate-900/80 px-5 py-2.5 text-sm font-medium text-slate-200 transition-colors hover:border-rose-500/50 hover:text-rose-300"
    >
      Disconnect
    </button>
  </div>
);

/** Error panel */
const ErrorPanel = ({ message, onRetry }) => (
  <div className="flex flex-col items-center gap-6 text-center">
    <StepDots current={0} />

    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/10">
      <span className="text-3xl">✕</span>
    </div>

    <div className="space-y-2">
      <h2 className="text-lg font-semibold text-rose-300">Connection failed</h2>
      <p className="max-w-xs text-[0.8rem] leading-relaxed text-slate-400">
        {message ?? "Something went wrong. Please try again."}
      </p>
    </div>

    <button
      type="button"
      id="wallet-modal-retry-btn"
      onClick={onRetry}
      className="w-full rounded-xl bg-primary-500 px-5 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-primary-900/50 transition-all duration-200 hover:bg-primary-400 hover:-translate-y-0.5"
    >
      Try again
    </button>
  </div>
);

/** Success confirmation panel — auto-closes via parent */
const SuccessPanel = () => (
  <div className="flex flex-col items-center gap-6 text-center">
    <StepDots current={2} />

    <CheckIcon />

    <div className="space-y-1.5">
      <h2 className="text-lg font-semibold text-emerald-300">Wallet connected!</h2>
      <p className="max-w-xs text-[0.8rem] leading-relaxed text-slate-400">
        Your wallet has been verified. Redirecting you to the dashboard…
      </p>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

/**
 * WalletModal
 *
 * Props:
 *   isOpen   — controls visibility
 *   onClose  — called when user clicks the backdrop or the × button
 */
const WalletModal = ({ isOpen, onClose }) => {
  const { status, errorMessage, connect, disconnect } = useWallet();
  const isMetaMask =
    typeof window !== "undefined" && !!(/** @type {any} */ (window).ethereum);

  // Auto-close after success
  useEffect(() => {
    if (status === "connected") {
      const timer = setTimeout(onClose, 1500);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleRetry = () => connect();

  const handleDisconnectAndClose = () => {
    disconnect();
    onClose();
  };

  const renderBody = () => {
    switch (status) {
      case "connecting":
      case "signing":
        return <LoadingPanel status={status} />;
      case "unsupported_network":
        return <UnsupportedNetworkPanel onDisconnect={handleDisconnectAndClose} />;
      case "error":
        return <ErrorPanel message={errorMessage} onRetry={handleRetry} />;
      case "connected":
        return <SuccessPanel />;
      default:
        // disconnected — also show idle if there was a rejected request
        return (
          <IdlePanel
            onConnect={connect}
            isMetaMask={isMetaMask}
          />
        );
    }
  };

  // Determine whether the modal can be dismissed by the user.
  // During an active flow (connecting/signing) we block dismiss to prevent orphaned state.
  const dismissible = status !== "connecting" && status !== "signing";

  return (
    /* Backdrop */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Connect wallet"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Blurred dark overlay */}
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
        onClick={dismissible ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl border border-slate-700/60 bg-slate-900/70 p-8 shadow-[0_0_50px_rgba(0,0,0,0.6)] backdrop-blur-xl animate-fade-in">
        {/* Close button */}
        {dismissible && (
          <button
            type="button"
            id="wallet-modal-close-btn"
            onClick={onClose}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full border border-slate-700/60 bg-slate-800/50 text-slate-400 transition-all duration-300 hover:rotate-90 hover:border-slate-500 hover:text-slate-100 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] focus:outline-none"
            aria-label="Close modal"
          >
            ✕
          </button>
        )}

        {renderBody()}
      </div>
    </div>
  );
};

export default WalletModal;
