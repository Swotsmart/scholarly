/**
 * Chekd Unified Communications 3.2 — HLS Streaming Service
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE BROADCAST TRUCK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * In a traditional TV broadcast, the studio produces a high-quality feed,
 * and a broadcast truck translates that feed into the format that can travel
 * over airwaves to millions of receivers. The receivers don't need to talk
 * back — they just tune in and watch.
 *
 * This service is that broadcast truck for the webinar. The panelists
 * produce WebRTC media (bi-directional, low-latency, but expensive per
 * connection). The HLS service takes that WebRTC feed and transcodes it
 * into HTTP Live Streaming (HLS) segments — small .ts video chunks and
 * an .m3u8 playlist that any browser can consume natively. This is how
 * we scale from 25 WebRTC panelists to 2,000 viewers without drowning
 * in peer connections.
 *
 * The adaptive bitrate ladder (360p/720p/1080p) lets viewers on poor
 * connections gracefully degrade to a lower quality rather than buffering.
 * The CDN integration distributes segments globally so a viewer in Sydney
 * gets the same latency as one in London.
 *
 * ffmpeg is the workhorse here — it ingests RTMP/RTP from the WebRTC SFU
 * and produces multi-quality HLS output in real time.
 */

import { EventEmitter } from 'events';
import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import type { Logger } from '../../../utils/logger';

// ─── Configuration ───────────────────────────────────────────────────────────

export interface HLSStreamConfig {
  /** Base directory for HLS segment output (default: /tmp/chekd-hls) */
  outputDir: string;

  /** Segment duration in seconds (default: 2 for low-latency) */
  segmentDurationSeconds: number;

  /** Number of segments in the playlist window (default: 5) */
  playlistSize: number;

  /** Delete old segments beyond the playlist window (default: true) */
  deleteOldSegments: boolean;

  /** CDN base URL for segment delivery (optional — if not set, serves locally) */
  cdnBaseUrl?: string;

  /** CDN upload function for segment push (optional) */
  cdnUploadFn?: (localPath: string, remotePath: string) => Promise<string>;

  /** Adaptive bitrate profiles to encode */
  bitrateProfiles: BitrateProfile[];

  /** Maximum target latency in seconds (default: 3) */
  maxLatencySeconds: number;

  /** ffmpeg binary path (default: 'ffmpeg' — assumes it's on PATH) */
  ffmpegPath: string;

  /** Enable LL-HLS (Low-Latency HLS) with partial segments (default: true) */
  lowLatencyEnabled: boolean;
}

export interface BitrateProfile {
  name: string;
  width: number;
  height: number;
  videoBitrate: string;    // e.g., '800k', '2500k', '5000k'
  audioBitrate: string;    // e.g., '64k', '128k', '192k'
  maxrate: string;         // e.g., '900k', '2700k', '5500k'
  bufsize: string;         // e.g., '1200k', '3500k', '7000k'
  profile: 'baseline' | 'main' | 'high';
  level: string;           // e.g., '3.0', '3.1', '4.0'
}

