/**
 * MathCanvasDualSurface
 *
 * Priority 1: Two simultaneous WebGL surfaces with intersection curve.
 *
 * Renders two independent SurfaceDescriptors in the same R3F scene,
 * each with its own colour scheme, opacity slider, and show/hide toggle.
 * A marching-squares intersection sampler finds where the surfaces meet
 * and renders that curve as glowing amber LineSegments.
 *
 * Think of it as laying two transparent glass sculptures in the same
 * display case: you can see through both, and where the glass meets
 * you get a bright edge that tells the story of the intersection.
 *
 * Architecture:
 *   CompoundSurfaceDescriptor
 *     → evaluateSurface(surface1) → SurfaceMesh (heat gradient, configurable opacity)
 *     → evaluateSurface(surface2) → SurfaceMesh (cool gradient, configurable opacity)
 *     → computeIntersectionCurve() → IntersectionCurve → IntersectionLines (amber)
 *
 * No eval() — all geometry is produced by pre-written TypeScript evaluators.
 * The intersection algorithm is pure arithmetic on Float32Array grids.
 *
 * Dynamically imported (ssr: false) — requires DOM + WebGL context.
 */

'use client';

import React, { useMemo, useRef, useState, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { evaluateSurface, computeZRange } from '@/lib/mathcanvas-evaluator';
import { buildVertexColoursExt } from '@/lib/mathcanvas-evaluator-ext';
import { computeIntersectionCurve } from '@/lib/mathcanvas-intersection';
import type {
  SurfaceDescriptor,
  SurfaceAppearance,
  CompoundSurfaceDescriptor,
  IntersectionCurve,
} from '@/types/mathcanvas';

// =============================================================================
// INDIVIDUAL SURFACE MESH
// =============================================================================

interface DualSurfaceMeshProps {
  surface: SurfaceDescriptor;
  paramOverrides: Record<string, number>;
  appearance: SurfaceAppearance;
  wireframe: boolean;
  /** Opacity override from the per-surface slider (0–1) */
  opacityOverride: number;
  /** Whether idle rotation is active (pauses when user grabs orbit control) */
  rotating: boolean;
  /** Rotation direction: 1 = clockwise, -1 = counter-clockwise */
  rotDir: 1 | -1;
}

function DualSurfaceMesh({
  surface,
  paramOverrides,
  appearance,
  wireframe,
  opacityOverride,
  rotating,
  rotDir,
}: DualSurfaceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    const evaluated = evaluateSurface(surface, paramOverrides);
    if (!evaluated.valid || evaluated.vertices.length === 0) return null;

    const N = evaluated.resolution;
    const verts = evaluated.vertices;
    const [zMin, zMax] = computeZRange(verts);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));

    // Build index buffer
    const indices: number[] = [];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const a = j * (N + 1) + i;
        const b = a + 1;
        const c = a + (N + 1);
        const d = c + 1;
        indices.push(a, b, c);
        indices.push(b, d, c);
      }
    }
    geo.setIndex(indices);

    // Colour scheme — '3d_cool' for surface 2 creates immediate visual contrast
    const colours = buildVertexColoursExt(verts, appearance.colorScheme, zMin, zMax);
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    geo.computeVertexNormals();
    return geo;
  }, [surface, paramOverrides, appearance.colorScheme]);

  // Gentle idle rotation — each surface rotates independently so the intersection
  // curve sweeps through space, helping students see the 3D relationship
  useFrame((_state, delta) => {
    if (meshRef.current && rotating) {
      meshRef.current.rotation.y += rotDir * delta * 0.03;
    }
  });

  if (!geometry) return null;

  const finalOpacity = Math.max(0.05, Math.min(1, opacityOverride));
  const transparent = finalOpacity < 0.99;

  return (
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhongMaterial
          vertexColors={true}
          side={THREE.DoubleSide}
          shininess={35}
          specular={new THREE.Color(0x334466)}
          wireframe={false}
          transparent={transparent}
          opacity={finalOpacity}
          depthWrite={!transparent}
        />
      </mesh>
      {wireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color={appearance.colorScheme === '3d_cool' ? 0x7c3aed : 0x1e9df1}
            wireframe={true}
            opacity={0.25}
            transparent={true}
          />
        </mesh>
      )}
    </>
  );
}

// =============================================================================
// INTERSECTION CURVE LINES
// =============================================================================

