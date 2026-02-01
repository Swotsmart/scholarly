/**
 * Voice Intelligence WebSocket Handlers
 * 
 * Real-time bidirectional voice communication infrastructure for conversational
 * agents. If the VoiceIntelligenceService is the "brain" that understands how
 * to process speech and generate responses, this WebSocket layer is the "nervous
 * system" — the high-speed conduit that carries audio signals back and forth
 * between the learner's microphone/speaker and the ElevenLabs conversational
 * agent in real time.
 * 
 * ## Why WebSockets?
 * 
 * HTTP request/response is like sending letters — perfectly fine for ordering
 * a book or checking a price, but hopeless for a conversation. When a learner
 * is practising French with an AI conversation partner, they need the same
 * immediacy as a phone call: their voice goes up, the agent's voice comes back,
 * and the whole thing feels natural. WebSockets provide that persistent,
 * bidirectional channel — a phone line that stays open for the duration of
 * the conversation.
 * 
 * ## Architecture
 * 
 * ```
 *  Learner Browser                    Scholarly Server                 ElevenLabs
 *  ┌────────────┐                    ┌─────────────────┐              ┌──────────┐
 *  │  Mic Input  │─── audio chunks ──▶│  WebSocket      │── forward ──▶│  Agent   │
 *  │            │                    │  Handler        │              │  API     │
 *  │  Speaker   │◀── audio chunks ──│  (this file)    │◀── reply ───│          │
 *  └────────────┘                    └─────────────────┘              └──────────┘
 *        │                                  │
 *        │                            ┌─────┴──────┐
 *        │                            │ Session     │
 *        │                            │ Manager     │
 *        │                            │ - Auth      │
 *        │                            │ - Turns     │
 *        │                            │ - Analytics │
 *        │                            │ - Oversight │
 *        │                            └────────────┘
 *        │
 *        ▼
 *  Real-time pronunciation feedback, turn tracking, 
 *  competency updates — all flowing through this pipe
 * ```
 * 
 * ## Message Protocol
 * 
 * All messages are JSON-encoded (control) or raw binary (audio). The protocol
 * distinguishes between the two using WebSocket frame types:
 * - Text frames → JSON control messages  
 * - Binary frames → PCM16/opus audio data
 * 
 * @module VoiceIntelligenceWebSocket
 */

