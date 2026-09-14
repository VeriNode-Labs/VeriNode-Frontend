"use client";

import { Fingerprint, Sparkles, Wallet } from "lucide-react";
import { useWallet } from "@/hooks/useWallet";

export function Navbar() {
  const { address, shortAddress, status, loading, installed, error, connect, disconnect } =
    useWallet();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-lumina-500/20 text-lumina-300">
            <Sparkles className="h-5 w-5" aria-hidden />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-white">Lumina</span>
            <span className="text-[11px] text-zinc-400">Bias-free IP &amp; milestone portal</span>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-pink-400/30 bg-pink-500/10 px-2.5 py-1 text-[11px] font-medium text-pink-300">
            SDG 5 Initiative
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300">
            <Fingerprint className="h-3 w-3" aria-hidden />
            SHA-256 anchored on Stellar
          </span>
        </div>

        <div className="flex items-center gap-2">
          {!installed && (
            <span className="hidden text-xs text-amber-300 md:inline">
              Freighter not detected
            </span>
          )}
          {status === "connected" && address ? (
            <button
              type="button"
              onClick={() => void disconnect()}
              title={address}
              className="inline-flex items-center gap-2 rounded-lg border border-lumina-500/40 bg-lumina-500/10 px-3 py-1.5 text-sm text-lumina-200 transition hover:bg-lumina-500/20"
            >
              <Wallet className="h-4 w-4" aria-hidden />
              {shortAddress}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void connect()}
              disabled={loading || !installed}
              className="inline-flex items-center gap-2 rounded-lg bg-lumina-500 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-lumina-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Wallet className="h-4 w-4" aria-hidden />
              {loading ? "Connecting…" : "Connect Wallet"}
            </button>
          )}
        </div>

        {error && (
          <div className="absolute inset-x-0 top-full border-t border-red-500/20 bg-red-950/90 px-4 py-2 text-xs text-red-300">
            {error}
          </div>
        )}
      </div>
    </header>
  );
}