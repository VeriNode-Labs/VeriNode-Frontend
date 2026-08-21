'use client';

import React, { useMemo } from 'react';
import { DelegationNode, DelegationEdge } from '@/src/types/delegation';

interface DelegationDetailPanelProps {
  nodeId: string | null;
  nodes: DelegationNode[];
  edges: DelegationEdge[];
  onClose: () => void;
}

export default function DelegationDetailPanel({
  nodeId,
  nodes,
  edges,
  onClose
}: DelegationDetailPanelProps) {
  const node = useMemo(() => {
    if (!nodeId) return null;
    return nodes.find((n) => n.id === nodeId) || null;
  }, [nodeId, nodes]);

  // Calculate connected edges
  const connectedEdges = useMemo(() => {
    if (!nodeId) return [];
    return edges.filter((e) => e.source === nodeId || e.target === nodeId);
  }, [nodeId, edges]);

  // Compute key stats
  const stats = useMemo(() => {
    if (!node) return { totalStake: 0, delegatorCount: 0, apr: 0, avgSize: 0 };

    const depositIn = connectedEdges.filter((e) => e.target === node.id && e.type === 'deposit');
    const delegateOut = connectedEdges.filter((e) => e.source === node.id && e.type === 'delegate');
    const delegateIn = connectedEdges.filter((e) => e.target === node.id && e.type === 'delegate');

    let totalStake = 0;
    let delegatorCount = 0;
    const apr = node.metadata.apr || 0;

    if (node.type === 'delegator') {
      totalStake = connectedEdges
        .filter((e) => e.source === node.id && e.type === 'deposit')
        .reduce((sum, e) => sum + e.amount, 0);
      delegatorCount = 1;
    } else if (node.type === 'protocol') {
      totalStake = delegateOut.reduce((sum, e) => sum + e.amount, 0);
      delegatorCount = depositIn.length;
    } else {
      // Validator
      totalStake = delegateIn.reduce((sum, e) => sum + e.amount, 0);
      delegatorCount = node.metadata.delegatorCount || depositIn.length;
    }

    const avgSize = delegatorCount > 0 ? totalStake / delegatorCount : 0;

    return {
      totalStake: Math.round(totalStake * 10) / 10,
      delegatorCount,
      apr,
      avgSize: Math.round(avgSize * 10) / 10
    };
  }, [node, connectedEdges]);

  // Top delegation edges (largest amounts in/out)
  const topEdges = useMemo(() => {
    if (!nodeId) return [];
    return [...connectedEdges]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5)
      .map((edge) => {
        const isOutbound = edge.source === nodeId;
        const counterpartId = isOutbound ? edge.target : edge.source;
        const counterpartNode = nodes.find((n) => n.id === counterpartId);
        return {
          id: `${edge.source}-${edge.target}-${edge.type}-${edge.timestamp}`,
          counterpartName: counterpartNode ? counterpartNode.label : counterpartId,
          amount: edge.amount,
          type: edge.type,
          isOutbound
        };
      });
  }, [nodeId, connectedEdges, nodes]);

  // Historical delegation chart coordinates (SVG Area Chart)
  const chartData = useMemo(() => {
    if (connectedEdges.length === 0) return null;

    // Filter deposit or delegate edges to plot stake increase history
    const historyEdges = connectedEdges
      .filter((e) => e.type === 'deposit' || e.type === 'delegate')
      .sort((a, b) => a.timestamp - b.timestamp);

    if (historyEdges.length === 0) return null;

    const points = historyEdges.reduce<{ timestamp: number; value: number }[]>((acc, e) => {
      const prev = acc.length > 0 ? acc[acc.length - 1].value : 0;
      acc.push({ timestamp: e.timestamp, value: prev + e.amount });
      return acc;
    }, []);

    const timestamps = points.map((p) => p.timestamp);
    const values = points.map((p) => p.value);

    const minX = Math.min(...timestamps);
    const maxX = Math.max(...timestamps);
    const maxY = Math.max(...values) * 1.1 || 10;

    // Map to SVG coordinates: viewBox 0 0 300 120
    const svgW = 300;
    const svgH = 120;
    const padding = 15;

    const mapX = (t: number) => {
      if (maxX === minX) return svgW / 2;
      return padding + ((t - minX) / (maxX - minX)) * (svgW - 2 * padding);
    };

    const mapY = (val: number) => {
      return svgH - padding - (val / maxY) * (svgH - 2 * padding);
    };

    const svgPoints = points.map((p) => ({
      x: mapX(p.timestamp),
      y: mapY(p.value),
      date: new Date(p.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      val: Math.round(p.value)
    }));

    // Area Path
    let areaPath = '';
    let linePath = '';

    if (svgPoints.length > 0) {
      linePath = `M ${svgPoints[0].x} ${svgPoints[0].y}`;
      svgPoints.slice(1).forEach((pt) => {
        linePath += ` L ${pt.x} ${pt.y}`;
      });

      areaPath = `${linePath} L ${svgPoints[svgPoints.length - 1].x} ${svgH - padding} L ${svgPoints[0].x} ${svgH - padding} Z`;
    }

    return {
      points: svgPoints,
      areaPath,
      linePath,
      maxY
    };
  }, [connectedEdges]);

  if (!node) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-30 flex w-full max-w-md flex-col border-l border-white/10 bg-slate-900/95 p-6 shadow-2xl backdrop-blur-lg text-slate-100 transition-transform duration-300">
      
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              node.type === 'delegator'
                ? 'bg-blue-500/20 text-blue-400'
                : node.type === 'protocol'
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-emerald-500/20 text-emerald-400'
            }`}>
              {node.type}
            </span>
            {node.type === 'validator' && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                node.metadata.status === 'active'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : node.metadata.status === 'exiting'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'bg-red-500/20 text-red-400'
              }`}>
                {node.metadata.status}
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-lg font-bold text-white">{node.label}</h2>
          <span className="text-[10px] font-mono text-slate-400">{node.id}</span>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-slate-800 p-2 text-slate-400 hover:bg-slate-700 hover:text-white"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="my-6 grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Stake</p>
          <p className="mt-1 text-lg font-bold text-white">{stats.totalStake.toLocaleString()} ETH</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {node.type === 'delegator' ? 'Destinations' : node.type === 'protocol' ? 'Depositors' : 'Delegators'}
          </p>
          <p className="mt-1 text-lg font-bold text-white">{stats.delegatorCount.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current APR</p>
          <p className="mt-1 text-lg font-bold text-amber-400">{stats.apr > 0 ? `${stats.apr}%` : 'N/A'}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Delegation</p>
          <p className="mt-1 text-lg font-bold text-white">{stats.avgSize.toLocaleString()} ETH</p>
        </div>
      </div>

      {/* Area Chart Section */}
      <div className="mb-6 rounded-xl border border-white/5 bg-slate-950/30 p-4">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Historical Stake (Cumulative)</h3>
        {chartData && chartData.points.length > 0 ? (
          <div className="relative">
            <svg viewBox="0 0 300 120" className="h-32 w-full overflow-visible">
              <defs>
                <linearGradient id="area-grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Gridlines */}
              <line x1="15" y1="15" x2="285" y2="15" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <line x1="15" y1="60" x2="285" y2="60" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              <line x1="15" y1="105" x2="285" y2="105" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

              {/* Filled Area */}
              <path d={chartData.areaPath} fill="url(#area-grad)" />

              {/* Line */}
              <path d={chartData.linePath} fill="none" stroke="#a855f7" strokeWidth="2" />

              {/* Data points */}
              {chartData.points.map((pt, i) => (
                <g key={i}>
                  <circle cx={pt.x} cy={pt.y} r="3" fill="#a855f7" stroke="#ffffff" strokeWidth="1" />
                  {/* Show dates/values at start and end points */}
                  {(i === 0 || i === chartData.points.length - 1) && (
                    <text x={pt.x} y={pt.y - 6} textAnchor="middle" fill="#cbd5e1" fontSize="7" fontWeight="bold">
                      {pt.val} ETH
                    </text>
                  )}
                </g>
              ))}

              {/* X Axis label line */}
              <line x1="15" y1="105" x2="285" y2="105" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
            </svg>
            <div className="mt-1 flex justify-between px-2 text-[8px] font-bold text-slate-500">
              <span>{chartData.points[0].date}</span>
              <span>{chartData.points[chartData.points.length - 1].date}</span>
            </div>
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-slate-500">No stake history available.</p>
        )}
      </div>

      {/* Top Connections List */}
      <div className="flex-1 overflow-y-auto">
        <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">Top Connections</h3>
        {topEdges.length > 0 ? (
          <div className="space-y-2">
            {topEdges.map((edge) => (
              <div
                key={edge.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-slate-950/20 px-3 py-2 text-xs"
              >
                <div className="flex flex-col">
                  <span className="font-semibold text-white">{edge.counterpartName}</span>
                  <span className="text-[9px] text-slate-500">
                    {edge.isOutbound ? 'Outbound' : 'Inbound'} • {edge.type}
                  </span>
                </div>
                <div className="font-bold text-purple-400">
                  {edge.amount.toLocaleString()} ETH
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-xs text-slate-500">No connections found.</p>
        )}
      </div>

    </div>
  );
}