import { Server as HTTPServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { URL } from 'url';
import {
  VoiceIntelligenceService,
  ConversationSession,
  ConversationTurn,
  SessionAssessmentData,
  ElevenLabsConfig,
  AudioFormat,
} from './voice-intelligence_service';
import { Result, Logger, EventBus } from '../shared/types';

// ============================================================================
// WEBSOCKET MESSAGE TYPES
// ============================================================================

/**
 * Client-to-server control messages
 * 
 * Think of these as the "gestures" in a conversation — nodding, raising a hand,
 * clearing your throat — signals that aren't speech but control the flow.
 */
export type ClientMessage =
  | ClientStartMessage
  | ClientStopMessage
  | ClientConfigMessage
  | ClientInterruptMessage
  | ClientPingMessage
  | ClientTranscriptRequestMessage;

export interface ClientStartMessage {
  type: 'session.start';
  sessionId: string;
  audioConfig?: {
    format: AudioFormat;
    sampleRate: number;
    channels: number;
  };
}

export interface ClientStopMessage {
  type: 'session.stop';
  sessionId: string;
  reason?: 'user_ended' | 'timeout' | 'error';
}

export interface ClientConfigMessage {
  type: 'session.config';
  sessionId: string;
  config: {
    vadSensitivity?: number;       // Voice Activity Detection threshold (0-1)
    interruptionThreshold?: number; // How easily learner can interrupt agent (0-1)
    turnTimeout?: number;          // Max silence before agent responds (ms)
    pronunciationFeedback?: boolean;
  };
}

export interface ClientInterruptMessage {
  type: 'session.interrupt';
  sessionId: string;
}

export interface ClientPingMessage {
  type: 'ping';
  timestamp: number;
}

export interface ClientTranscriptRequestMessage {
  type: 'session.transcript';
  sessionId: string;
}

/**
 * Server-to-client control messages
 * 
 * These are the server's side of the conversation management — confirmations,
 * status updates, transcript fragments, and assessment results that flow
 * back alongside (but separate from) the audio stream.
 */
export type ServerMessage =
  | ServerReadyMessage
  | ServerTurnStartMessage
  | ServerTurnEndMessage
  | ServerTranscriptMessage
  | ServerAssessmentMessage
  | ServerErrorMessage
  | ServerPongMessage
  | ServerSessionEndMessage
  | ServerAgentStateMessage
  | ServerPronunciationFeedbackMessage;

export interface ServerReadyMessage {
  type: 'session.ready';
  sessionId: string;
  agentId: string;
  agentName: string;
  greeting?: string;
}

export interface ServerTurnStartMessage {
  type: 'turn.start';
  sessionId: string;
  speaker: 'learner' | 'agent';
  turnId: string;
  sequence: number;
}

export interface ServerTurnEndMessage {
  type: 'turn.end';
  sessionId: string;
  speaker: 'learner' | 'agent';
  turnId: string;
  durationMs: number;
}

export interface ServerTranscriptMessage {
  type: 'transcript';
  sessionId: string;
  turnId: string;
  speaker: 'learner' | 'agent';
  text: string;
  isFinal: boolean;
  language?: string;
  confidence?: number;
}

export interface ServerAssessmentMessage {
  type: 'assessment';
  sessionId: string;
  turnId: string;
  pronunciationScore?: number;
  grammarScore?: number;
  fluencyScore?: number;
  issues?: Array<{
    word: string;
    type: string;
    suggestion: string;
  }>;
}

export interface ServerPronunciationFeedbackMessage {
  type: 'pronunciation.feedback';
  sessionId: string;
  turnId: string;
  word: string;
  expected: string;
  actual: string;
  score: number;
  suggestion: string;
}

export interface ServerErrorMessage {
  type: 'error';
  code: string;
  message: string;
  sessionId?: string;
  recoverable: boolean;
}

export interface ServerPongMessage {
  type: 'pong';
  timestamp: number;
  serverTimestamp: number;
  latencyMs?: number;
}

export interface ServerSessionEndMessage {
  type: 'session.end';
  sessionId: string;
  reason: 'completed' | 'timeout' | 'error' | 'user_ended';
  summary: {
    durationMs: number;
    turnCount: number;
    averagePronunciation?: number;
    averageGrammar?: number;
    averageFluency?: number;
    topIssues: string[];
    competenciesUpdated: string[];
  };
}

export interface ServerAgentStateMessage {
  type: 'agent.state';
  sessionId: string;
  state: 'listening' | 'thinking' | 'speaking' | 'waiting';
}

// ============================================================================
// ACTIVE SESSION TRACKING
// ============================================================================

/**
 * Tracks an active WebSocket conversation session.
 * 
 * Each ActiveSession is like a switchboard operator sitting between the learner
 * and the ElevenLabs agent — routing audio in both directions, keeping notes
 * on what's being said, and watching for pronunciation issues in real time.
 */
interface ActiveSession {
  sessionId: string;
  tenantId: string;
  learnerId: string;
  agentId: string;
  clientWs: WebSocket;
  elevenLabsWs: WebSocket | null;
  config: SessionConfig;
  state: SessionState;
  turns: TurnTracker[];
  currentTurn: TurnTracker | null;
  startedAt: Date;
  lastActivityAt: Date;
  audioBuffer: Buffer[];
  metrics: SessionMetrics;
}

interface SessionConfig {
  audioFormat: AudioFormat;
  sampleRate: number;
  channels: number;
  vadSensitivity: number;
  interruptionThreshold: number;
  turnTimeout: number;
  pronunciationFeedback: boolean;
  maxDurationMs: number;
}

type SessionState = 
  | 'connecting'
  | 'ready'
  | 'learner_speaking'
  | 'agent_thinking'
  | 'agent_speaking'
  | 'paused'
  | 'ending'
  | 'closed';

interface TurnTracker {
  turnId: string;
  speaker: 'learner' | 'agent';
  sequence: number;
  startedAt: Date;
  endedAt?: Date;
  transcriptParts: string[];
  finalTranscript?: string;
  language?: string;
  audioChunks: number;
  assessment?: {
    pronunciationScore?: number;
    grammarScore?: number;
    fluencyScore?: number;
    issues?: Array<{ word: string; type: string; suggestion: string }>;
  };
}

interface SessionMetrics {
  totalAudioBytesReceived: number;
  totalAudioBytesSent: number;
  turnCount: number;
  learnerSpeakingTimeMs: number;
  agentSpeakingTimeMs: number;
  averageLatencyMs: number;
  latencySamples: number[];
  reconnectAttempts: number;
  errors: Array<{ code: string; timestamp: Date; message: string }>;
}

// ============================================================================
// WEBSOCKET SERVER
// ============================================================================

/**
 * Configuration for the Voice Intelligence WebSocket server
 */
export interface VoiceWebSocketConfig {
  /** Maximum concurrent sessions per tenant */
  maxSessionsPerTenant: number;
  /** Maximum session duration in milliseconds (default: 30 minutes) */
  maxSessionDurationMs: number;
  /** Heartbeat interval in milliseconds */
  heartbeatIntervalMs: number;
  /** Inactivity timeout — close session if no audio for this long */
  inactivityTimeoutMs: number;
  /** Maximum audio buffer size per session (bytes) before flushing */
  maxAudioBufferSize: number;
  /** Path prefix for WebSocket upgrade */
  pathPrefix: string;
  /** ElevenLabs WebSocket endpoint template */
  elevenLabsWsEndpoint: string;
}

const DEFAULT_WS_CONFIG: VoiceWebSocketConfig = {
  maxSessionsPerTenant: 50,
  maxSessionDurationMs: 30 * 60 * 1000,   // 30 minutes
  heartbeatIntervalMs: 30_000,              // 30 seconds
  inactivityTimeoutMs: 120_000,             // 2 minutes
  maxAudioBufferSize: 1024 * 1024,          // 1MB
  pathPrefix: '/ws/voice',
  elevenLabsWsEndpoint: 'wss://api.elevenlabs.io/v1/convai/conversation',
};

/**
 * Voice Intelligence WebSocket Server
 * 
 * Manages the lifecycle of real-time voice conversation sessions. This is the
 * bridge between the learner's browser and the ElevenLabs conversational agent,
 * with Scholarly sitting in the middle to track turns, assess pronunciation,
 * enforce quotas, and maintain the learner's progress record.
 * 
 * ## Lifecycle of a Conversation
 * 
 * 1. Client connects via WebSocket with auth token and session ID
 * 2. Server validates auth, loads session from DB, connects to ElevenLabs agent
 * 3. Agent sends greeting audio → forwarded to client
 * 4. Client sends audio chunks (learner speaking) → forwarded to ElevenLabs
 * 5. ElevenLabs processes, agent responds → audio forwarded back to client
 * 6. Each turn is tracked, transcribed, and assessed
 * 7. On session end, final assessment is computed and LIS is updated
 */
export class VoiceWebSocketServer {
  private wss: WebSocketServer;
  private activeSessions: Map<string, ActiveSession> = new Map();
  private tenantSessionCounts: Map<string, number> = new Map();
  private heartbeatInterval: NodeJS.Timer | null = null;
  private inactivityCheckInterval: NodeJS.Timer | null = null;

  constructor(
    private readonly service: VoiceIntelligenceService,
    private readonly logger: Logger,
    private readonly eventBus: EventBus,
    private readonly config: VoiceWebSocketConfig = DEFAULT_WS_CONFIG
  ) {
    this.wss = new WebSocketServer({ noServer: true });
    this.setupHeartbeat();
    this.setupInactivityCheck();
  }

  // --------------------------------------------------------------------------
  // SERVER LIFECYCLE
  // --------------------------------------------------------------------------

  /**
   * Attach the WebSocket server to an existing HTTP server.
   * 
   * This follows the "noServer" pattern where the HTTP server handles the
   * upgrade request, allowing us to authenticate before completing the
   * WebSocket handshake — like checking ID at the door before letting
   * someone into the conversation room.
   */
  attachToServer(httpServer: HTTPServer): void {
    httpServer.on('upgrade', async (request: IncomingMessage, socket, head) => {
      const url = new URL(request.url || '', `http://${request.headers.host}`);

      if (!url.pathname.startsWith(this.config.pathPrefix)) {
        return; // Not our path — let other upgrade handlers deal with it
      }

      try {
        const auth = await this.authenticateConnection(request);
        if (!auth) {
          socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
          socket.destroy();
          return;
        }

        // Check tenant session limits
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
        this.logger.error('WebSocket upgrade failed', error as Error);
        socket.write('HTTP/1.1 500 Internal Server Error\r\n\r\n');
        socket.destroy();
      }
    });

    this.wss.on('connection', (ws: WebSocket, _request: IncomingMessage, auth: ConnectionAuth) => {
      this.handleConnection(ws, auth);
    });

    this.logger.info('Voice WebSocket server attached', {
      path: this.config.pathPrefix,
      maxSessionsPerTenant: this.config.maxSessionsPerTenant,
    });
  }

  /**
   * Graceful shutdown — end all active sessions cleanly before closing
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Voice WebSocket server', {
      activeSessions: this.activeSessions.size,
    });

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval as any);
    }
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval as any);
    }

    // End all active sessions
    const endPromises = Array.from(this.activeSessions.values()).map(session =>
      this.endSession(session, 'completed').catch(err =>
        this.logger.error('Error ending session during shutdown', err as Error, {
          sessionId: session.sessionId,
        })
      )
    );
    await Promise.allSettled(endPromises);

    this.wss.close();
    this.logger.info('Voice WebSocket server shut down complete');
  }

  /**
   * Get current server statistics for monitoring
   */
  getStats(): WebSocketServerStats {
    const sessions = Array.from(this.activeSessions.values());
    return {
      totalActiveSessions: sessions.length,
      sessionsByTenant: Object.fromEntries(this.tenantSessionCounts),
      sessionsByState: sessions.reduce((acc, s) => {
        acc[s.state] = (acc[s.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      totalAudioBytesProcessed: sessions.reduce(
        (sum, s) => sum + s.metrics.totalAudioBytesReceived + s.metrics.totalAudioBytesSent, 0
      ),
      averageSessionDurationMs: sessions.length > 0
        ? sessions.reduce((sum, s) => sum + (Date.now() - s.startedAt.getTime()), 0) / sessions.length
        : 0,
      uptime: process.uptime(),
    };
  }

  // --------------------------------------------------------------------------
  // CONNECTION HANDLING
  // --------------------------------------------------------------------------

  /**
   * Authenticate the incoming WebSocket connection.
   * 
   * Extracts the auth token from either the Authorization header or the 
   * query string (for browsers that can't set WebSocket headers easily),
   * validates it, and returns the tenant/learner context.
   */
  private async authenticateConnection(request: IncomingMessage): Promise<ConnectionAuth | null> {
    const url = new URL(request.url || '', `http://${request.headers.host}`);

    // Try Authorization header first, then query parameter
    const token = request.headers.authorization?.replace('Bearer ', '')
      || url.searchParams.get('token');

    if (!token) {
      this.logger.warn('WebSocket connection attempt without auth token');
      return null;
    }

    try {
      // In a real implementation, this would validate a JWT or session token
      // against the auth service. For now, we decode the expected structure.
      const decoded = this.decodeAuthToken(token);
      if (!decoded) {
        return null;
      }

      // Extract session ID from path: /ws/voice/{sessionId}
      const pathParts = url.pathname.replace(this.config.pathPrefix, '').split('/').filter(Boolean);
      const sessionId = pathParts[0] || url.searchParams.get('sessionId');

      return {
        tenantId: decoded.tenantId,
        learnerId: decoded.learnerId,
        sessionId: sessionId || undefined,
        permissions: decoded.permissions || ['voice:conversation'],
      };
    } catch (error) {
      this.logger.warn('WebSocket auth token validation failed', { error });
      return null;
    }
  }

  /**
   * Handle a new WebSocket connection.
   * 
   * This is where the conversation lifecycle begins. We set up message
   * handlers, prepare the session tracker, and wait for the client to
   * send a 'session.start' message to kick things off.
   */
  private handleConnection(ws: WebSocket, auth: ConnectionAuth): void {
    this.logger.info('WebSocket client connected', {
      tenantId: auth.tenantId,
      learnerId: auth.learnerId,
      sessionId: auth.sessionId,
    });

    // Set up message handling
    ws.on('message', async (data: Buffer | string, isBinary: boolean) => {
      try {
        if (isBinary) {
          await this.handleAudioData(ws, auth, data as Buffer);
        } else {
          const message = JSON.parse(data.toString()) as ClientMessage;
          await this.handleControlMessage(ws, auth, message);
        }
      } catch (error) {
        this.logger.error('Error handling WebSocket message', error as Error, {
          tenantId: auth.tenantId,
        });
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
      this.logger.error('WebSocket error', error, {
        tenantId: auth.tenantId,
        sessionId: auth.sessionId,
      });
    });

    // If session ID was provided in the URL, auto-start
    if (auth.sessionId) {
      this.handleControlMessage(ws, auth, {
        type: 'session.start',
        sessionId: auth.sessionId,
      }).catch(err => {
        this.logger.error('Auto-start session failed', err as Error);
      });
    }
  }

  // --------------------------------------------------------------------------
  // CONTROL MESSAGE HANDLING
  // --------------------------------------------------------------------------

  /**
   * Route control messages to the appropriate handler.
   * 
   * Control messages are the "meta-conversation" — they don't carry audio
   * but manage the session state: starting, stopping, configuring, etc.
   */
  private async handleControlMessage(
    ws: WebSocket,
    auth: ConnectionAuth,
    message: ClientMessage
  ): Promise<void> {
    switch (message.type) {
      case 'session.start':
        await this.handleSessionStart(ws, auth, message);
        break;

      case 'session.stop':
        await this.handleSessionStop(auth, message);
        break;

      case 'session.config':
        await this.handleSessionConfig(auth, message);
        break;

      case 'session.interrupt':
        await this.handleInterrupt(auth, message);
        break;

      case 'session.transcript':
        await this.handleTranscriptRequest(ws, auth, message);
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
        this.sendMessage(ws, {
          type: 'error',
          code: 'UNKNOWN_MESSAGE_TYPE',
          message: `Unknown message type: ${(message as any).type}`,
          recoverable: true,
        });
    }
  }

  /**
   * Start a conversation session.
   * 
   * This is the most complex handler — it needs to:
   * 1. Validate the session exists and belongs to this learner
   * 2. Load the agent configuration
   * 3. Connect to ElevenLabs' conversational agent WebSocket
   * 4. Set up bidirectional audio forwarding
   * 5. Track the session state and begin turn recording
   */
  private async handleSessionStart(
    ws: WebSocket,
    auth: ConnectionAuth,
    message: ClientStartMessage
  ): Promise<void> {
    const { sessionId } = message;

    // Check if session is already active
    if (this.activeSessions.has(sessionId)) {
      this.sendMessage(ws, {
        type: 'error',
        code: 'SESSION_ALREADY_ACTIVE',
        message: 'This session is already active on another connection',
        sessionId,
        recoverable: false,
      });
      return;
    }

    // Validate session exists and load from service
    const sessionResult = await this.service.startConversationSession(
      auth.tenantId,
      sessionId,
      auth.learnerId,
      {} // Session already created via REST API; this activates it
    );

    // Retrieve the session data from the DB
    // The startConversationSession method returns the session with websocketUrl
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

    // Connect to ElevenLabs agent WebSocket
    const elevenLabsWs = await this.connectToElevenLabs(
      auth.tenantId,
      session
    );

    // Create active session tracker
    const activeSession: ActiveSession = {
      sessionId,
      tenantId: auth.tenantId,
      learnerId: auth.learnerId,
      agentId: session.agentId,
      clientWs: ws,
      elevenLabsWs,
      config: {
        audioFormat: message.audioConfig?.format || 'pcm_16000',
        sampleRate: message.audioConfig?.sampleRate || 16000,
        channels: message.audioConfig?.channels || 1,
        vadSensitivity: 0.5,
        interruptionThreshold: 0.7,
        turnTimeout: 2000,
        pronunciationFeedback: true,
        maxDurationMs: this.config.maxSessionDurationMs,
      },
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
        averageLatencyMs: 0,
        latencySamples: [],
        reconnectAttempts: 0,
        errors: [],
      },
    };

    this.activeSessions.set(sessionId, activeSession);

    // Update tenant session count
    const count = this.tenantSessionCounts.get(auth.tenantId) || 0;
    this.tenantSessionCounts.set(auth.tenantId, count + 1);

    // Set up ElevenLabs message forwarding
    if (elevenLabsWs) {
      this.setupElevenLabsForwarding(activeSession);
    }

    // Notify client that session is ready
    this.sendMessage(ws, {
      type: 'session.ready',
      sessionId,
      agentId: session.agentId,
      agentName: session.scenarioId || 'Conversation Agent',
    });

    // Publish session started event
    await this.eventBus.publish('voice.session.started', {
      id: this.generateEventId(),
      type: 'voice.session.started',
      tenantId: auth.tenantId,
      timestamp: new Date(),
      payload: {
        sessionId,
        learnerId: auth.learnerId,
        agentId: session.agentId,
      },
    });

    this.logger.info('Conversation session started', {
      sessionId,
      tenantId: auth.tenantId,
      learnerId: auth.learnerId,
    });
  }

  /**
   * Connect to ElevenLabs' conversational agent WebSocket.
   * 
   * This establishes the "upstream" connection to the AI agent. Audio from
   * the learner will be forwarded here, and the agent's responses will be
   * forwarded back. Think of it as a conference call where Scholarly is
   * the operator in the middle.
   */
  private async connectToElevenLabs(
    tenantId: string,
    session: ConversationSession
  ): Promise<WebSocket | null> {
    try {
      const configResult = await this.service.getTenantConfig(tenantId);
      if (!configResult.success || !configResult.data) {
        this.logger.error('Failed to get tenant config for ElevenLabs connection', undefined, {
          tenantId,
        });
        return null;
      }

      const config = configResult.data;
      const wsUrl = session.websocketUrl || 
        `${this.config.elevenLabsWsEndpoint}?agent_id=${session.agentId}`;

      return new Promise((resolve, reject) => {
        const ws = new WebSocket(wsUrl, {
          headers: {
            'xi-api-key': config.agentApiKey || config.apiKey,
          },
        });

        const timeout = setTimeout(() => {
          ws.close();
          reject(new Error('ElevenLabs WebSocket connection timeout'));
        }, 10000);

        ws.on('open', () => {
          clearTimeout(timeout);
          this.logger.info('Connected to ElevenLabs agent', {
            tenantId,
            sessionId: session.id,
          });
          resolve(ws);
        });

        ws.on('error', (error) => {
          clearTimeout(timeout);
          this.logger.error('ElevenLabs WebSocket connection error', error, {
            tenantId,
          });
          reject(error);
        });
      });
    } catch (error) {
      this.logger.error('Failed to connect to ElevenLabs', error as Error, {
        tenantId,
        sessionId: session.id,
      });
      return null;
    }
  }

  /**
   * Set up bidirectional audio forwarding with the ElevenLabs agent.
   * 
   * This is the "plumbing" — connecting the learner's audio pipe to the
   * agent's audio pipe with Scholarly's monitoring taps in between.
   */
  private setupElevenLabsForwarding(session: ActiveSession): void {
    const elWs = session.elevenLabsWs;
    if (!elWs) return;

    elWs.on('message', (data: Buffer | string, isBinary: boolean) => {
      session.lastActivityAt = new Date();

      if (isBinary) {
        // Audio from agent → forward to client
        session.metrics.totalAudioBytesSent += (data as Buffer).length;

        if (session.clientWs.readyState === WebSocket.OPEN) {
          session.clientWs.send(data, { binary: true });
        }

        // Track agent speaking state
        if (session.state !== 'agent_speaking') {
          this.transitionState(session, 'agent_speaking');
          this.startTurn(session, 'agent');
        }
      } else {
        // Control message from ElevenLabs
        try {
          const message = JSON.parse(data.toString());
          this.handleElevenLabsControl(session, message);
        } catch {
          // Non-JSON message — log and ignore
          this.logger.warn('Unparseable ElevenLabs message', {
            sessionId: session.sessionId,
          });
        }
      }
    });

    elWs.on('close', (code: number, reason: Buffer) => {
      this.logger.info('ElevenLabs WebSocket closed', {
        sessionId: session.sessionId,
        code,
        reason: reason.toString(),
      });

      // If session is still active, this is an unexpected disconnect
      if (session.state !== 'ending' && session.state !== 'closed') {
        session.metrics.errors.push({
          code: 'ELEVENLABS_DISCONNECT',
          timestamp: new Date(),
          message: `ElevenLabs disconnected: ${code} ${reason}`,
        });

        this.sendMessage(session.clientWs, {
          type: 'error',
          code: 'AGENT_DISCONNECTED',
          message: 'The conversation agent disconnected unexpectedly',
          sessionId: session.sessionId,
          recoverable: false,
        });

        this.endSession(session, 'error').catch(err => {
          this.logger.error('Error ending session after ElevenLabs disconnect', err as Error);
        });
      }
    });

    elWs.on('error', (error: Error) => {
      this.logger.error('ElevenLabs WebSocket error', error, {
        sessionId: session.sessionId,
      });
    });
  }

  /**
   * Handle control messages from ElevenLabs.
   * 
   * ElevenLabs sends structured messages about agent state, transcripts,
   * and conversation events. We translate these into Scholarly's protocol
   * and forward relevant information to the client.
   */
  private handleElevenLabsControl(session: ActiveSession, message: any): void {
    switch (message.type) {
      case 'audio':
        // Audio metadata (format, sample rate, etc.) — use for configuration
        break;

      case 'agent_response':
      case 'transcript':
        // Agent's transcript — forward to client and record
        if (message.text) {
          if (session.currentTurn && session.currentTurn.speaker === 'agent') {
            session.currentTurn.transcriptParts.push(message.text);
          }
          this.sendMessage(session.clientWs, {
            type: 'transcript',
            sessionId: session.sessionId,
            turnId: session.currentTurn?.turnId || '',
            speaker: 'agent',
            text: message.text,
            isFinal: message.is_final || false,
            language: message.language,
          });
        }
        break;

      case 'user_transcript':
        // Learner's transcript from ElevenLabs STT — forward and record
        if (message.text) {
          if (session.currentTurn && session.currentTurn.speaker === 'learner') {
            session.currentTurn.transcriptParts.push(message.text);
          }
          this.sendMessage(session.clientWs, {
            type: 'transcript',
            sessionId: session.sessionId,
            turnId: session.currentTurn?.turnId || '',
            speaker: 'learner',
            text: message.text,
            isFinal: message.is_final || false,
            language: message.language,
            confidence: message.confidence,
          });

          // If final transcript and pronunciation feedback is enabled, assess
          if (message.is_final && session.config.pronunciationFeedback) {
            this.assessTurnPronunciation(session).catch(err => {
              this.logger.error('Pronunciation assessment error', err as Error);
            });
          }
        }
        break;

      case 'interruption':
        // Agent was interrupted by learner
        if (session.currentTurn?.speaker === 'agent') {
          this.endCurrentTurn(session);
        }
        this.transitionState(session, 'learner_speaking');
        this.startTurn(session, 'learner');
        break;

      case 'turn_end':
        // Turn ended — transition state
        this.endCurrentTurn(session);
        this.transitionState(session, 'ready');
        break;

      case 'end':
        // Conversation ended by agent
        this.endSession(session, 'completed').catch(err => {
          this.logger.error('Error ending session', err as Error);
        });
        break;

      default:
        this.logger.debug('Unhandled ElevenLabs message type', {
          type: message.type,
          sessionId: session.sessionId,
        });
    }
  }

  // --------------------------------------------------------------------------
  // AUDIO HANDLING
  // --------------------------------------------------------------------------

  /**
   * Handle incoming audio data from the learner.
   * 
   * Raw audio chunks flow in from the browser's MediaRecorder. We forward
   * them to ElevenLabs, track metrics, and detect voice activity for
   * turn management.
   */
  private async handleAudioData(
    ws: WebSocket,
    auth: ConnectionAuth,
    data: Buffer
  ): Promise<void> {
    // Find the active session for this connection
    const session = this.findSessionByClient(ws);
    if (!session) {
      this.sendMessage(ws, {
        type: 'error',
        code: 'NO_ACTIVE_SESSION',
        message: 'No active session. Send session.start first.',
        recoverable: true,
      });
      return;
    }

    session.lastActivityAt = new Date();
    session.metrics.totalAudioBytesReceived += data.length;

    // Detect learner speaking
    if (session.state !== 'learner_speaking') {
      this.transitionState(session, 'learner_speaking');
      this.startTurn(session, 'learner');

      this.sendMessage(session.clientWs, {
        type: 'agent.state',
        sessionId: session.sessionId,
        state: 'listening',
      });
    }

    // Forward audio to ElevenLabs
    if (session.elevenLabsWs?.readyState === WebSocket.OPEN) {
      session.elevenLabsWs.send(data);
    }

    // Buffer audio for potential local processing (pronunciation assessment)
    session.audioBuffer.push(data);
    if (session.audioBuffer.reduce((sum, b) => sum + b.length, 0) > this.config.maxAudioBufferSize) {
      // Flush oldest chunks to prevent memory issues
      session.audioBuffer.splice(0, Math.floor(session.audioBuffer.length / 2));
    }
  }

  // --------------------------------------------------------------------------
  // TURN MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Start tracking a new conversation turn.
   * 
   * A "turn" in conversation is one person's uninterrupted speech segment.
   * Like in a tennis rally, we track each stroke — who said what, for how
   * long, and how well.
   */
  private startTurn(session: ActiveSession, speaker: 'learner' | 'agent'): void {
    // End any existing turn first
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
      audioChunks: 0,
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

  /**
   * End the current turn and persist it.
   */
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

    // Persist the turn asynchronously
    this.persistTurn(session, turn).catch(err => {
      this.logger.error('Error persisting turn', err as Error, {
        sessionId: session.sessionId,
        turnId: turn.turnId,
      });
    });
  }

  /**
   * Persist a completed turn to the database via the service layer.
   */
  private async persistTurn(session: ActiveSession, turn: TurnTracker): Promise<void> {
    await this.service.addConversationTurn(
      session.tenantId,
      session.sessionId,
      {
        speaker: turn.speaker,
        language: turn.language || 'en',
        audioUrl: '', // Audio stored separately via streaming pipeline
        transcript: turn.finalTranscript || '',
        startMs: 0,
        endMs: turn.endedAt
          ? turn.endedAt.getTime() - turn.startedAt.getTime()
          : 0,
        assessment: turn.assessment ? {
          pronunciationScore: turn.assessment.pronunciationScore,
          grammarScore: turn.assessment.grammarScore,
          fluencyScore: turn.assessment.fluencyScore,
          issues: turn.assessment.issues?.map(i => i.word) || [],
        } : undefined,
      }
    );
  }

  /**
   * Assess pronunciation for the current learner turn.
   * 
   * When we have a final transcript from the learner, we can run it
   * through the pronunciation assessment pipeline to give real-time
   * feedback — like a language teacher discreetly noting which words
   * need work while the conversation continues.
   */
  private async assessTurnPronunciation(session: ActiveSession): Promise<void> {
    const turn = session.currentTurn;
    if (!turn || turn.speaker !== 'learner' || !turn.finalTranscript) return;

    // Combine buffered audio for assessment
    const audioData = Buffer.concat(session.audioBuffer);
    session.audioBuffer = []; // Clear buffer after use

    if (audioData.length < 1000) return; // Too little audio to assess

    try {
      const result = await this.service.assessPronunciation({
        tenantId: session.tenantId,
        learnerId: session.learnerId,
        audioData,
        audioFormat: session.config.audioFormat,
        expectedText: turn.finalTranscript,
        language: turn.language || 'en',
        assessmentType: 'free_speech',
        strictness: 'moderate',
      });

      if (result.success && result.data) {
        const assessment = result.data;

        turn.assessment = {
          pronunciationScore: assessment.overallScore,
          grammarScore: assessment.scores?.grammar,
          fluencyScore: assessment.scores?.fluency,
          issues: assessment.issues?.map(i => ({
            word: i.word,
            type: i.type,
            suggestion: i.suggestion,
          })),
        };

        // Send real-time assessment to client
        this.sendMessage(session.clientWs, {
          type: 'assessment',
          sessionId: session.sessionId,
          turnId: turn.turnId,
          pronunciationScore: assessment.overallScore,
          grammarScore: assessment.scores?.grammar,
          fluencyScore: assessment.scores?.fluency,
          issues: turn.assessment.issues,
        });

        // Send individual word feedback for major issues
        if (assessment.wordAnalysis) {
          for (const wordAnalysis of assessment.wordAnalysis) {
            if (wordAnalysis.score < 0.6) {
              this.sendMessage(session.clientWs, {
                type: 'pronunciation.feedback',
                sessionId: session.sessionId,
                turnId: turn.turnId,
                word: wordAnalysis.expected,
                expected: wordAnalysis.expectedPhonemes || wordAnalysis.expected,
                actual: wordAnalysis.actualPhonemes || wordAnalysis.actual,
                score: wordAnalysis.score,
                suggestion: wordAnalysis.suggestion || 'Try again slowly',
              });
            }
          }
        }
      }
    } catch (error) {
      this.logger.error('Real-time pronunciation assessment failed', error as Error, {
        sessionId: session.sessionId,
      });
    }
  }

  // --------------------------------------------------------------------------
  // SESSION LIFECYCLE
  // --------------------------------------------------------------------------

  /**
   * Handle session stop request from client
   */
  private async handleSessionStop(
    auth: ConnectionAuth,
    message: ClientStopMessage
  ): Promise<void> {
    const session = this.activeSessions.get(message.sessionId);
    if (!session) return;

    await this.endSession(session, message.reason === 'timeout' ? 'timeout' : 'user_ended');
  }

  /**
   * Handle session configuration update
   */
  private async handleSessionConfig(
    auth: ConnectionAuth,
    message: ClientConfigMessage
  ): Promise<void> {
    const session = this.activeSessions.get(message.sessionId);
    if (!session) return;

    if (message.config.vadSensitivity !== undefined) {
      session.config.vadSensitivity = Math.max(0, Math.min(1, message.config.vadSensitivity));
    }
    if (message.config.interruptionThreshold !== undefined) {
      session.config.interruptionThreshold = Math.max(0, Math.min(1, message.config.interruptionThreshold));
    }
    if (message.config.turnTimeout !== undefined) {
      session.config.turnTimeout = Math.max(500, Math.min(10000, message.config.turnTimeout));
    }
    if (message.config.pronunciationFeedback !== undefined) {
      session.config.pronunciationFeedback = message.config.pronunciationFeedback;
    }
  }

  /**
   * Handle learner interrupt — they started speaking while agent was talking
   */
  private async handleInterrupt(
    auth: ConnectionAuth,
    message: ClientInterruptMessage
  ): Promise<void> {
    const session = this.activeSessions.get(message.sessionId);
    if (!session) return;

    // Forward interrupt to ElevenLabs
    if (session.elevenLabsWs?.readyState === WebSocket.OPEN) {
      session.elevenLabsWs.send(JSON.stringify({ type: 'interrupt' }));
    }

    // End agent turn and start learner turn
    if (session.currentTurn?.speaker === 'agent') {
      this.endCurrentTurn(session);
    }
    this.transitionState(session, 'learner_speaking');
    this.startTurn(session, 'learner');
  }

  /**
   * Handle request for full transcript
   */
  private async handleTranscriptRequest(
    ws: WebSocket,
    auth: ConnectionAuth,
    message: ClientTranscriptRequestMessage
  ): Promise<void> {
    const session = this.activeSessions.get(message.sessionId);
    if (!session) return;

    // Send all turn transcripts
    for (const turn of session.turns) {
      this.sendMessage(ws, {
        type: 'transcript',
        sessionId: session.sessionId,
        turnId: turn.turnId,
        speaker: turn.speaker,
        text: turn.finalTranscript || turn.transcriptParts.join(' '),
        isFinal: true,
        language: turn.language,
      });
    }
  }

  /**
   * End a conversation session.
   * 
   * This is the graceful teardown — compute final assessment, update the
   * learner's progress, close the ElevenLabs connection, and notify everyone.
   */
  private async endSession(
    session: ActiveSession,
    reason: 'completed' | 'timeout' | 'error' | 'user_ended'
  ): Promise<void> {
    if (session.state === 'closed') return;

    this.transitionState(session, 'ending');

    // End any active turn
    if (session.currentTurn) {
      this.endCurrentTurn(session);
    }

    // Close ElevenLabs connection
    if (session.elevenLabsWs?.readyState === WebSocket.OPEN) {
      session.elevenLabsWs.close(1000, 'Session ended');
    }

    // Compute session summary
    const durationMs = Date.now() - session.startedAt.getTime();
    const pronunciationScores = session.turns
      .filter(t => t.assessment?.pronunciationScore !== undefined)
      .map(t => t.assessment!.pronunciationScore!);
    const grammarScores = session.turns
      .filter(t => t.assessment?.grammarScore !== undefined)
      .map(t => t.assessment!.grammarScore!);
    const fluencyScores = session.turns
      .filter(t => t.assessment?.fluencyScore !== undefined)
      .map(t => t.assessment!.fluencyScore!);

    const allIssues = session.turns
      .flatMap(t => t.assessment?.issues || [])
      .map(i => i.type);
    const issueFrequency = allIssues.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topIssues = Object.entries(issueFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type]) => type);

    const summary = {
      durationMs,
      turnCount: session.turns.length,
      averagePronunciation: pronunciationScores.length > 0
        ? pronunciationScores.reduce((a, b) => a + b, 0) / pronunciationScores.length
        : undefined,
      averageGrammar: grammarScores.length > 0
        ? grammarScores.reduce((a, b) => a + b, 0) / grammarScores.length
        : undefined,
      averageFluency: fluencyScores.length > 0
        ? fluencyScores.reduce((a, b) => a + b, 0) / fluencyScores.length
        : undefined,
      topIssues,
      competenciesUpdated: [], // Populated by service layer
    };

    // Send session end message to client
    this.sendMessage(session.clientWs, {
      type: 'session.end',
      sessionId: session.sessionId,
      reason,
      summary,
    });

    // End session via service layer (persists final assessment, updates LIS)
    await this.service.endConversationSession(
      session.tenantId,
      session.sessionId,
      session.learnerId
    ).catch(err => {
      this.logger.error('Error ending session in service', err as Error);
    });

    // Clean up
    this.activeSessions.delete(session.sessionId);
    const tenantCount = (this.tenantSessionCounts.get(session.tenantId) || 1) - 1;
    if (tenantCount <= 0) {
      this.tenantSessionCounts.delete(session.tenantId);
    } else {
      this.tenantSessionCounts.set(session.tenantId, tenantCount);
    }

    this.transitionState(session, 'closed');

    // Publish session ended event
    await this.eventBus.publish('voice.session.ended', {
      id: this.generateEventId(),
      type: 'voice.session.ended',
      tenantId: session.tenantId,
      timestamp: new Date(),
      payload: {
        sessionId: session.sessionId,
        learnerId: session.learnerId,
        reason,
        durationMs,
        turnCount: session.turns.length,
        metrics: session.metrics,
      },
    });

    this.logger.info('Conversation session ended', {
      sessionId: session.sessionId,
      reason,
      durationMs,
      turnCount: session.turns.length,
    });
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(auth: ConnectionAuth, code: number, reason: string): void {
    this.logger.info('WebSocket client disconnected', {
      tenantId: auth.tenantId,
      learnerId: auth.learnerId,
      code,
      reason,
    });

    // Find and end any active session for this client
    for (const [sessionId, session] of this.activeSessions) {
      if (session.tenantId === auth.tenantId && session.learnerId === auth.learnerId) {
        this.endSession(session, 'user_ended').catch(err => {
          this.logger.error('Error ending session on disconnect', err as Error);
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // STATE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Transition a session to a new state with logging
   */
  private transitionState(session: ActiveSession, newState: SessionState): void {
    const oldState = session.state;
    session.state = newState;

    this.logger.debug('Session state transition', {
      sessionId: session.sessionId,
      from: oldState,
      to: newState,
    });

    // Notify client of agent state changes
    if (newState === 'agent_speaking') {
      this.sendMessage(session.clientWs, {
        type: 'agent.state',
        sessionId: session.sessionId,
        state: 'speaking',
      });
    } else if (newState === 'learner_speaking') {
      this.sendMessage(session.clientWs, {
        type: 'agent.state',
        sessionId: session.sessionId,
        state: 'listening',
      });
    } else if (newState === 'agent_thinking') {
      this.sendMessage(session.clientWs, {
        type: 'agent.state',
        sessionId: session.sessionId,
        state: 'thinking',
      });
    }
  }

  // --------------------------------------------------------------------------
  // HEALTH & MONITORING
  // --------------------------------------------------------------------------

  /**
   * Heartbeat — keep connections alive and detect dead sessions
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      for (const session of this.activeSessions.values()) {
        if (session.clientWs.readyState === WebSocket.OPEN) {
          session.clientWs.ping();
        }
      }
    }, this.config.heartbeatIntervalMs);
  }

  /**
   * Inactivity checker — end sessions that have gone quiet
   */
  private setupInactivityCheck(): void {
    this.inactivityCheckInterval = setInterval(() => {
      const now = Date.now();

      for (const session of this.activeSessions.values()) {
        // Check inactivity timeout
        if (now - session.lastActivityAt.getTime() > this.config.inactivityTimeoutMs) {
          this.logger.info('Ending inactive session', {
            sessionId: session.sessionId,
            inactiveForMs: now - session.lastActivityAt.getTime(),
          });
          this.endSession(session, 'timeout').catch(err => {
            this.logger.error('Error ending inactive session', err as Error);
          });
          continue;
        }

        // Check max duration
        if (now - session.startedAt.getTime() > session.config.maxDurationMs) {
          this.logger.info('Ending session due to max duration', {
            sessionId: session.sessionId,
            durationMs: now - session.startedAt.getTime(),
          });
          this.endSession(session, 'timeout').catch(err => {
            this.logger.error('Error ending max-duration session', err as Error);
          });
        }
      }
    }, 10_000); // Check every 10 seconds
  }

  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------

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

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
  }

  private decodeAuthToken(token: string): ConnectionAuth | null {
    try {
      // In production, this would validate a JWT. For the service layer,
      // we accept a base64-encoded JSON object for simplicity.
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      if (!decoded.tenantId || !decoded.learnerId) return null;
      return decoded;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface ConnectionAuth {
  tenantId: string;
  learnerId: string;
  sessionId?: string;
  permissions: string[];
}

export interface WebSocketServerStats {
  totalActiveSessions: number;
  sessionsByTenant: Record<string, number>;
  sessionsByState: Record<string, number>;
  totalAudioBytesProcessed: number;
  averageSessionDurationMs: number;
  uptime: number;
}
