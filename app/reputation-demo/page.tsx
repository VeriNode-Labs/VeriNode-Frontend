'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChartSkeleton } from '@/src/components/charts/ChartSkeleton';

const ReputationChart = dynamic(
  () => import('@/src/components/reputation/ReputationChart').then((m) => m.ReputationChart),
  { ssr: false, loading: () => <ChartSkeleton height={320} /> },
);

/**
 * Demo page for ReputationChart component
 * Showcases the performance optimizations
 */
export default function ReputationDemoPage() {
  const [nodeId] = useState('node-demo-001');
  const [simulateEvents, setSimulateEvents] = useState(false);
  const [batchInterval, setBatchInterval] = useState(100);
  const [useRAF, setUseRAF] = useState(true);
  const [enableDecimation, setEnableDecimation] = useState(true);

  return (
    <main id="main-content" className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8" aria-label="Reputation chart demo">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Reputation Chart Performance Demo
          </h1>
          <p className="text-slate-400">
            Real-time node reputation tracking with batched updates and performance monitoring
          </p>
        </div>

        {/* Controls */}
        <div className="mb-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Configuration</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Simulate Events Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Simulate Events
              </label>
              <button
                onClick={() => setSimulateEvents(!simulateEvents)}
                className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                  simulateEvents
                    ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {simulateEvents ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Batch Interval */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Batch Interval: {batchInterval}ms
              </label>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={batchInterval}
                onChange={(e) => setBatchInterval(Number(e.target.value))}
                className="w-full accent-sky-500"
                disabled={useRAF}
              />
              {useRAF && (
                <span className="text-xs text-slate-500">
                  (Disabled when using RAF)
                </span>
              )}
            </div>

            {/* RAF Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Use requestAnimationFrame
              </label>
              <button
                onClick={() => setUseRAF(!useRAF)}
                className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                  useRAF
                    ? 'bg-sky-500 text-white hover:bg-sky-600'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {useRAF ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Decimation Toggle */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-slate-300">
                Enable Decimation
              </label>
              <button
                onClick={() => setEnableDecimation(!enableDecimation)}
                className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                  enableDecimation
                    ? 'bg-amber-500 text-white hover:bg-amber-600'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {enableDecimation ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>

          {/* Info Banner */}
          <div className="mt-4 rounded-lg bg-blue-500/10 border border-blue-500/20 p-4">
            <p className="text-sm text-blue-300">
              <strong>How it works:</strong> Enable &quot;Simulate Events&quot; to generate high-frequency 
              reputation events (1 slashing + 10 recovery rewards every 2 seconds). The chart 
              uses batched updates to prevent UI freezes. Watch the performance metrics below!
            </p>
          </div>
        </div>

        {/* Chart */}
        <ReputationChart
          nodeId={nodeId}
          simulateEvents={simulateEvents}
          batchInterval={batchInterval}
          enableDecimation={enableDecimation}
          useRAF={useRAF}
        />

        {/* Information Panels */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Problem Statement */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              The Problem
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <strong className="text-red-400">Original Issue:</strong> Each reputation 
                event triggered an immediate chart.update() call taking 3-5ms.
              </p>
              <p>
                With 10 events in 100ms, chart rendering consumed 30-50ms of main-thread 
                time, causing 2-3 dropped frames.
              </p>
              <p>
                During 50-node recovery (500 events/sec), the chart froze the entire 
                dashboard for 2+ seconds.
              </p>
            </div>
          </div>

          {/* Solution */}
          <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-6">
            <h3 className="text-lg font-semibold text-white mb-3">
              The Solution
            </h3>
            <div className="space-y-2 text-sm text-slate-300">
              <p>
                <strong className="text-emerald-400">Batched Updates:</strong> Buffer 
                incoming data points and update chart once per interval.
              </p>
              <p>
                <strong className="text-sky-400">RAF Rendering:</strong> Use 
                requestAnimationFrame to ensure max 60 updates/sec.
              </p>
              <p>
                <strong className="text-amber-400">Decimation:</strong> Aggregate 
                points at high event rates to reduce data volume.
              </p>
            </div>
          </div>
        </div>

        {/* Performance Targets */}
        <div className="mt-6 rounded-2xl border border-white/10 bg-slate-900/80 p-6">
          <h3 className="text-lg font-semibold text-white mb-3">
            Performance Targets
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex flex-col">
              <span className="text-slate-400">Max Freeze</span>
              <span className="text-2xl font-bold text-emerald-400">&lt; 50ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">Frame Budget</span>
              <span className="text-2xl font-bold text-sky-400">16ms</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">Target FPS</span>
              <span className="text-2xl font-bold text-amber-400">60fps</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">500ms Window</span>
              <span className="text-2xl font-bold text-purple-400">&lt; 100ms</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
