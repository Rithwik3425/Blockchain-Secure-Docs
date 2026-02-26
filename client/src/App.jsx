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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-primary-500/30">
      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                           */}
        {/* ---------------------------------------------------------------- */}
        <header className="flex w-full flex-wrap items-center justify-between gap-y-3 rounded-2xl border border-slate-800/80 bg-slate-950/80 px-4 py-3 shadow-[0_0_20px_rgba(0,0,0,0.4)] backdrop-blur-md sm:flex-nowrap">
          {/* Logo + wordmark */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary-500/10 ring-1 ring-primary-500/50 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <div className="h-4 w-4 rounded-md bg-primary-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-primary-200 sm:text-[0.7rem]">
                Blockchain Secure Docs
              </span>
              <span className="hidden text-xs text-slate-400 sm:block">
                Decentralized document management
              </span>
            </div>
          </div>

          {/* Right side — wallet */}
          <div className="flex items-center gap-4 text-[0.7rem] text-slate-400">

            {/* Wallet control — badge when connected, button otherwise */}
            {isConnected ? (
              <WalletBadge />
            ) : (
              <button
                type="button"
                id="header-connect-btn"
                onClick={openModal}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-primary-500/40 bg-slate-900/50 px-4 py-2 text-[0.75rem] font-semibold tracking-wide text-primary-100 shadow-[0_0_15px_rgba(34,211,238,0.1)] backdrop-blur-sm transition-all duration-300 hover:border-primary-400/80 hover:bg-primary-500/10 hover:shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:-translate-y-0.5"
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
              <section className="mx-auto flex max-w-4xl flex-col items-center px-4 py-12 text-center sm:py-16 md:py-24">
                {/* Badge */}
                <div className="mb-8 inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary-500/20 bg-primary-500/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-primary-300 shadow-[0_0_15px_rgba(34,211,238,0.15)] backdrop-blur-sm">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
                  </span>
                  Wallet identity · IPFS storage · On-chain access
                </div>

                <h1 className="mb-6 animate-slide-up text-4xl font-extrabold tracking-tight text-slate-100 sm:text-5xl md:text-7xl">
                  Secure documents <br className="hidden sm:block" />
                  <span className="bg-linear-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent">
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
                <div className="flex w-full animate-slide-up flex-col justify-center gap-4 sm:w-auto sm:flex-row">
                  <button
                    type="button"
                    onClick={openModal}
                    className="flex min-h-[48px] w-full items-center justify-center rounded-full bg-slate-100 px-8 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(255,255,255,0.1)] transition-all duration-300 hover:-translate-y-1 hover:bg-white hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] sm:w-auto"
                  >
                    Connect Wallet
                  </button>
                  <button
                    type="button"
                    className="flex min-h-[48px] w-full items-center justify-center rounded-full border border-slate-700 bg-slate-900/50 px-8 py-3 text-sm font-bold text-slate-300 backdrop-blur-sm transition-all duration-300 hover:border-slate-500 hover:bg-slate-800 sm:w-auto"
                  >
                    Learn More
                  </button>
                </div>
              </section>

              {/* Feature Grid */}
              <section className="grid grid-cols-1 gap-6 py-12 md:grid-cols-3">
                <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-primary-500/40 hover:bg-slate-900/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] hover:-translate-y-1">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary-500/10 px-3 py-1 text-xs font-bold tracking-wider text-primary-400 uppercase shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500"></span>
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

                <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-primary-500/40 hover:bg-slate-900/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] hover:-translate-y-1">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary-500/10 px-3 py-1 text-xs font-bold tracking-wider text-primary-400 uppercase shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500"></span>
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

                <div className="group rounded-2xl border border-slate-800/80 bg-slate-900/40 p-8 shadow-lg backdrop-blur-sm transition-all duration-300 hover:border-primary-500/40 hover:bg-slate-900/60 hover:shadow-[0_0_30px_rgba(34,211,238,0.1)] hover:-translate-y-1">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-lg bg-primary-500/10 px-3 py-1 text-xs font-bold tracking-wider text-primary-400 uppercase shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary-500"></span>
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
