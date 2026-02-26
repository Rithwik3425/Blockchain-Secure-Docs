#!/usr/bin/env bash
# =============================================================================
#  start.sh — Blockchain Secure Docs  —  Full stack launcher (Amoy testnet)
# =============================================================================
#  Starts 3 services: IPFS daemon, Backend API, and Frontend Vite dev server.
#  The blockchain node is now Polygon Amoy (no local Hardhat node needed).
#
#  Usage:
#    chmod +x start.sh   (first time only)
#    ./start.sh
#
#  To stop everything:
#    ./start.sh stop
# =============================================================================

set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
LOGS="$ROOT/logs"
mkdir -p "$LOGS"

# ── Colours ─────────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[info]${RESET}  $*"; }
success() { echo -e "${GREEN}[ok]${RESET}    $*"; }
warn()    { echo -e "${YELLOW}[warn]${RESET}  $*"; }
err()     { echo -e "${RED}[error]${RESET} $*"; }

# ── Stop mode ───────────────────────────────────────────────────────────────
if [[ "${1:-}" == "stop" ]]; then
  echo -e "${BOLD}Stopping all services…${RESET}"
  for port in 5001 4000 5173; do
    if fuser "$port/tcp" &>/dev/null 2>&1; then
      fuser -k "$port/tcp" 2>/dev/null && echo "  killed :$port"
    fi
  done
  pkill -f "ipfs daemon" 2>/dev/null && echo "  killed ipfs daemon" || true
  echo -e "${GREEN}All services stopped.${RESET}"
  exit 0
fi

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}║   Blockchain Secure Docs — Startup      ║${RESET}"
echo -e "${BOLD}║   Network: Polygon Amoy Testnet         ║${RESET}"
echo -e "${BOLD}╚══════════════════════════════════════════╝${RESET}"
echo ""

# ── Helper: wait for a port to become active ────────────────────────────────
wait_for_port() {
  local port=$1 label=$2 timeout=${3:-20}
  for i in $(seq 1 "$timeout"); do
    if lsof -i ":$port" -sTCP:LISTEN -t &>/dev/null; then
      success "$label is up on :$port"
      return 0
    fi
    sleep 1
  done
  err "$label did NOT start within ${timeout}s — check $LOGS/$label.log"
  return 1
}

# ── 1. IPFS daemon ──────────────────────────────────────────────────────────
info "Starting IPFS daemon…"
if lsof -i :5001 -sTCP:LISTEN -t &>/dev/null; then
  warn "IPFS already running on :5001, skipping."
else
  if [[ ! -d "$HOME/.ipfs" ]]; then
    info "Initializing IPFS repo…"
    ipfs init >> "$LOGS/ipfs.log" 2>&1
    ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["*"]' >> "$LOGS/ipfs.log" 2>&1
    ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT","POST","GET"]' >> "$LOGS/ipfs.log" 2>&1
  fi
  nohup ipfs daemon >> "$LOGS/ipfs.log" 2>&1 &
  wait_for_port 5001 "ipfs" 20
fi

# ── 2. Backend server ────────────────────────────────────────────────────────
info "Starting backend API server…"
if lsof -i :4000 -sTCP:LISTEN -t &>/dev/null; then
  warn "Backend already on :4000 — restarting it."
  fuser -k 4000/tcp 2>/dev/null || true
  sleep 1
fi
nohup bash -c "cd '$ROOT/server' && node src/index.js" >> "$LOGS/server.log" 2>&1 &
wait_for_port 4000 "backend" 15

# ── 3. Frontend Vite dev server ──────────────────────────────────────────────
info "Starting frontend (Vite)…"
if lsof -i :5173 -sTCP:LISTEN -t &>/dev/null; then
  warn "Frontend already on :5173, skipping."
else
  nohup bash -c "cd '$ROOT/client' && npm run dev" >> "$LOGS/client.log" 2>&1 &
  wait_for_port 5173 "frontend" 20
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  All services are running!${RESET}"
echo -e "${BOLD}══════════════════════════════════════════${RESET}"
echo ""
echo -e "  ${CYAN}Frontend   ${RESET}→  http://localhost:5173"
echo -e "  ${CYAN}Backend    ${RESET}→  http://localhost:4000"
echo -e "  ${CYAN}IPFS API   ${RESET}→  http://localhost:5001"
echo -e "  ${CYAN}Blockchain ${RESET}→  Polygon Amoy Testnet (chain 80002)"
echo ""
echo -e "  ${YELLOW}MetaMask:${RESET} Connect to Polygon Amoy"
echo -e "            RPC: https://rpc-amoy.polygon.technology"
echo -e "            Chain ID: 80002"
echo ""
echo -e "  Logs → $LOGS/"
echo ""
echo -e "  ${YELLOW}To stop:${RESET}  ./start.sh stop"
echo ""
echo -e "  ${YELLOW}To deploy contract to Amoy:${RESET}"
echo -e "    cd blockchain && npx hardhat run scripts/deploy.js --network amoy"
echo ""
