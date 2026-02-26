/**
 * App.jsx
 *
 * Phase 7 — IPFS Storage & Upload Dashboard
 *
 * The root UI shell. Integrates:
 *   - WalletBadge (header, shown when connected)
 *   - WalletModal (overlay, shown when user initiates connection)
 *   - Conditional rendering between Landing Page and Dashboard
 */

import React, { useState, useCallback } from "react";
import { useWallet } from "./wallet";
import WalletModal from "./WalletModal";
import WalletBadge from "./WalletBadge";
import Dashboard from "./components/Dashboard";

export const App = () => {
  const { status, address } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const isConnected = status === "connected";

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-black text-slate-100">
      {/* Background glow */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.12),_transparent_60%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <header className="flex items-center justify-between rounded-2xl border border-slate-800/80 bg-slate-950/90 px-4 py-3 shadow-lg shadow-black/40 backdrop-blur">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-500/15 ring-1 ring-primary-500/50">
              <div className="h-4 w-4 rounded-md bg-primary-400 shadow-[0_0_14px_rgba(34,211,238,0.7)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-primary-200">
                Blockchain Secure Docs
              </span>
              <span className="text-xs text-slate-400">
                Decentralized document management
              </span>
            </div>
          </div>

          {/* Right side — phase indicator + wallet */}
          <div className="flex items-center gap-4 text-[0.7rem] text-slate-400">
            {/* Phase progress indicator */}
            <div className="hidden items-center gap-3 sm:flex">
                <span className="text-slate-400">Phase 7 · Storage & Dashboard</span>
                <span className="h-1 w-16 rounded-full bg-slate-800">
                    <span className="block h-1 w-14 rounded-full bg-primary-400" />
                </span>
            </div>

            {/* Wallet control — badge when connected, button otherwise */}
            {isConnected ? (
              <WalletBadge />
            ) : (
              <button
                type="button"
                id="header-connect-btn"
                onClick={openModal}
                className="inline-flex items-center gap-2 rounded-full border border-primary-500/60 bg-slate-950/80 px-3 py-1.5 text-[0.7rem] font-medium text-primary-100 shadow-sm shadow-black/40 transition-colors hover:bg-primary-500/10"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    status === "unsupported_network"
                      ? "bg-amber-400"
                      : "bg-slate-500"
                  }`}
                />
                Connect wallet
              </button>
            )}
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Main Content                                                     */}
        {/* ---------------------------------------------------------------- */}
        <main className="relative z-10 pt-20">
          {isConnected ? (
            <Dashboard />
          ) : (
            <>
              {/* Hero Section */}
              <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center md:py-24">
                {/* Badge */}
                <div className="mb-8 inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/5 px-4 py-1.5 text-xs font-medium text-primary-400">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                  </span>
                  Wallet identity · IPFS storage · On-chain access
                </div>

                {/* Title */}
                <h1 className="mb-6 animate-slide-up text-5xl font-extrabold tracking-tight text-slate-100 md:text-7xl">
                  Secure documents <br />
                  <span className="bg-gradient-to-r from-primary-400 via-primary-500 to-primary-300 bg-clip-text text-transparent opacity-60">
                    without trusting a server.
                  </span>
                </h1>

                {/* Description */}
                <p className="mb-10 max-w-2xl animate-slide-up text-lg text-slate-400 md:text-xl">
                  A decentralized document platform that anchors ownership, access
                  control, and version history to the blockchain, while IPFS
                  delivers resilient, content-addressed storage.
                </p>

                {/* CTA Buttons */}
                <div className="flex animate-slide-up justify-center gap-4">
                  <button
                    type="button"
                    onClick={openModal}
                    className="rounded-full bg-slate-100 px-8 py-3 text-sm font-bold text-slate-950 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-lg hover:shadow-primary-500/20"
                  >
                    Connect Wallet
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-slate-800 bg-slate-900/50 px-8 py-3 text-sm font-bold text-slate-300 transition-all duration-200 hover:border-slate-700 hover:bg-slate-900"
                  >
                    Learn More
                  </button>
                </div>
              </section>

              {/* Feature Grid */}
              <section className="grid gap-6 py-12 md:grid-cols-3">
                <div className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-8 transition-all hover:border-primary-500/30 hover:bg-slate-900/60">
                  <div className="mb-4 inline-flex rounded-lg bg-primary-500/10 px-3 py-1 text-xs font-bold tracking-wider text-primary-400 uppercase">
                    On-chain Identity
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-slate-100">
                    Cryptographic Ownership
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Bind every document to a wallet address for undeniable proof
                    of authorship and control.
                  </p>
                </div>

                <div className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-8 transition-all hover:border-primary-500/30 hover:bg-slate-900/60">
                  <div className="mb-4 inline-flex rounded-lg bg-primary-500/10 px-3 py-1 text-xs font-bold tracking-wider text-primary-400 uppercase">
                    Version Tracking
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-slate-100">
                    Tamper-Proof History
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Detect every mutation through immutable versioning anchored
                    to the blockchain.
                  </p>
                </div>

                <div className="group rounded-2xl border border-slate-800 bg-slate-900/40 p-8 transition-all hover:border-primary-500/30 hover:bg-slate-900/60">
                  <div className="mb-4 inline-flex rounded-lg bg-primary-500/10 px-3 py-1 text-xs font-bold tracking-wider text-primary-400 uppercase">
                    Access Control
                  </div>
                  <h3 className="mb-3 text-xl font-bold text-slate-100">
                    Programmable Access
                  </h3>
                  <p className="text-sm leading-relaxed text-slate-400">
                    Grant, revoke, and audit access via transparent
                    smart-contract permissions.
                  </p>
                </div>
              </section>
            </>
          )}
        </main>

        <footer className="mt-auto border-t border-slate-900/80 pt-8 text-center text-xs text-slate-600">
          <p>© 2026 Blockchain Secure Docs · Built with Ethers.js, IPFS & React</p>
        </footer>
      </div>

      <WalletModal isOpen={modalOpen} onClose={closeModal} />
    </div>
  );
};
