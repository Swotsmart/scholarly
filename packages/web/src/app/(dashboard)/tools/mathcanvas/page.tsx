/**
 * /tools/mathcanvas — MathCanvas Next.js Route
 *
 * Dynamic import of MathCanvasPage with ssr:false.
 * Three.js requires browser DOM + WebGL — cannot be server-rendered.
 * This thin wrapper keeps the route file clean.
 */

import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

const MathCanvasPage = dynamic(
  () => import('@/components/mathcanvas/MathCanvasPage'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          height: 'calc(100vh - 52px)',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f7f8f8',
          fontFamily: 'Open Sans, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <Loader2
            style={{
              width: 32,
              height: 32,
              color: '#1e9df1',
              margin: '0 auto 10px',
              animation: 'spin 1s linear infinite',
            }}
          />
          <div style={{ fontSize: 13, color: '#536471' }}>Loading MathCanvas…</div>
        </div>
      </div>
    ),
  }
);

export default function MathCanvasRoutePage() {
  return <MathCanvasPage />;
}
