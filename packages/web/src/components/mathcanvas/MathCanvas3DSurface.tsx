/**
 * MathCanvas3DSurface
 *
 * True WebGL 3D surface renderer using @react-three/fiber and @react-three/drei.
 * This component is dynamically imported (ssr: false) from the MathCanvas page.
 * Never rendered on the server — Three.js requires a DOM and WebGL context.
 *
 * Architecture:
 *   SurfaceDescriptor → evaluateSurface() → Float32Array vertices
 *   → Three.js BufferGeometry → MeshPhongMaterial with per-vertex z-colour gradient
 *   OrbitControls: mouse-drag to orbit, scroll to zoom, right-click to pan
 *
 * Colour schemes:
 *   3d_heat   — blue (low) → cyan → green → yellow → red (high)
 *   3d_depth  — dark blue → steel blue (depth illusion)
 *   3d_normal — vertex normals mapped to RGB (geometry understanding)
 *   3d_solid  — flat Scholarly primary blue (#1e9df1)
 */

'use client';

import React, { useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid, Text } from '@react-three/drei';
import * as THREE from 'three';
import { evaluateSurface, computeZRange } from '@/lib/mathcanvas-evaluator';
import type { SurfaceDescriptor } from '@/types/mathcanvas';

// =============================================================================
// COLOUR GRADIENT UTILITY
// =============================================================================

type ColourScheme = '3d_heat' | '3d_depth' | '3d_normal' | '3d_solid';

function heatColour(t: number): [number, number, number] {
  // 0 → blue, 0.25 → cyan, 0.5 → green, 0.75 → yellow, 1 → red
  if (t < 0.25) {
    const s = t / 0.25;
    return [0, s, 1];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, 1, 1 - s];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [s, 1, 0];
  } else {
    const s = (t - 0.75) / 0.25;
    return [1, 1 - s, 0];
  }
}

function depthColour(t: number): [number, number, number] {
  // Dark navy (low) to Scholarly blue (#1e9df1) to white (high)
  const r = 0.118 + t * (0.882);
  const g = 0.612 + t * (0.388);
  const b = 0.945;
  return [r, g, b];
}

function buildVertexColours(
  vertices: Float32Array,
  scheme: ColourScheme,
  zMin: number,
  zMax: number
): Float32Array {
  const count = vertices.length / 3;
  const colours = new Float32Array(count * 3);
  const range = zMax - zMin || 1;

  for (let i = 0; i < count; i++) {
    const y = vertices[i * 3 + 1]; // Three.js y = mathematical z
    const t = Math.max(0, Math.min(1, (y - zMin) / range));

    let r: number, g: number, b: number;
    if (scheme === '3d_heat') {
      [r, g, b] = heatColour(t);
    } else if (scheme === '3d_depth') {
      [r, g, b] = depthColour(t);
    } else if (scheme === '3d_solid') {
      r = 0.118; g = 0.616; b = 0.945; // #1e9df1
    } else {
      // 3d_normal — will be overridden by normal mapping, use placeholder
      [r, g, b] = heatColour(t);
    }

    colours[i * 3]     = r;
    colours[i * 3 + 1] = g;
    colours[i * 3 + 2] = b;
  }
  return colours;
}

// =============================================================================
// SURFACE MESH COMPONENT
// =============================================================================

interface SurfaceMeshProps {
  surface: SurfaceDescriptor;
  paramOverrides: Record<string, number>;
  colorScheme: ColourScheme;
  wireframe: boolean;
  precomputedVertices?: Float32Array;
  precomputedResolution?: number;
}

function SurfaceMesh({ surface, paramOverrides, colorScheme, wireframe, precomputedVertices, precomputedResolution }: SurfaceMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  const geometry = useMemo(() => {
    let verts: Float32Array;
    let N: number;

    if (precomputedVertices && precomputedResolution) {
      verts = precomputedVertices;
      N = precomputedResolution;
    } else {
      const evaluated = evaluateSurface(surface, paramOverrides);
      if (!evaluated.valid || evaluated.vertices.length === 0) return null;
      verts = evaluated.vertices;
      N = evaluated.resolution;
    }

    const [zMin, zMax] = computeZRange(verts);

    // Build BufferGeometry with indexed triangles
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));

    // Build index buffer (two triangles per grid cell)
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

    // Vertex colours
    const colours = buildVertexColours(verts, colorScheme, zMin, zMax);
    geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));

    geo.computeVertexNormals();
    return geo;
  }, [surface, paramOverrides, colorScheme, precomputedVertices, precomputedResolution]);

  // Gentle idle rotation when not being interacted with
  useFrame((_state, delta) => {
    if (meshRef.current && !wireframe) {
      meshRef.current.rotation.y += delta * 0.05;
    }
  });

  if (!geometry) return null;

  return (
    <>
      <mesh ref={meshRef} geometry={geometry}>
        <meshPhongMaterial
          vertexColors={true}
          side={THREE.DoubleSide}
          shininess={40}
          specular={new THREE.Color(0x334466)}
          wireframe={false}
          transparent={false}
        />
      </mesh>
      {wireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial
            color={0x1e9df1}
            wireframe={true}
            opacity={0.3}
            transparent={true}
          />
        </mesh>
      )}
    </>
  );
}

