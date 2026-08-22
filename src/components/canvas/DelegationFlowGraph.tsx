'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { CubicBezierCurve3, CatmullRomCurve3 } from 'three';
import { useDelegationFlow } from '@/src/hooks/useDelegationFlow';
import { layoutDelegationGraph } from '@/src/utils/delegationGraphLayout';
import DelegationDetailPanel from '@/src/components/validators/DelegationDetailPanel';

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  title: string;
  type: string;
  details: string[];
}

export default function DelegationFlowGraph() {
  const {
    nodes,
    edges,
    allNodes,
    filters,
    timeBounds,
    selectedNodeId,
    setProtocolFilter,
    setMinAmountFilter,
    setTimeRangeFilter,
    setValidatorStatusFilter,
    setSelectedNodeId
  } = useDelegationFlow();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // UI state
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    title: '',
    type: '',
    details: []
  });

  const [wsPulse, setWsPulse] = useState(false);

  // References for the Three.js scene
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Track coordinates and physics of nodes in memory
  const nodePhysicsRef = useRef<Map<string, {
    id: string;
    x: number; // current x
    y: number; // current y
    targetX: number; // target x from layout
    targetY: number; // target y from layout
    vx: number;
    vy: number;
    radius: number;
    type: string;
    label: string;
    color: number;
  }>>(new Map());

  // Interactivity refs
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const draggedNodeIdRef = useRef<string | null>(null);
  const isMouseDownRef = useRef(false);

  // Store meshes to update them in the animation loop
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const edgeMeshesRef = useRef<Map<string, { mesh: THREE.Mesh; curve: CubicBezierCurve3; amount: number; type: string }>>(new Map());
  const particlesRef = useRef<{ mesh: THREE.Mesh; curve: CubicBezierCurve3; t: number; speed: number }[]>([]);

  // Trigger pulse effect when edges length changes (new real-time event)
  useEffect(() => {
    if (edges.length > 0) {
      setWsPulse(true);
      const timer = setTimeout(() => setWsPulse(false), 800);
      return () => clearTimeout(timer);
    }
  }, [edges.length]);

  // Unique protocols list for dropdown
  const protocolsList = useMemo(() => {
    return allNodes.filter((n) => n.type === 'protocol');
  }, [allNodes]);

  // Map to find Y coordinate for node types
  const getLayerY = (type: string, height: number) => {
    const margin = 80;
    if (type === 'delegator') return margin;
    if (type === 'protocol') return height / 2;
    return height - margin;
  };

  // Setup Three.js Scene
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    // 1. Create Scene & Camera
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b1329); // Rich deep dark blue
    sceneRef.current = scene;

    // Orthographic camera mapping screen pixels directly
    const camera = new THREE.OrthographicCamera(0, width, 0, height, 1, 1000);
    camera.position.z = 100;
    cameraRef.current = camera;

    // 2. Create Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 3. Add ambient lighting for 3D look
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(0, 0, 100);
    scene.add(dirLight);

    // Resize handler
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width: newW, height: newH } = entries[0].contentRect;
      if (newW === 0 || newH === 0) return;

      renderer.setSize(newW, newH);
      if (cameraRef.current) {
        cameraRef.current.right = newW;
        cameraRef.current.bottom = newH;
        cameraRef.current.updateProjectionMatrix();
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
    };
  }, []);

  // Update layout and reconstruct meshes when nodes/edges/size changes
  useEffect(() => {
    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    if (!scene || !renderer || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const height = containerRef.current.clientHeight || 500;

    // Helper: compute connected stake for a node
    const getNodeStake = (nodeId: string, nodeType: string) => {
      const connectedEdges = edges.filter((e) => e.source === nodeId || e.target === nodeId);
      if (nodeType === 'delegator') {
        return connectedEdges.reduce((sum, e) => sum + (e.type === 'deposit' ? e.amount : 0), 0);
      } else if (nodeType === 'protocol') {
        return connectedEdges.reduce((sum, e) => sum + (e.type === 'delegate' ? e.amount : 0), 0);
      } else {
        return connectedEdges.reduce((sum, e) => sum + (e.type === 'delegate' ? e.amount : 0), 0);
      }
    };

    // 1. Calculate new layout target coordinates
    const options = {
      width,
      height,
      nodePaddingFactor: 8,
      sideMargin: 80,
      topBottomMargin: 60,
      iterations: 4
    };
    const layouted = layoutDelegationGraph(nodes, edges, options);

    // 2. Update physics/position map
    const newPhysics = new Map();
    layouted.forEach((node) => {
      const stake = getNodeStake(node.id, node.type);
      const radius = 10 + Math.log10(stake + 1) * 6; // Radius proportional to stake

      let color = 0x3b82f6; // delegator: blue
      if (node.type === 'protocol') color = 0xa855f7; // protocol: purple
      else if (node.type === 'validator') {
        if (node.metadata.status === 'exiting') color = 0xf97316; // orange
        else if (node.metadata.status === 'slashed') color = 0xef4444; // red
        else color = 0x22c55e; // active validator: green
      }

      // Preserve previous positions if node already existed to animate transitions smoothly
      const prev = nodePhysicsRef.current.get(node.id);
      newPhysics.set(node.id, {
        id: node.id,
        x: prev ? prev.x : (node.x ?? width / 2),
        y: prev ? prev.y : (node.y ?? getLayerY(node.type, height)),
        targetX: node.x ?? width / 2,
        targetY: node.y ?? getLayerY(node.type, height),
        vx: 0,
        vy: 0,
        radius,
        type: node.type,
        label: node.label,
        color
      });
    });
    nodePhysicsRef.current = newPhysics;

    // 3. Clear previous meshes from scene
    nodeMeshesRef.current.forEach((m) => scene.remove(m));
    nodeMeshesRef.current.clear();

    edgeMeshesRef.current.forEach((item) => scene.remove(item.mesh));
    edgeMeshesRef.current.clear();

    particlesRef.current.forEach((p) => scene.remove(p.mesh));
    particlesRef.current.length = 0;

    // 4. Create Node Meshes
    nodePhysicsRef.current.forEach((nodePhys) => {
      // Circle mesh for node
      const geometry = new THREE.CircleGeometry(nodePhys.radius, 32);
      const material = new THREE.MeshBasicMaterial({
        color: nodePhys.color,
        side: THREE.DoubleSide
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(nodePhys.x, nodePhys.y, 1);
      mesh.userData = { id: nodePhys.id };
      scene.add(mesh);
      nodeMeshesRef.current.set(nodePhys.id, mesh);

      // Slashed tag
      if (nodePhys.type === 'validator' && nodePhys.id.includes('slashed')) {
        const borderGeo = new THREE.RingGeometry(nodePhys.radius + 1, nodePhys.radius + 3, 32);
        const borderMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
        const borderMesh = new THREE.Mesh(borderGeo, borderMat);
        mesh.add(borderMesh);
      }
    });

    // 5. Create Edges (Tubes along Bezier curves)
    edges.forEach((edge) => {
      const sourcePhys = nodePhysicsRef.current.get(edge.source);
      const targetPhys = nodePhysicsRef.current.get(edge.target);
      if (!sourcePhys || !targetPhys) return;

      // Create initial Bezier Curve
      const start = new THREE.Vector3(sourcePhys.x, sourcePhys.y, 0);
      const end = new THREE.Vector3(targetPhys.x, targetPhys.y, 0);
      const midY = start.y + (end.y - start.y) * 0.5;
      const cp1 = new THREE.Vector3(start.x, midY, 0);
      const cp2 = new THREE.Vector3(end.x, midY, 0);
      const curve = new CubicBezierCurve3(start, cp1, cp2, end);

      // Width proportional to amount (log scale: width = 2 + 8 * log10(amount_eth))
      const widthPx = Math.max(2, Math.min(50, 2 + 8 * Math.log10(edge.amount)));
      const tubeRadius = widthPx / 2;

      const pathPoints = curve.getPoints(20);
      const tubeGeo = new THREE.TubeGeometry(
        new CatmullRomCurve3(pathPoints),
        20,
        tubeRadius,
        6,
        false
      );

      let edgeColor = 0x3b82f6; // blue
      if (edge.type === 'delegate') edgeColor = 0xa855f7; // purple
      else if (edge.type === 'rewards') edgeColor = 0x22c55e; // green
      else if (edge.type === 'distributions') edgeColor = 0xf43f5e; // rose

      const tubeMat = new THREE.MeshBasicMaterial({
        color: edgeColor,
        transparent: true,
        opacity: 0.25,
        depthWrite: false
      });
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      scene.add(tubeMesh);

      edgeMeshesRef.current.set(`${edge.source}->${edge.target}-${edge.type}`, {
        mesh: tubeMesh,
        curve,
        amount: edge.amount,
        type: edge.type
      });

      // 6. Create particles along the curve (for flow direction)
      const numParticles = Math.min(3, Math.max(1, Math.floor(Math.log10(edge.amount + 1))));
      for (let p = 0; p < numParticles; p++) {
        const particleGeo = new THREE.SphereGeometry(Math.max(2.5, tubeRadius * 0.8), 8, 8);
        const particleMat = new THREE.MeshBasicMaterial({
          color: 0xffffff, // glowing white particle
        });
        const particleMesh = new THREE.Mesh(particleGeo, particleMat);
        particleMesh.position.copy(curve.getPointAt(0));
        scene.add(particleMesh);

        particlesRef.current.push({
          mesh: particleMesh,
          curve,
          t: p * (1.0 / numParticles), // space out particles along path
          speed: 0.15 + Math.random() * 0.1
        });
      }
    });

  }, [nodes, edges]);

  // Main animation/render loop
  useEffect(() => {
    let lastTime = performance.now();

    const animate = () => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      if (!scene || !camera || !renderer) return;

      const now = performance.now();
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const physics = nodePhysicsRef.current;
      const meshes = nodeMeshesRef.current;

      // 1. Physics update: spring node positions towards their target layout coordinates
      physics.forEach((node) => {
        if (draggedNodeIdRef.current === node.id) {
          // Node follows the mouse (dragged)
          // Limit drag Y slightly based on layer coordinate for the elastic effect
          const layerY = getLayerY(node.type, renderer.domElement.clientHeight);
          node.y = layerY + (mouseRef.current.y - layerY) * 0.25; // elastic buffer
          node.x = mouseRef.current.x;
        } else {
          // Spring forces pulling node back to target layout positions
          const dx = node.targetX - node.x;
          const dy = node.targetY - node.y;

          // Simple spring formula
          const k = 10.0; // spring constant
          const ax = dx * k;
          const ay = dy * k;

          node.vx += ax * delta;
          node.vy += ay * delta;

          // Damping
          node.vx *= 0.75;
          node.vy *= 0.75;

          node.x += node.vx;
          node.y += node.vy;
        }

        // Update corresponding mesh position
        const mesh = meshes.get(node.id);
        if (mesh) {
          mesh.position.set(node.x, node.y, 1);
        }
      });

      // 2. Re-route curves for moving/dragged nodes
      edgeMeshesRef.current.forEach((edgeItem, key) => {
        const [srcTarget] = key.split('-');
        const [sourceId, targetId] = srcTarget.split('->');

        const sourcePhys = physics.get(sourceId);
        const targetPhys = physics.get(targetId);

        if (sourcePhys && targetPhys) {
          // Recalculate curve points
          const start = new THREE.Vector3(sourcePhys.x, sourcePhys.y, 0);
          const end = new THREE.Vector3(targetPhys.x, targetPhys.y, 0);
          const midY = start.y + (end.y - start.y) * 0.5;

          edgeItem.curve.v0.copy(start);
          edgeItem.curve.v1.set(start.x, midY, 0);
          edgeItem.curve.v2.set(end.x, midY, 0);
          edgeItem.curve.v3.copy(end);

          // Rebuild tube geometry dynamically if it's moving
          if (draggedNodeIdRef.current === sourceId || draggedNodeIdRef.current === targetId || Math.abs(sourcePhys.vx) > 0.05 || Math.abs(targetPhys.vx) > 0.05) {
            const widthPx = Math.max(2, Math.min(50, 2 + 8 * Math.log10(edgeItem.amount)));
            const tubeRadius = widthPx / 2;
            const pathPoints = edgeItem.curve.getPoints(12);

            edgeItem.mesh.geometry.dispose();
            edgeItem.mesh.geometry = new THREE.TubeGeometry(
              new CatmullRomCurve3(pathPoints),
              12,
              tubeRadius,
              4,
              false
            );
          }
        }
      });

      // 3. Animate particles along the curves
      particlesRef.current.forEach((particle) => {
        particle.t += particle.speed * delta;
        if (particle.t > 1.0) particle.t = 0;
        const pos = particle.curve.getPointAt(particle.t);
        particle.mesh.position.copy(pos);
      });

      // 4. Render
      renderer.render(scene, camera);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Raycasting helper to detect clicked/hovered nodes
  const raycast = (clientX: number, clientY: number): string | null => {
    const canvas = canvasRef.current;
    const camera = cameraRef.current;
    if (!canvas || !camera) return null;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), camera);

    const meshes = Array.from(nodeMeshesRef.current.values());
    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      return intersects[0].object.userData.id;
    }
    return null;
  };

  // Convert pixel coordinates to 3D/Screen space coordinates for dragged nodes
  const updateMouseCoordinates = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    mouseRef.current.set(x, y);
  };

  // Mouse / Touch Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDownRef.current = true;
    updateMouseCoordinates(e.clientX, e.clientY);

    const hitId = raycast(e.clientX, e.clientY);
    if (hitId) {
      draggedNodeIdRef.current = hitId;
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    updateMouseCoordinates(e.clientX, e.clientY);

    // Show tooltip if hovering a node
    const hoverId = raycast(e.clientX, e.clientY);
    if (hoverId) {
      const node = nodes.find((n) => n.id === hoverId);
      if (node) {
        const connectedEdges = edges.filter((e) => e.source === node.id || e.target === node.id);
        const stake = node.type === 'delegator'
          ? connectedEdges.reduce((sum, e) => sum + (e.type === 'deposit' ? e.amount : 0), 0)
          : connectedEdges.reduce((sum, e) => sum + (e.type === 'delegate' ? e.amount : 0), 0);
        const details = [
          `Total Stake: ${stake.toLocaleString()} ETH`,
        ];
        if (node.type === 'validator') {
          details.push(`Status: ${node.metadata.status?.toUpperCase()}`);
          details.push(`APR: ${node.metadata.apr}%`);
        } else if (node.type === 'protocol') {
          details.push(`APR: ${node.metadata.apr}%`);
          details.push(`Delegators: ${node.metadata.delegatorCount}`);
        }

        const rect = canvasRef.current!.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: e.clientX - rect.left + 15,
          y: e.clientY - rect.top + 15,
          title: node.label,
          type: node.type.toUpperCase(),
          details
        });
        document.body.style.cursor = 'pointer';
        return;
      }
    }

    if (tooltip.visible) {
      setTooltip((t) => ({ ...t, visible: false }));
    }
    document.body.style.cursor = 'default';
  };

  const handleMouseUp = () => {
    // If we just clicked a node without dragging it, open the details
    if (draggedNodeIdRef.current) {
      const nodePhys = nodePhysicsRef.current.get(draggedNodeIdRef.current);
      if (nodePhys) {
        const dist = Math.sqrt(
          Math.pow(nodePhys.x - nodePhys.targetX, 2) + Math.pow(nodePhys.y - nodePhys.targetY, 2)
        );
        // If dragged distance is very small, treat as click/drill-down
        if (dist < 5) {
          setSelectedNodeId(draggedNodeIdRef.current);
        }
      }
    }

    draggedNodeIdRef.current = null;
    isMouseDownRef.current = false;
  };

  const handleMouseLeave = () => {
    draggedNodeIdRef.current = null;
    isMouseDownRef.current = false;
    setTooltip((t) => ({ ...t, visible: false }));
  };

  // Helper formatting for filters time range
  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit' });
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-950 font-sans text-slate-100">
      
      {/* Dynamic Glassmorphism Header / Control Overlay */}
      <div className="absolute top-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-blue-500 shadow-md shadow-purple-500/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 2a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white sm:text-lg">Delegation Flow</h1>
            <p className="hidden text-xs text-slate-400 sm:block">Liquid Staking protocol relationships & flow visualizer</p>
          </div>
        </div>

        {/* WebSocket live status indicator */}
        <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-400 font-semibold shadow-inner">
          <span className={`h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#10b981] ${wsPulse ? 'scale-150 animate-ping' : ''}`} />
          <span>Live WS Stream</span>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div ref={containerRef} className="relative h-full w-full flex-1">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="absolute inset-0 block h-full w-full outline-none"
        />

        {/* Render interactive text labels over nodes using HTML overlays for sharp CSS rendering */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* eslint-disable-next-line react-hooks/refs */}
          {Array.from(nodePhysicsRef.current.values()).map((nodePhys) => (
            <div
              key={nodePhys.id}
              style={{
                position: 'absolute',
                left: `${nodePhys.x}px`,
                top: `${nodePhys.y + nodePhys.radius + 6}px`,
                transform: 'translateX(-50%)',
              }}
              className={`rounded-md bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold border border-white/5 whitespace-nowrap shadow-md text-slate-200 transition-opacity duration-300 ${
                selectedNodeId === nodePhys.id ? 'border-amber-400 text-amber-400 ring-1 ring-amber-400/20' : ''
              }`}
            >
              {nodePhys.label}
            </div>
          ))}
        </div>

        {/* Hover Tooltip */}
        {tooltip.visible && (
          <div
            style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
            className="pointer-events-none absolute z-50 rounded-xl border border-slate-700 bg-slate-900/95 p-3 text-xs shadow-2xl backdrop-blur-sm text-slate-100"
          >
            <div className="mb-1 font-bold text-white flex items-center justify-between gap-4">
              <span>{tooltip.title}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[9px] font-semibold text-slate-400">{tooltip.type}</span>
            </div>
            <div className="space-y-0.5 text-slate-300">
              {tooltip.details.map((d, i) => (
                <div key={i}>{d}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Filters Footer Panel */}
      <div className="absolute bottom-4 left-4 right-4 z-10 grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-md md:grid-cols-4">
        {/* Protocol Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Staking Protocol</label>
          <select
            value={filters.selectedProtocol}
            onChange={(e) => setProtocolFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-semibold text-white focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Protocols</option>
            {protocolsList.map((proto) => (
              <option key={proto.id} value={proto.id}>
                {proto.label}
              </option>
            ))}
          </select>
        </div>

        {/* Min Amount Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Min delegation amount</label>
            <span className="text-[10px] font-bold text-purple-400">{filters.minAmount.toFixed(1)} ETH</span>
          </div>
          <input
            type="range"
            min="0"
            max="1000"
            step="10"
            value={filters.minAmount}
            onChange={(e) => setMinAmountFilter(Number(e.target.value))}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-purple-500"
          />
        </div>

        {/* Time Range Date Picker/Slider */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Range</label>
            <span className="text-[9px] font-bold text-blue-400">{formatDate(filters.timeRange[0])}</span>
          </div>
          <input
            type="range"
            min={timeBounds[0]}
            max={timeBounds[1]}
            step={3600000} // Hourly steps
            value={filters.timeRange[0]}
            onChange={(e) => setTimeRangeFilter([Number(e.target.value), timeBounds[1]])}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
          />
        </div>

        {/* Validator Status Filter */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Validator Status</label>
          <div className="flex gap-1.5">
            {(['all', 'active', 'exiting', 'slashed'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setValidatorStatusFilter(status)}
                className={`flex-1 rounded-lg py-1.5 text-[10px] font-bold uppercase tracking-wider transition ${
                  filters.validatorStatus === status
                    ? status === 'active'
                      ? 'bg-emerald-500 text-slate-950 shadow-inner'
                      : status === 'exiting'
                      ? 'bg-orange-500 text-slate-950 shadow-inner'
                      : status === 'slashed'
                      ? 'bg-rose-500 text-slate-950 shadow-inner'
                      : 'bg-white text-slate-950 shadow-inner'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Slide-out detail panel */}
      {selectedNodeId && (
        <DelegationDetailPanel
          nodeId={selectedNodeId}
          nodes={nodes}
          edges={edges}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}