interface IntersectionLinesProps {
  curve: IntersectionCurve;
  visible: boolean;
}

function IntersectionLines({ curve, visible }: IntersectionLinesProps) {
  if (!visible || !curve.hasIntersection) return null;

  // Build a Float32Array of position pairs for LineSegments
  // Each segment contributes 6 values (x1,y1,z1, x2,y2,z2)
  const positions = useMemo(() => {
    const buf = new Float32Array(curve.segments.length * 6);
    curve.segments.forEach((seg, i) => {
      buf[i * 6 + 0] = seg.x1;
      buf[i * 6 + 1] = seg.y1;
      buf[i * 6 + 2] = seg.z1;
      buf[i * 6 + 3] = seg.x2;
      buf[i * 6 + 4] = seg.y2;
      buf[i * 6 + 5] = seg.z2;
    });
    return buf;
  }, [curve.segments]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [positions]);

  return (
    // Amber glowing intersection line — unmistakable against both heat and cool palettes
    <lineSegments geometry={geometry}>
      <lineBasicMaterial
        color={0xf59e0b}   // Scholarly amber #f59e0b
        linewidth={2}       // Note: linewidth >1 only works in WebGL2 on some browsers
        toneMapped={false}  // HDR-ish glow effect
      />
    </lineSegments>
  );
}

// =============================================================================
// AXIS LABELS
// =============================================================================

function AxisLabels() {
  const axisLength = 5;
  return (
    <group>
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), axisLength, 0xef4444, 0.3, 0.15]} />
      <Text position={[axisLength + 0.4, 0, 0]} fontSize={0.35} color="#ef4444" anchorX="center">x</Text>
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), axisLength, 0x10b981, 0.3, 0.15]} />
      <Text position={[0, axisLength + 0.4, 0]} fontSize={0.35} color="#10b981" anchorX="center">z</Text>
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), axisLength, 0x6366f1, 0.3, 0.15]} />
      <Text position={[0, 0, axisLength + 0.4]} fontSize={0.35} color="#6366f1" anchorX="center">y</Text>
    </group>
  );
}

// =============================================================================
// SCENE CONTAINER — manages both surfaces + intersection inside one Canvas
// =============================================================================

interface DualSceneProps {
  compound: CompoundSurfaceDescriptor;
  paramOverrides: Record<string, number>;
  showSurface1: boolean;
  showSurface2: boolean;
  showIntersection: boolean;
  opacity1: number;
  opacity2: number;
  wireframe: boolean;
  showGrid: boolean;
  onIntersectionComputed: (curve: IntersectionCurve) => void;
}

