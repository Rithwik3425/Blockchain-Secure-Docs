/**
 * hooks/useDocuments.ts
 *
 * Phase 7 — Event-sourced document list.
 *
 * Source-of-truth hierarchy:
 *   1. Contract events  → proves existence & ownership on-chain
 *   2. Backend index    → provides metadata (name, size, mimeType, versions)
 *
 * Algorithm:
 *   a) Query DocumentRegistered events filtered by owner address
 *   b) Fetch backend document index for enrichment
 *   c) Merge: on-chain docs enriched with metadata, pending docs shown separately
 */

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { REGISTRY_ADDRESS, REGISTRY_ABI } from "../blockchain/config";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export interface DocumentRecord {
  // On-chain fields
  documentHash: string;   // bytes32 hex — primary key
  cid: string;            // IPFS CID
  registeredOnChain: boolean;
  txHash?: string;
  blockNumber?: number;

  // Backend metadata (enrichment layer)
  _id?: string;
  name?: string;
  mimeType?: string;
  size?: number;
  currentVersion?: number;
  versions?: Array<{ version: number; ipfsHash: string; size: number; createdAt: string }>;
  createdAt?: string;
  owner?: string;
}

interface UseDocumentsResult {
  documents: DocumentRecord[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useDocuments(
  address: string | null,
  signature: string | null,
  searchQuery = "",
  sortBy = "date"
): UseDocumentsResult {
  const [documents, setDocuments]   = useState<DocumentRecord[]>([]);
  const [isLoading, setIsLoading]   = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [tick, setTick]             = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!address || !signature) {
      setDocuments([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // ── A) Fetch backend index (metadata enrichment) ──────────────────
        const params = new URLSearchParams();
        if (searchQuery) params.set("search", searchQuery);
        if (sortBy !== "date") params.set("sort", sortBy);

        const [backendRes] = await Promise.all([
          fetch(`${API_BASE}/api/documents/my?${params}`, {
            headers: {
              "x-wallet-address": address,
              "x-wallet-signature": signature,
            },
          }),
        ]);

        const backendData = await backendRes.json();
        if (!backendData.success) throw new Error(backendData.error ?? "Failed to fetch documents");

        const backendDocs: any[] = backendData.documents ?? [];

        // ── B) Query on-chain events ───────────────────────────────────────
        let onChainHashes = new Set<string>();
        try {
          const provider = new ethers.BrowserProvider(window.ethereum);
          const contract = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

          // Filter: DocumentRegistered(any documentHash, THIS owner, any cid)
          const filter = contract.filters.DocumentRegistered(null, address);
          const events = await contract.queryFilter(filter, -50000); // last 50k blocks

          events.forEach((e: any) => {
            onChainHashes.add(e.args.documentHash);
          });
        } catch (rpcErr) {
          // RPC might timeout on large ranges — fall back to backend registeredOnChain field
          console.warn("[useDocuments] event query failed, using backend state:", rpcErr);
          backendDocs.forEach((d) => {
            if (d.registeredOnChain && d.documentHash) {
              onChainHashes.add(d.documentHash);
            }
          });
        }

        // ── C) Merge ──────────────────────────────────────────────────────
        const merged: DocumentRecord[] = backendDocs.map((doc) => ({
          documentHash:      doc.documentHash ?? null,
          cid:               doc.ipfsHash ?? "",
          registeredOnChain: doc.documentHash ? onChainHashes.has(doc.documentHash) : false,
          txHash:            doc.txHash,
          _id:               doc._id,
          name:              doc.name,
          mimeType:          doc.mimeType,
          size:              doc.size,
          currentVersion:    doc.currentVersion,
          versions:          doc.versions,
          createdAt:         doc.createdAt,
          owner:             doc.owner,
        }));

        if (!cancelled) setDocuments(merged);
      } catch (err: any) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [address, signature, searchQuery, sortBy, tick]);

  return { documents, isLoading, error, refresh };
}