export const DEFAULT_BITRATE_PROFILES: BitrateProfile[] = [
  { name: '360p', width: 640, height: 360, videoBitrate: '800k', audioBitrate: '64k', maxrate: '900k', bufsize: '1200k', profile: 'baseline', level: '3.0' },
  { name: '720p', width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k', maxrate: '2700k', bufsize: '3500k', profile: 'main', level: '3.1' },
  { name: '1080p', width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k', maxrate: '5500k', bufsize: '7000k', profile: 'high', level: '4.0' },
];

export const DEFAULT_HLS_CONFIG: HLSStreamConfig = {
  outputDir: '/tmp/chekd-hls',
  segmentDurationSeconds: 2,
  playlistSize: 5,
  deleteOldSegments: true,
  cdnBaseUrl: undefined,
  bitrateProfiles: DEFAULT_BITRATE_PROFILES,
  maxLatencySeconds: 3,
  ffmpegPath: 'ffmpeg',
  lowLatencyEnabled: true,
};

// ─── Stream State ────────────────────────────────────────────────────────────

export interface HLSStreamState {
  webinarId: string;
  streamId: string;
  status: 'starting' | 'active' | 'stopping' | 'stopped' | 'error';
  inputUrl: string;
  masterPlaylistUrl: string;
  variantPlaylistUrls: Record<string, string>;
  segmentCount: number;
  startedAt?: Date;
  stoppedAt?: Date;
  errorMessage?: string;
  viewerCount: number;
  currentBitrateKbps: number;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  THE HLS STREAMING SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

export class HLSStreamingService extends EventEmitter {
  private config: HLSStreamConfig;
  private logger: Logger;

  /** Active ffmpeg processes keyed by webinarId */
  private processes: Map<string, ChildProcess> = new Map();

  /** Stream state for each webinar */
  private streams: Map<string, HLSStreamState> = new Map();

  /** Segment count watchers for monitoring */
  private segmentWatchers: Map<string, ReturnType<typeof setInterval>> = new Map();

  constructor(logger: Logger, config?: Partial<HLSStreamConfig>) {
    super();
    this.logger = logger;
    this.config = { ...DEFAULT_HLS_CONFIG, ...config };
  }

  // ─── Stream Lifecycle ──────────────────────────────────────────────────

  /**
   * Start transcoding a WebRTC source to HLS for a webinar.
   *
   * @param webinarId  - The webinar identifier
   * @param inputUrl   - The WebRTC-to-RTMP bridge URL (e.g., rtmp://localhost:1935/live/webinar-abc)
   *                     In production, the mediasoup SFU pipes to a local RTMP relay.
   * @returns The stream state with playlist URLs
   */
  async startStream(webinarId: string, inputUrl: string): Promise<HLSStreamState> {
    if (this.processes.has(webinarId)) {
      throw new Error(`Stream already active for webinar ${webinarId}`);
    }

    const streamId = `hls-${webinarId}-${Date.now()}`;
    const outputBase = path.join(this.config.outputDir, webinarId);

    // Ensure the output directory exists
    await fs.promises.mkdir(outputBase, { recursive: true });

    const state: HLSStreamState = {
      webinarId,
      streamId,
      status: 'starting',
      inputUrl,
      masterPlaylistUrl: '',
      variantPlaylistUrls: {},
      segmentCount: 0,
      viewerCount: 0,
      currentBitrateKbps: 0,
    };
    this.streams.set(webinarId, state);

    // Build ffmpeg command arguments for multi-bitrate HLS output
    const args = this.buildFFmpegArgs(inputUrl, outputBase);

    try {
      const proc = spawn(this.config.ffmpegPath, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.processes.set(webinarId, proc);

      proc.stderr?.on('data', (data: Buffer) => {
        const line = data.toString().trim();
        // Extract encoding progress stats from ffmpeg output
        if (line.includes('frame=') || line.includes('speed=')) {
          this.parseFFmpegProgress(webinarId, line);
        }
      });

      proc.on('error', (err) => {
        state.status = 'error';
        state.errorMessage = err.message;
        this.logger.error(`ffmpeg process error for ${webinarId}: ${err.message}`);
        this.emit('stream:error', { webinarId, error: err.message });
        this.cleanup(webinarId);
      });

      proc.on('exit', (code, signal) => {
        if (state.status !== 'stopping') {
          state.status = code === 0 ? 'stopped' : 'error';
          if (code !== 0) {
            state.errorMessage = `ffmpeg exited with code ${code} (signal: ${signal})`;
            this.logger.error(`ffmpeg unexpected exit for ${webinarId}: code=${code}, signal=${signal}`);
          }
        }
        state.stoppedAt = new Date();
        this.cleanup(webinarId);
        this.emit('stream:stopped', { webinarId, code, signal });
      });

      // Wait for the master playlist to appear (ffmpeg takes a moment to start writing)
      await this.waitForPlaylist(outputBase, 10000);

      // Build playlist URLs
      const baseUrl = this.config.cdnBaseUrl || `/hls/${webinarId}`;
      state.masterPlaylistUrl = `${baseUrl}/master.m3u8`;
      for (const profile of this.config.bitrateProfiles) {
        state.variantPlaylistUrls[profile.name] = `${baseUrl}/${profile.name}/stream.m3u8`;
      }

      state.status = 'active';
      state.startedAt = new Date();

      // Start segment monitoring
      this.startSegmentMonitor(webinarId, outputBase);

      // If CDN upload function is provided, start uploading segments
      if (this.config.cdnUploadFn) {
        this.startCDNUpload(webinarId, outputBase);
      }

      this.logger.info(`HLS stream started for ${webinarId}: ${state.masterPlaylistUrl}`);
      this.emit('stream:started', { webinarId, streamId, masterPlaylistUrl: state.masterPlaylistUrl });

      return state;
    } catch (err) {
      state.status = 'error';
      state.errorMessage = String(err);
      this.processes.delete(webinarId);
      throw err;
    }
  }

  /**
   * Stop the HLS stream for a webinar (graceful shutdown of ffmpeg).
   */
  async stopStream(webinarId: string): Promise<void> {
    const proc = this.processes.get(webinarId);
    const state = this.streams.get(webinarId);

    if (!proc || !state) {
      this.logger.warn(`No active stream to stop for ${webinarId}`);
      return;
    }

    state.status = 'stopping';

    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        this.logger.warn(`ffmpeg did not exit gracefully for ${webinarId}, sending SIGKILL`);
        proc.kill('SIGKILL');
        resolve();
      }, 5000);

      proc.on('exit', () => {
        clearTimeout(timeout);
        state.status = 'stopped';
        state.stoppedAt = new Date();
        resolve();
      });

      // Send 'q' to ffmpeg's stdin for graceful quit
      proc.stdin?.write('q');
      proc.stdin?.end();
    });
  }

  /**
   * Stop all active streams (platform shutdown).
   */
  async stopAll(): Promise<void> {
    const ids = [...this.processes.keys()];
    for (const id of ids) {
      await this.stopStream(id);
    }
  }

  // ─── State Access ──────────────────────────────────────────────────────

  getStreamState(webinarId: string): HLSStreamState | undefined {
    return this.streams.get(webinarId);
  }

  getActiveStreamCount(): number {
    return this.processes.size;
  }

  updateViewerCount(webinarId: string, count: number): void {
    const state = this.streams.get(webinarId);
    if (state) state.viewerCount = count;
  }

  // ─── ffmpeg Command Builder ────────────────────────────────────────────
  //
  // This builds a single ffmpeg command that takes one input and produces
  // multiple HLS outputs at different quality levels. Think of it as a
  // prism splitting white light into a spectrum — one input, many outputs.

  private buildFFmpegArgs(inputUrl: string, outputBase: string): string[] {
    const args: string[] = [
      // Input
      '-re',                           // Read input at native frame rate
      '-i', inputUrl,                  // Input URL (RTMP/RTP)

      // Global encoding settings
      '-c:a', 'aac',                   // AAC audio codec
      '-ar', '48000',                  // 48kHz audio sample rate
      '-c:v', 'libx264',              // H.264 video codec
      '-g', '48',                      // Keyframe interval (2s at 24fps)
      '-keyint_min', '48',             // Minimum keyframe interval
      '-sc_threshold', '0',            // Disable scene change detection
      '-preset', 'veryfast',           // Encoding speed (prioritise latency)
      '-tune', 'zerolatency',         // Zero-latency tuning
    ];

    // Add each bitrate variant
    for (let i = 0; i < this.config.bitrateProfiles.length; i++) {
      const p = this.config.bitrateProfiles[i];
      const variantDir = path.join(outputBase, p.name);

      // Ensure variant directory exists (sync is fine — this runs once at start)
      fs.mkdirSync(variantDir, { recursive: true });

      args.push(
        // Map to output
        '-map', '0:v:0', '-map', '0:a:0',

        // Video encoding for this variant
        `-c:v:${i}`, 'libx264',
        `-b:v:${i}`, p.videoBitrate,
        `-maxrate:v:${i}`, p.maxrate,
        `-bufsize:v:${i}`, p.bufsize,
        `-profile:v:${i}`, p.profile,
        `-level:v:${i}`, p.level,
        `-s:v:${i}`, `${p.width}x${p.height}`,

        // Audio encoding for this variant
        `-b:a:${i}`, p.audioBitrate,
      );
    }

    // HLS output settings
    args.push(
      '-f', 'hls',
      '-hls_time', String(this.config.segmentDurationSeconds),
      '-hls_list_size', String(this.config.playlistSize),
      '-hls_flags', this.config.deleteOldSegments ? 'delete_segments+independent_segments' : 'independent_segments',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', path.join(outputBase, '%v', 'segment_%05d.ts'),
      '-master_pl_name', 'master.m3u8',
    );

    // Add variant stream map
    const varMap = this.config.bitrateProfiles.map((_, i) => `v:${i},a:${i}`).join(' ');
    args.push('-var_stream_map', varMap);

    // Output path pattern
    args.push(path.join(outputBase, '%v', 'stream.m3u8'));

    return args;
  }

  // ─── Helper Methods ────────────────────────────────────────────────────

  private async waitForPlaylist(outputBase: string, timeoutMs: number): Promise<void> {
    const masterPath = path.join(outputBase, 'master.m3u8');
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      try {
        await fs.promises.access(masterPath, fs.constants.F_OK);
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 250));
      }
    }

    throw new Error(`Master playlist not created within ${timeoutMs}ms`);
  }

  private startSegmentMonitor(webinarId: string, outputBase: string): void {
    const watcher = setInterval(() => {
      const state = this.streams.get(webinarId);
      if (!state || state.status !== 'active') return;

      // Count total segments across all variants
      let totalSegments = 0;
      for (const profile of this.config.bitrateProfiles) {
        const variantDir = path.join(outputBase, profile.name);
        try {
          const files = fs.readdirSync(variantDir).filter((f) => f.endsWith('.ts'));
          totalSegments += files.length;
        } catch {
          // Directory may not exist yet
        }
      }
      state.segmentCount = totalSegments;
    }, 5000);

    this.segmentWatchers.set(webinarId, watcher);
  }

  private startCDNUpload(webinarId: string, outputBase: string): void {
    if (!this.config.cdnUploadFn) return;

    const uploadedSegments = new Set<string>();
    const uploadFn = this.config.cdnUploadFn;

    const watcher = setInterval(async () => {
      for (const profile of this.config.bitrateProfiles) {
        const variantDir = path.join(outputBase, profile.name);
        try {
          const files = fs.readdirSync(variantDir);
          for (const file of files) {
            const localPath = path.join(variantDir, file);
            const remotePath = `${webinarId}/${profile.name}/${file}`;
            if (!uploadedSegments.has(localPath)) {
              try {
                await uploadFn(localPath, remotePath);
                uploadedSegments.add(localPath);
              } catch (err) {
                this.logger.warn(`CDN upload failed for ${remotePath}: ${err}`);
              }
            }
          }
        } catch {
          // Directory may not exist yet
        }
      }
    }, 1000);

    // Store watcher for cleanup (reuse the same map with a namespaced key)
    this.segmentWatchers.set(`cdn-${webinarId}`, watcher);
  }

  private parseFFmpegProgress(webinarId: string, line: string): void {
    const state = this.streams.get(webinarId);
    if (!state) return;

    const bitrateMatch = line.match(/bitrate=\s*([\d.]+)kbits\/s/);
    if (bitrateMatch) {
      state.currentBitrateKbps = parseFloat(bitrateMatch[1]);
    }
  }

  private cleanup(webinarId: string): void {
    this.processes.delete(webinarId);

    const segWatcher = this.segmentWatchers.get(webinarId);
    if (segWatcher) { clearInterval(segWatcher); this.segmentWatchers.delete(webinarId); }

    const cdnWatcher = this.segmentWatchers.get(`cdn-${webinarId}`);
    if (cdnWatcher) { clearInterval(cdnWatcher); this.segmentWatchers.delete(`cdn-${webinarId}`); }
  }

  /**
   * Remove all HLS output files for a webinar. Call after the stream
   * is fully stopped and the recording has been archived elsewhere.
   */
  async cleanupFiles(webinarId: string): Promise<void> {
    const outputBase = path.join(this.config.outputDir, webinarId);
    try {
      await fs.promises.rm(outputBase, { recursive: true, force: true });
      this.streams.delete(webinarId);
      this.logger.info(`Cleaned up HLS files for ${webinarId}`);
    } catch (err) {
      this.logger.warn(`Failed to cleanup HLS files for ${webinarId}: ${err}`);
    }
  }

  /**
   * Destroy all streams and watchers — for use in tests and shutdown.
   */
  async destroy(): Promise<void> {
    await this.stopAll();
    for (const [, watcher] of this.segmentWatchers) clearInterval(watcher);
    this.segmentWatchers.clear();
    this.streams.clear();
  }
}

export default HLSStreamingService;
