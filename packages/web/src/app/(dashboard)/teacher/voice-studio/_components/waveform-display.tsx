'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface QualityMetrics {
  loudness: string;
  loudnessValue: number;
  snr: string;
  snrValue: number;
  pace: string;
  peak: string;
  duration: string;
}

interface WaveformDisplayProps {
  audioBase64: string;
  format: string;
  label: string;
  metrics?: QualityMetrics;
  className?: string;
}

function qualityBadgeVariant(metric: 'loudness' | 'snr', value: number): 'success' | 'warning' | 'destructive' {
  if (metric === 'loudness') {
    if (value >= -16 && value <= -14) return 'success';
    if (value >= -20 && value <= -12) return 'warning';
    return 'destructive';
  }
  if (value >= 30) return 'success';
  if (value >= 15) return 'warning';
  return 'destructive';
}

export function WaveformDisplay({ audioBase64, format, label, metrics, className }: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!audioBase64 || !canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = async () => {
      try {
        // Decode base64 to ArrayBuffer
        const binaryString = atob(audioBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const audioCtx = new AudioContext();
        const buffer = await audioCtx.decodeAudioData(bytes.buffer);
        const channelData = buffer.getChannelData(0);
        audioCtx.close();

        // HiDPI support
        const dpr = window.devicePixelRatio || 1;
        const width = container.clientWidth;
        const height = 80;
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.scale(dpr, dpr);

        // Downsample to bars
        const barCount = Math.min(200, Math.floor(width / 3));
        const samplesPerBar = Math.floor(channelData.length / barCount);
        const bars: number[] = [];

        for (let i = 0; i < barCount; i++) {
          let max = 0;
          const start = i * samplesPerBar;
          for (let j = start; j < start + samplesPerBar && j < channelData.length; j++) {
            const abs = Math.abs(channelData[j]);
            if (abs > max) max = abs;
          }
          bars.push(max);
        }

        // Normalise bars to 0-1
        const maxBar = Math.max(...bars, 0.01);
        const normalised = bars.map(b => b / maxBar);

        // Draw
        ctx.clearRect(0, 0, width, height);
        const midY = height / 2;
        const barWidth = width / barCount;
        const gap = Math.max(1, barWidth * 0.15);

        // Get computed style for theming
        const style = getComputedStyle(document.documentElement);
        const primaryHsl = style.getPropertyValue('--primary').trim();
        const mutedHsl = style.getPropertyValue('--muted').trim();

        normalised.forEach((amp, i) => {
          const barH = amp * (midY - 2);
          const x = i * barWidth;
          const w = barWidth - gap;

          // Upper half
          ctx.fillStyle = primaryHsl ? `hsl(${primaryHsl} / 0.7)` : 'hsl(262 80% 50% / 0.7)';
          ctx.fillRect(x, midY - barH, w, barH);

          // Lower half (mirror)
          ctx.fillStyle = mutedHsl ? `hsl(${mutedHsl})` : 'hsl(262 80% 50% / 0.2)';
          ctx.fillRect(x, midY, w, barH * 0.6);
        });

        // Center line
        ctx.fillStyle = primaryHsl ? `hsl(${primaryHsl} / 0.3)` : 'hsl(262 80% 50% / 0.3)';
        ctx.fillRect(0, midY - 0.5, width, 1);

        setError(null);
      } catch {
        setError('Could not decode audio for waveform');
      }
    };

    draw();
  }, [audioBase64, format]);

  return (
    <div className={cn('rounded-lg border p-4 space-y-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        {metrics && (
          <div className="flex gap-2">
            <Badge variant={qualityBadgeVariant('loudness', metrics.loudnessValue)} className="text-xs">
              {metrics.loudness}
            </Badge>
            <Badge variant={qualityBadgeVariant('snr', metrics.snrValue)} className="text-xs">
              SNR {metrics.snr}
            </Badge>
            <Badge variant="outline" className="text-xs">{metrics.peak}</Badge>
            <Badge variant="outline" className="text-xs">{metrics.pace}</Badge>
          </div>
        )}
      </div>

      <div ref={containerRef} className="w-full">
        {error ? (
          <div className="h-20 flex items-center justify-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : (
          <canvas ref={canvasRef} className="w-full rounded" />
        )}
      </div>

      {metrics?.duration && (
        <div className="text-xs text-muted-foreground text-right">{metrics.duration}</div>
      )}
    </div>
  );
}
