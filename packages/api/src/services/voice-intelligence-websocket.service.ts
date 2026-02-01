/**
 * Voice Intelligence WebSocket Service
 *
 * Real-time bidirectional voice communication for conversational agents.
 * Handles WebSocket connections between learners and ElevenLabs agents.
 *
 * @module VoiceWebSocketService
 */

import { Server as HTTPServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import { log } from '../lib/logger';
import { voiceIntelligenceService } from './voice-intelligence.service';

// ============================================================================
// MESSAGE TYPES
// ============================================================================

export type ClientMessage =
  | { type: 'session.start'; sessionId: string; audioConfig?: AudioConfig }
  | { type: 'session.stop'; sessionId: string; reason?: string }
  | { type: 'session.config'; sessionId: string; config: SessionConfig }
  | { type: 'session.interrupt'; sessionId: string }
  | { type: 'ping'; timestamp: number };

export type ServerMessage =
  | { type: 'session.ready'; sessionId: string; agentId: string; agentName: string }
  | { type: 'turn.start'; sessionId: string; speaker: 'learner' | 'agent'; turnId: string; sequence: number }
  | { type: 'turn.end'; sessionId: string; speaker: 'learner' | 'agent'; turnId: string; durationMs: number }
  | { type: 'transcript'; sessionId: string; turnId: string; speaker: string; text: string; isFinal: boolean }
  | { type: 'assessment'; sessionId: string; turnId: string; pronunciationScore?: number; issues?: any[] }
  | { type: 'pronunciation.feedback'; sessionId: string; turnId: string; word: string; score: number; suggestion: string }
  | { type: 'agent.state'; sessionId: string; state: 'listening' | 'thinking' | 'speaking' | 'waiting' }
  | { type: 'session.end'; sessionId: string; reason: string; summary: SessionSummary }
  | { type: 'pong'; timestamp: number; serverTimestamp: number; latencyMs: number }
  | { type: 'error'; code: string; message: string; sessionId?: string; recoverable: boolean };

interface AudioConfig {
  format: string;
  sampleRate: number;
  channels: number;
}

interface SessionConfig {
  vadSensitivity?: number;
  interruptionThreshold?: number;
  turnTimeout?: number;
  pronunciationFeedback?: boolean;
}

interface SessionSummary {
  durationMs: number;
  turnCount: number;
  averagePronunciation?: number;
  averageGrammar?: number;
  averageFluency?: number;
  topIssues: string[];
  competenciesUpdated: string[];
}

// ============================================================================
// SESSION TRACKING
// ============================================================================

interface ActiveSession {
  sessionId: string;
  tenantId: string;
  learnerId: string;
  agentId: string;
  clientWs: WebSocket;
  elevenLabsWs: WebSocket | null;
  state: 'connecting' | 'ready' | 'learner_speaking' | 'agent_speaking' | 'paused' | 'ending' | 'closed';
  turns: TurnData[];
  currentTurn: TurnData | null;
  startedAt: Date;
  lastActivityAt: Date;
  audioBuffer: Buffer[];
  metrics: SessionMetrics;
}

interface TurnData {
  turnId: string;
  speaker: 'learner' | 'agent';
  sequence: number;
  startedAt: Date;
  endedAt?: Date;
  transcriptParts: string[];
  finalTranscript?: string;
  assessment?: {
    pronunciationScore?: number;
    grammarScore?: number;
    fluencyScore?: number;
  };
}

interface SessionMetrics {
  totalAudioBytesReceived: number;
  totalAudioBytesSent: number;
  turnCount: number;
  learnerSpeakingTimeMs: number;
  agentSpeakingTimeMs: number;
  latencySamples: number[];
}

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

export interface VoiceWebSocketConfig {
  maxSessionsPerTenant: number;
  maxSessionDurationMs: number;
  heartbeatIntervalMs: number;
  inactivityTimeoutMs: number;
  maxAudioBufferSize: number;
  pathPrefix: string;
}

const DEFAULT_CONFIG: VoiceWebSocketConfig = {
  maxSessionsPerTenant: 50,
  maxSessionDurationMs: 30 * 60 * 1000,
  heartbeatIntervalMs: 30_000,
  inactivityTimeoutMs: 120_000,
  maxAudioBufferSize: 1024 * 1024,
  pathPrefix: '/ws/voice',
};

interface ConnectionAuth {
  tenantId: string;
  learnerId: string;
  sessionId?: string;
  permissions: string[];
}

export class VoiceWebSocketServer {
  private wss: WebSocketServer;
  private activeSessions: Map<string, ActiveSession> = new Map();
  private tenantSessionCounts: Map<string, number> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private inactivityCheckInterval: NodeJS.Timeout | null = null;
  private config: VoiceWebSocketConfig;

  constructor(config: Partial<VoiceWebSocketConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.wss = new WebSocketServer({ noServer: true });
  }

  /**
   * Attach to an HTTP server
   */
  attachToServer(httpServer: HTTPServer): void {
    httpServer.on('upgrade', async (request: IncomingMessage, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);

      if (!url.pathname.startsWith(this.config.pathPrefix)) {
        return; // Not our path
      }

      try {
        const auth = await this.authenticateConnection(request);
        if (!auth) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Check tenant limits
        const currentCount = this.tenantSessionCounts.get(auth.tenantId) || 0;
        if (currentCount >= this.config.maxSessionsPerTenant) {
          socket.write('HTTP/1.1 429 Too Many Requests\r\n\r\n');
          socket.destroy();
          return;
        }

        this.wss.handleUpgrade(request, socket, head, (ws) => {
          this.wss.emit('connection', ws, request, auth);
        });
      } catch (error) {
        log.error('WebSocket upgrade failed', error as Error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, _request: IncomingMessage, auth: ConnectionAuth) => {
      this.handleConnection(ws, auth);
    });

    this.setupHeartbeat();
    this.setupInactivityCheck();

    log.info('Voice WebSocket server attached', {
      path: this.config.pathPrefix,
      maxSessionsPerTenant: this.config.maxSessionsPerTenant,
    });
  }

  /**
   * Get server statistics
   */
  getStats(): {
    totalActiveSessions: number;
    sessionsByTenant: Record<string, number>;
    sessionsByState: Record<string, number>;
  } {
    const sessions = Array.from(this.activeSessions.values());
    return {
      totalActiveSessions: sessions.length,
      sessionsByTenant: Object.fromEntries(this.tenantSessionCounts),
      sessionsByState: sessions.reduce((acc, s) => {
        acc[s.state] = (acc[s.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    log.info('Shutting down Voice WebSocket server', {
      activeSessions: this.activeSessions.size,
    });

    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.inactivityCheckInterval) clearInterval(this.inactivityCheckInterval);

    // End all sessions
    const endPromises = Array.from(this.activeSessions.values()).map(session =>
      this.endSession(session, 'completed').catch(err =>
        log.error('Error ending session during shutdown', err as Error)
      )
    );
    await Promise.allSettled(endPromises);

    this.wss.close();
    log.info('Voice WebSocket server shut down complete');
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private async authenticateConnection(request: IncomingMessage): Promise<ConnectionAuth | null> {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    const token = request.headers.authorization?.replace('Bearer ', '') ||
      url.searchParams.get('token');

    if (!token) {
      log.warn('WebSocket connection without auth token');
      return null;
    }

    try {
      // For demo, decode base64 JSON token
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      if (!decoded.tenantId || !decoded.learnerId) return null;

      const pathParts = url.pathname.replace(this.config.pathPrefix, '').split('/').filter(Boolean);
      const sessionId = pathParts[0] || url.searchParams.get('sessionId');

      return {
        tenantId: decoded.tenantId,
        learnerId: decoded.learnerId,
        sessionId: sessionId || undefined,
        permissions: decoded.permissions || ['voice:conversation'],
      };
    } catch {
      log.warn('WebSocket auth token validation failed');
      return null;
    }
  }

  private handleConnection(ws: WebSocket, auth: ConnectionAuth): void {
    log.info('WebSocket client connected', {
      tenantId: auth.tenantId,
      learnerId: auth.learnerId,
    });

    ws.on('message', async (data: Buffer | string, isBinary: boolean) => {
      try {
        if (isBinary) {
          await this.handleAudioData(ws, auth, data as Buffer);
        } else {
          const message = JSON.parse(data.toString()) as ClientMessage;
          await this.handleControlMessage(ws, auth, message);
        }
      } catch (error) {
        log.error('Error handling WebSocket message', error as Error);
        this.sendMessage(ws, {
          type: 'error',
          code: 'MESSAGE_PROCESSING_ERROR',
          message: 'Failed to process message',
          recoverable: true,
        });
      }
    });

    ws.on('close', (code: number, reason: Buffer) => {
      this.handleDisconnect(auth, code, reason.toString());
    });

    ws.on('error', (error: Error) => {
      log.error('WebSocket error', error, { tenantId: auth.tenantId });
    });

    // Auto-start if session ID provided
    if (auth.sessionId) {
      this.handleControlMessage(ws, auth, {
        type: 'session.start',
        sessionId: auth.sessionId,
      }).catch(err => log.error('Auto-start session failed', err as Error));
    }
  }

  private async handleControlMessage(ws: WebSocket, auth: ConnectionAuth, message: ClientMessage): Promise<void> {
    switch (message.type) {
      case 'session.start':
        await this.handleSessionStart(ws, auth, message);
        break;

      case 'session.stop':
        await this.handleSessionStop(auth, message);
        break;

      case 'ping':
        this.sendMessage(ws, {
          type: 'pong',
          timestamp: message.timestamp,
          serverTimestamp: Date.now(),
          latencyMs: Date.now() - message.timestamp,
        });
        break;

      default:
        log.warn('Unknown WebSocket message type', { type: (message as any).type });
    }
  }

  private async handleSessionStart(
    ws: WebSocket,
    auth: ConnectionAuth,
    message: { sessionId: string; audioConfig?: AudioConfig }
  ): Promise<void> {
    const { sessionId } = message;

    if (this.activeSessions.has(sessionId)) {
      this.sendMessage(ws, {
        type: 'error',
        code: 'SESSION_ALREADY_ACTIVE',
        message: 'Session is already active',
        sessionId,
        recoverable: false,
      });
      return;
    }

    // Start session via service
    const sessionResult = await voiceIntelligenceService.startConversationSession(
      auth.tenantId,
      sessionId,
      auth.learnerId,
      {}
    );

    if (!sessionResult.success) {
      this.sendMessage(ws, {
        type: 'error',
        code: 'SESSION_START_FAILED',
        message: sessionResult.error?.message || 'Failed to start session',
        sessionId,
        recoverable: false,
      });
      return;
    }

    const session = sessionResult.data!;

    const activeSession: ActiveSession = {
      sessionId,
      tenantId: auth.tenantId,
      learnerId: auth.learnerId,
      agentId: session.agentId,
      clientWs: ws,
      elevenLabsWs: null,
      state: 'ready',
      turns: [],
      currentTurn: null,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      audioBuffer: [],
      metrics: {
        totalAudioBytesReceived: 0,
        totalAudioBytesSent: 0,
        turnCount: 0,
        learnerSpeakingTimeMs: 0,
        agentSpeakingTimeMs: 0,
        latencySamples: [],
      },
    };

    this.activeSessions.set(sessionId, activeSession);

    const count = this.tenantSessionCounts.get(auth.tenantId) || 0;
    this.tenantSessionCounts.set(auth.tenantId, count + 1);

    this.sendMessage(ws, {
      type: 'session.ready',
      sessionId,
      agentId: session.agentId,
      agentName: 'Conversation Agent',
    });

    log.info('Conversation session started', {
      sessionId,
      tenantId: auth.tenantId,
    });
  }

  private async handleSessionStop(
    auth: ConnectionAuth,
    message: { sessionId: string; reason?: string }
  ): Promise<void> {
    const session = this.activeSessions.get(message.sessionId);
    if (!session) return;

    await this.endSession(session, 'user_ended');
  }

  private async handleAudioData(ws: WebSocket, auth: ConnectionAuth, data: Buffer): Promise<void> {
    const session = this.findSessionByClient(ws);
    if (!session) {
      this.sendMessage(ws, {
        type: 'error',
        code: 'NO_ACTIVE_SESSION',
        message: 'No active session',
        recoverable: true,
      });
      return;
    }

    session.lastActivityAt = new Date();
    session.metrics.totalAudioBytesReceived += data.length;

    // Detect learner speaking
    if (session.state !== 'learner_speaking') {
      session.state = 'learner_speaking';
      this.startTurn(session, 'learner');

      this.sendMessage(session.clientWs, {
        type: 'agent.state',
        sessionId: session.sessionId,
        state: 'listening',
      });
    }

    // Buffer audio for processing
    session.audioBuffer.push(data);
    if (session.audioBuffer.reduce((sum, b) => sum + b.length, 0) > this.config.maxAudioBufferSize) {
      session.audioBuffer.splice(0, Math.floor(session.audioBuffer.length / 2));
    }
  }

  private startTurn(session: ActiveSession, speaker: 'learner' | 'agent'): void {
    if (session.currentTurn) {
      this.endCurrentTurn(session);
    }

    const turnId = `turn_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    const sequence = session.turns.length + 1;

    session.currentTurn = {
      turnId,
      speaker,
      sequence,
      startedAt: new Date(),
      transcriptParts: [],
    };

    session.metrics.turnCount++;

    this.sendMessage(session.clientWs, {
      type: 'turn.start',
      sessionId: session.sessionId,
      speaker,
      turnId,
      sequence,
    });
  }

  private endCurrentTurn(session: ActiveSession): void {
    const turn = session.currentTurn;
    if (!turn) return;

    turn.endedAt = new Date();
    turn.finalTranscript = turn.transcriptParts.join(' ');

    const durationMs = turn.endedAt.getTime() - turn.startedAt.getTime();

    if (turn.speaker === 'learner') {
      session.metrics.learnerSpeakingTimeMs += durationMs;
    } else {
      session.metrics.agentSpeakingTimeMs += durationMs;
    }

    session.turns.push(turn);
    session.currentTurn = null;

    this.sendMessage(session.clientWs, {
      type: 'turn.end',
      sessionId: session.sessionId,
      speaker: turn.speaker,
      turnId: turn.turnId,
      durationMs,
    });
  }

  private async endSession(
    session: ActiveSession,
    reason: 'completed' | 'timeout' | 'error' | 'user_ended'
  ): Promise<void> {
    if (session.state === 'closed') return;

    session.state = 'ending';

    if (session.currentTurn) {
      this.endCurrentTurn(session);
    }

    const durationMs = Date.now() - session.startedAt.getTime();

    const summary: SessionSummary = {
      durationMs,
      turnCount: session.turns.length,
      topIssues: [],
      competenciesUpdated: [],
    };

    this.sendMessage(session.clientWs, {
      type: 'session.end',
      sessionId: session.sessionId,
      reason,
      summary,
    });

    await voiceIntelligenceService.endConversationSession(
      session.tenantId,
      session.sessionId,
      session.learnerId
    ).catch(err => log.error('Error ending session in service', err as Error));

    this.activeSessions.delete(session.sessionId);
    const tenantCount = (this.tenantSessionCounts.get(session.tenantId) || 1) - 1;
    if (tenantCount <= 0) {
      this.tenantSessionCounts.delete(session.tenantId);
    } else {
      this.tenantSessionCounts.set(session.tenantId, tenantCount);
    }

    session.state = 'closed';

    log.info('Conversation session ended', {
      sessionId: session.sessionId,
      reason,
      durationMs,
      turnCount: session.turns.length,
    });
  }

  private handleDisconnect(auth: ConnectionAuth, code: number, reason: string): void {
    log.info('WebSocket client disconnected', {
      tenantId: auth.tenantId,
      code,
      reason,
    });

    for (const [sessionId, session] of this.activeSessions) {
      if (session.tenantId === auth.tenantId && session.learnerId === auth.learnerId) {
        this.endSession(session, 'user_ended').catch(err =>
          log.error('Error ending session on disconnect', err as Error)
        );
      }
    }
  }

  private findSessionByClient(ws: WebSocket): ActiveSession | undefined {
    for (const session of this.activeSessions.values()) {
      if (session.clientWs === ws) return session;
    }
    return undefined;
  }

  private sendMessage(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const session of this.activeSessions.values()) {
        if (session.clientWs.readyState === WebSocket.OPEN) {
          session.clientWs.ping();
        }
      }
    }, this.config.heartbeatIntervalMs);
  }

  private setupInactivityCheck(): void {
    this.inactivityCheckInterval = setInterval(() => {
      const now = Date.now();

      for (const session of this.activeSessions.values()) {
        if (now - session.lastActivityAt.getTime() > this.config.inactivityTimeoutMs) {
          log.info('Ending inactive session', { sessionId: session.sessionId });
          this.endSession(session, 'timeout').catch(err =>
            log.error('Error ending inactive session', err as Error)
          );
        }

        if (now - session.startedAt.getTime() > this.config.maxSessionDurationMs) {
          log.info('Ending max duration session', { sessionId: session.sessionId });
          this.endSession(session, 'timeout').catch(err =>
            log.error('Error ending max-duration session', err as Error)
          );
        }
      }
    }, 10_000);
  }
}

// Export singleton
export const voiceWebSocketServer = new VoiceWebSocketServer();