function DualScene({
  compound,
  paramOverrides,
  showSurface1,
  showSurface2,
  showIntersection,
  opacity1,
  opacity2,
  wireframe,
  showGrid,
  onIntersectionComputed,
}: DualSceneProps) {
  // Compute intersection curve (memoized — only recalculates when params change)
  const intersectionCurve = useMemo(() => {
    const curve = computeIntersectionCurve(compound, paramOverrides);
    onIntersectionComputed(curve);
    return curve;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [compound, paramOverrides]);

  return (
    <>
      {/* Lighting — two directional lights to illuminate both surfaces clearly */}
      <ambientLight intensity={0.55} />
      <directionalLight position={[10, 12, 5]} intensity={0.75} />
      <directionalLight position={[-8, -8, -5]} intensity={0.3} color="#b8ddf8" />
      <pointLight position={[0, 10, 0]} intensity={0.45} color="#ecf3fd" />
      {/* Warm accent light to make the intersection amber line pop */}
      <pointLight position={[0, 0, 0]} intensity={0.2} color="#f59e0b" distance={8} />

      {/* Surface 1 — heat gradient (warm) */}
      {showSurface1 && (
        <DualSurfaceMesh
          surface={compound.surface1.descriptor}
          paramOverrides={paramOverrides}
          appearance={compound.surface1.appearance}
          wireframe={wireframe}
          opacityOverride={opacity1}
          rotating={false}
          rotDir={1}
        />
      )}

      {/* Surface 2 — cool gradient (violet-pink) */}
      {showSurface2 && (
        <DualSurfaceMesh
          surface={compound.surface2.descriptor}
          paramOverrides={paramOverrides}
          appearance={compound.surface2.appearance}
          wireframe={wireframe}
          opacityOverride={opacity2}
          rotating={false}
          rotDir={-1}
        />
      )}

      {/* Intersection curve — amber line */}
      <IntersectionLines
        curve={intersectionCurve}
        visible={showIntersection}
      />

      {/* Reference axes */}
      <AxisLabels />

      {/* Floor grid */}
      {showGrid && (
        <Grid
          args={[20, 20]}
          position={[0, -0.01, 0]}
          cellColor="#c5d8e4"
          sectionColor="#b8ddf8"
          cellSize={1}
          sectionSize={5}
          fadeDistance={30}
          fadeStrength={1}
          infiniteGrid={false}
        />
      )}

      <OrbitControls
        enableDamping={true}
        dampingFactor={0.08}
        minDistance={2}
        maxDistance={40}
        enablePan={true}
        panSpeed={0.8}
        rotateSpeed={0.7}
        zoomSpeed={1.0}
        mouseButtons={{
          LEFT: THREE.MOUSE.ROTATE,
          MIDDLE: THREE.MOUSE.DOLLY,
          RIGHT: THREE.MOUSE.PAN,
        }}
        touches={{
          ONE: THREE.TOUCH.ROTATE,
          TWO: THREE.TOUCH.DOLLY_PAN,
        }}
      />
    </>
  );
}

// =============================================================================
// MAIN COMPONENT — full dual-surface canvas with control overlay
// =============================================================================

export interface MathCanvasDualSurfaceProps {
  compound: CompoundSurfaceDescriptor;
  paramOverrides: Record<string, number>;
  className?: string;
}

export function MathCanvasDualSurface({
  compound,
  paramOverrides,
  className = '',
}: MathCanvasDualSurfaceProps) {
  const [showSurface1, setShowSurface1]           = useState(true);
  const [showSurface2, setShowSurface2]           = useState(true);
  const [showIntersection, setShowIntersection]   = useState(true);
  const [opacity1, setOpacity1]                   = useState(compound.surface1.appearance.opacity);
  const [opacity2, setOpacity2]                   = useState(compound.surface2.appearance.opacity);
  const [wireframe, setWireframe]                 = useState(false);
  const [showGrid, setShowGrid]                   = useState(true);
  const [intersectionInfo, setIntersectionInfo]   = useState<IntersectionCurve | null>(null);

  const handleIntersectionComputed = useCallback((curve: IntersectionCurve) => {
    setIntersectionInfo(curve);
  }, []);

  // Colour swatch helpers for the legend
  const scheme1Colour = '#f59e0b'; // amber representing heat gradient high
  const scheme2Colour = '#7c3aed'; // violet representing cool gradient

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 480 }}>

      {/* ── TOP CONTROL BAR ────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 10, left: 10, right: 10, zIndex: 10,
        display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Surface 1 toggle */}
        <SurfaceToggleButton
          label={compound.surface1.appearance.label}
          colour={scheme1Colour}
          active={showSurface1}
          onToggle={() => setShowSurface1(v => !v)}
        />
        {/* Surface 1 opacity */}
        <OpacitySlider
          value={opacity1}
          onChange={setOpacity1}
          colour={scheme1Colour}
          label="α₁"
        />

        <div style={{ width: 1, height: 24, background: '#e1eaef', margin: '0 2px' }} />

        {/* Surface 2 toggle */}
        <SurfaceToggleButton
          label={compound.surface2.appearance.label}
          colour={scheme2Colour}
          active={showSurface2}
          onToggle={() => setShowSurface2(v => !v)}
        />
        {/* Surface 2 opacity */}
        <OpacitySlider
          value={opacity2}
          onChange={setOpacity2}
          colour={scheme2Colour}
          label="α₂"
        />

        <div style={{ width: 1, height: 24, background: '#e1eaef', margin: '0 2px' }} />

        {/* Intersection toggle */}
        <OverlayButton
          label="∩ Intersection"
          active={showIntersection}
          onToggle={() => setShowIntersection(v => !v)}
          accentColour="#f59e0b"
        />

        {/* View options */}
        <OverlayButton label={wireframe ? '⬛ Solid' : '▦ Wire'} active={wireframe} onToggle={() => setWireframe(v => !v)} />
        <OverlayButton label="Grid" active={showGrid} onToggle={() => setShowGrid(v => !v)} />
      </div>

      {/* ── INTERSECTION STATUS BADGE ──────────────────────────────────────── */}
      {intersectionInfo && (
        <div style={{
          position: 'absolute', top: 52, left: 10, zIndex: 10,
          fontSize: 11, fontFamily: 'Open Sans, sans-serif',
          color: intersectionInfo.hasIntersection ? '#92400e' : '#536471',
          background: intersectionInfo.hasIntersection ? 'rgba(251,191,36,0.18)' : 'rgba(255,255,255,0.85)',
          border: `1px solid ${intersectionInfo.hasIntersection ? '#fbbf24' : '#e1eaef'}`,
          padding: '3px 10px', borderRadius: 99,
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ fontSize: 9, opacity: 0.7 }}>∩</span>
          {intersectionInfo.message}
        </div>
      )}

      {/* ── INTERACTION HINT ───────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 10, left: '50%',
        transform: 'translateX(-50%)', zIndex: 10,
        fontSize: 10, color: '#8b99a4',
        fontFamily: 'Open Sans, sans-serif',
        background: 'rgba(255,255,255,0.85)',
        padding: '3px 10px', borderRadius: 99,
        border: '1px solid #e1eaef',
        pointerEvents: 'none', userSelect: 'none',
      }}>
        Drag to orbit · Scroll to zoom · Right-drag to pan
      </div>

      {/* ── WEBGL CANVAS ───────────────────────────────────────────────────── */}
      <Canvas
        camera={{ position: [9, 7, 9], fov: 45 }}
        style={{ background: 'linear-gradient(145deg, #f7f8f8 0%, #eef3f8 100%)', borderRadius: 8 }}
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
      >
        <DualScene
          compound={compound}
          paramOverrides={paramOverrides}
          showSurface1={showSurface1}
          showSurface2={showSurface2}
          showIntersection={showIntersection}
          opacity1={opacity1}
          opacity2={opacity2}
          wireframe={wireframe}
          showGrid={showGrid}
          onIntersectionComputed={handleIntersectionComputed}
        />
      </Canvas>
    </div>
  );
}