// =============================================================================
// AXIS LABELS COMPONENT
// =============================================================================

function AxisLabels() {
  const axisLength = 5;
  return (
    <group>
      {/* X axis */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), axisLength, 0xef4444, 0.3, 0.15]} />
      <Text position={[axisLength + 0.4, 0, 0]} fontSize={0.35} color="#ef4444" anchorX="center">x</Text>
      {/* Y axis (= mathematical z) */}
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), axisLength, 0x10b981, 0.3, 0.15]} />
      <Text position={[0, axisLength + 0.4, 0]} fontSize={0.35} color="#10b981" anchorX="center">z</Text>
      {/* Z axis (= mathematical y) */}
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), axisLength, 0x6366f1, 0.3, 0.15]} />
      <Text position={[0, 0, axisLength + 0.4]} fontSize={0.35} color="#6366f1" anchorX="center">y</Text>
    </group>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export interface MathCanvas3DSurfaceProps {
  surface: SurfaceDescriptor;
  paramOverrides: Record<string, number>;
  colorScheme?: ColourScheme;
  className?: string;
  precomputedVertices?: Float32Array;
  precomputedResolution?: number;
}

export function MathCanvas3DSurface({
  surface,
  paramOverrides,
  colorScheme = '3d_heat',
  className = '',
  precomputedVertices,
  precomputedResolution,
}: MathCanvas3DSurfaceProps) {
  const [wireframe, setWireframe] = React.useState(false);
  const [showGrid, setShowGrid] = React.useState(true);

  return (
    <div className={`relative w-full h-full ${className}`} style={{ minHeight: 400 }}>
      {/* Control buttons overlay */}
      <div
        style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          display: 'flex',
          gap: 6,
        }}
      >
        <button
          onClick={() => setWireframe(w => !w)}
          style={{
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Open Sans, sans-serif',
            background: wireframe ? '#1e9df1' : '#ffffff',
            color: wireframe ? '#ffffff' : '#536471',
            border: '1px solid #e1eaef',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          {wireframe ? '⬛ Solid' : '▦ Wire'}
        </button>
        <button
          onClick={() => setShowGrid(g => !g)}
          style={{
            padding: '4px 10px',
            fontSize: 11,
            fontWeight: 600,
            fontFamily: 'Open Sans, sans-serif',
            background: showGrid ? '#1e9df1' : '#ffffff',
            color: showGrid ? '#ffffff' : '#536471',
            border: '1px solid #e1eaef',
            borderRadius: 6,
            cursor: 'pointer',
          }}
        >
          Grid
        </button>
      </div>

      {/* Interaction hint */}
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          fontSize: 10,
          color: '#8b99a4',
          fontFamily: 'Open Sans, sans-serif',
          background: 'rgba(255,255,255,0.85)',
          padding: '3px 10px',
          borderRadius: 99,
          border: '1px solid #e1eaef',
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        Drag to orbit · Scroll to zoom · Right-drag to pan
      </div>

      <Canvas
        camera={{ position: [8, 6, 8], fov: 45 }}
        style={{ background: '#f7f8f8', borderRadius: 8 }}
        dpr={typeof window !== 'undefined' ? Math.min(window.devicePixelRatio, 2) : 1}
      >
        {/* Lighting */}
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} color="#b8ddf8" />
        <pointLight position={[0, 10, 0]} intensity={0.5} color="#ecf3fd" />

        {/* Surface */}
        <SurfaceMesh
          surface={surface}
          paramOverrides={paramOverrides}
          colorScheme={colorScheme}
          wireframe={wireframe}
          precomputedVertices={precomputedVertices}
          precomputedResolution={precomputedResolution}
        />

        {/* Axes */}
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

        {/* Orbit Controls — from @react-three/drei, properly packaged */}
        <OrbitControls
          enableDamping={true}
          dampingFactor={0.08}
          minDistance={2}
          maxDistance={30}
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
      </Canvas>
    </div>
  );
}
