"use client";

import { useMemo, useState } from "react";
import { ArrowUpRight, Fingerprint, Landmark, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { IpTimestampModal } from "@/components/IpTimestampModal";
import { BlindRecruitmentCard, type BlindCandidate } from "@/components/BlindRecruitmentCard";
import { EscrowTracker, type EscrowRecord } from "@/components/EscrowTracker";
import { MeritMetricsChart, type MeritMetric } from "@/components/MeritMetricsChart";

const SAMPLE_ESCROWS: EscrowRecord[] = [
  {
    onchain_id: "1",
    client: "GBD2MKIXIDQ4B57VUGOKX7KQSX7BW35C6AI3XQCGDGHWSHZPVQ4V3Z4V",
    creator: "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE",
    total_amount: "5000000000",
    remaining_balance: "3000000000",
    completed_milestones: 2,
    total_milestones: 5,
    status: "active",
  },
  {
    onchain_id: "2",
    client: "GAC4IBKYVBS7RLNCG7R7BPAW3NQKD4XIE2VBCPBTK7GBCVB7F7H3J4N4",
    creator: "CA3D5KRYM6CB7OWQ6TWYRR3Z4T7GNZLKERYNZGGA5SOAOPIFY6YQGAXE",
    total_amount: "12000000000",
    remaining_balance: "0",
    completed_milestones: 3,
    total_milestones: 3,
    status: "settled",
  },
];

const SAMPLE_CANDIDATES: BlindCandidate[] = [
  { id: "3f9c1a2b4d5e6f70", merit_score: 141, verified_skills: ["rust", "soroban", "stellar"], completion_ratio: 1, escrows_completed: 4 },
  { id: "a1c2e3f445566778", merit_score: 128, verified_skills: ["javascript", "typescript", "react"], completion_ratio: 1, escrows_completed: 3 },
  { id: "9b8c7d6e5f403020", merit_score: 172, verified_skills: ["solidity", "evm", "hardhat"], completion_ratio: 1, escrows_completed: 6 },
  { id: "7e6d5c4b3a291807", merit_score: 105, verified_skills: ["python", "fastapi", "postgres"], completion_ratio: 0.875, escrows_completed: 2 },
];

const SAMPLE_METRICS: MeritMetric[] = [
  { month: "Apr", payouts: 1200, registrations: 14 },
  { month: "May", payouts: 2100, registrations: 22 },
  { month: "Jun", payouts: 1800, registrations: 31 },
  { month: "Jul", payouts: 3400, registrations: 38 },
  { month: "Aug", payouts: 2900, registrations: 47 },
  { month: "Sep", payouts: 4600, registrations: 61 },
];

type Tab = "studio" | "hiring";

function skillOverlap(required: string[], candidate: BlindCandidate): number {
  const req = new Set(required.map((s) => s.toLowerCase()));
  return candidate.verified_skills.filter((skill) => req.has(skill.toLowerCase())).length;
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("studio");
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");

  const requiredSkills = useMemo(() => query.split(/[\s,;]+/).map((s) => s.trim()).filter(Boolean), [query]);

  const ranked = useMemo(() => {
    const scored = SAMPLE_CANDIDATES.map((candidate) => ({
      ...candidate,
      score: requiredSkills.length === 0 ? 0 : skillOverlap(requiredSkills, candidate),
    }));
    return scored.sort((a, b) => b.score - a.score);
  }, [requiredSkills]);

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8">
        <section className="mb-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-lumina-500/30 bg-lumina-500/10 px-2.5 py-1 text-[11px] font-medium text-lumina-300">
            <ShieldCheck className="h-3 w-3" aria-hidden />
            Privacy-preserving creative economy
          </span>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Anchor your work on-chain.
            <br />
            <span className="bg-gradient-to-r from-lumina-300 to-emerald-300 bg-clip-text text-transparent">
              Get paid by evidence, not optics.
            </span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Lumina fingerprints creative assets as SHA-256 proofs of existence on Stellar, manages
            milestone escrows, and lets clients hire through a bias-blind explorer that only sees
            on-chain skill merit — never names, photos, or demographics.
          </p>
        </section>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setTab("studio")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "studio"
                ? "bg-lumina-500 text-white"
                : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            <Fingerprint className="h-4 w-4" aria-hidden />
            Creator Studio
          </button>
          <button
            type="button"
            onClick={() => setTab("hiring")}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
              tab === "hiring"
                ? "bg-lumina-500 text-white"
                : "border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10"
            }`}
          >
            <Landmark className="h-4 w-4" aria-hidden />
            Blind Hiring Portal
          </button>
        </div>

        {tab === "studio" ? (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-gradient-to-br from-lumina-950/60 to-zinc-900 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Timestamp &amp; license a work</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Generate a client-side SHA-256 fingerprint and anchor the register_asset proof to
                  the Lumina contract.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-lumina-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-lumina-400"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                Anchor New IP
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {SAMPLE_ESCROWS.map((escrow) => (
                <EscrowTracker key={escrow.onchain_id} escrow={escrow} />
              ))}
              <div className="flex flex-col justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-6 text-sm text-zinc-500">
                <Landmark className="h-5 w-5 text-zinc-600" aria-hidden />
                Milestone escrows appear here once funded — balance locks until the client signs each
                release on-chain.
              </div>
            </div>

            <MeritMetricsChart data={SAMPLE_METRICS} />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900/40 p-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Bias-blind candidate explorer</h2>
                <p className="mt-1 max-w-xl text-sm text-zinc-400">
                  Candidates appear as anonymous cryptographic nodes ranked purely by verified
                  on-chain skills and milestone delivery. No names, photos, or demographic signals.
                </p>
              </div>
              <label className="relative block w-full sm:max-w-xs">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" aria-hidden />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter by skills, e.g. rust soroban"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-lumina-500/60"
                />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {ranked.map((candidate) => (
                <BlindRecruitmentCard key={candidate.id} candidate={candidate} />
              ))}
            </div>

            <p className="text-xs text-zinc-500">
              Sample explorer data — connect the Lumina backend indexer to populate the pool from
              live on-chain attestations.
            </p>
          </div>
        )}
      </main>

      {modalOpen && <IpTimestampModal open onClose={() => setModalOpen(false)} />}
    </div>
  );
}