// =============================================================================
// CONTROL MICRO-COMPONENTS
// =============================================================================

interface SurfaceToggleButtonProps {
  label: string;
  colour: string;
  active: boolean;
  onToggle: () => void;
}

function SurfaceToggleButton({ label, colour, active, onToggle }: SurfaceToggleButtonProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '4px 10px', fontSize: 11, fontWeight: 600,
        fontFamily: 'Open Sans, sans-serif',
        background: active ? colour + '22' : '#ffffff',
        color: active ? colour : '#8b99a4',
        border: `1.5px solid ${active ? colour : '#e1eaef'}`,
        borderRadius: 6, cursor: 'pointer',
        transition: 'all 0.15s ease',
        opacity: active ? 1 : 0.6,
      }}
    >
      <span style={{
        width: 8, height: 8, borderRadius: '50%',
        background: colour,
        opacity: active ? 1 : 0.4,
        flexShrink: 0,
      }} />
      {label}
    </button>
  );
}

interface OpacitySliderProps {
  value: number;
  onChange: (v: number) => void;
  colour: string;
  label: string;
}

function OpacitySlider({ value, onChange, colour, label }: OpacitySliderProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        fontSize: 10, fontFamily: 'Open Sans, sans-serif',
        color: '#8b99a4', fontWeight: 600, minWidth: 16,
      }}>{label}</span>
      <input
        type="range"
        min={0.1}
        max={1.0}
        step={0.05}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: 64, height: 4, cursor: 'pointer',
          accentColor: colour,
          appearance: 'none',
          background: `linear-gradient(to right, ${colour} 0%, ${colour} ${value * 100}%, #e1eaef ${value * 100}%, #e1eaef 100%)`,
          borderRadius: 2, outline: 'none', border: 'none',
        }}
      />
    </div>
  );
}

interface OverlayButtonProps {
  label: string;
  active: boolean;
  onToggle: () => void;
  accentColour?: string;
}

function OverlayButton({ label, active, onToggle, accentColour = '#1e9df1' }: OverlayButtonProps) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '4px 10px', fontSize: 11, fontWeight: 600,
        fontFamily: 'Open Sans, sans-serif',
        background: active ? accentColour : '#ffffff',
        color: active ? '#ffffff' : '#536471',
        border: '1px solid #e1eaef',
        borderRadius: 6, cursor: 'pointer',
        transition: 'all 0.15s ease',
      }}
    >
      {label}
    </button>
  );
}
