/**
 * Unified Communications 4.0 — Video Conferencing Plugin
 *
 * The meeting room of the digital building. This plugin manages the full
 * lifecycle of video sessions: creating rooms, managing participants,
 * screen sharing, breakout rooms, waiting rooms, recording, and layout
 * control. It's the infrastructure that powers:
 *   - Team standups at a company (Chekd-ID)
 *   - Virtual classroom sessions (Scholarly)
 *   - Client consultations (professional services)
 *   - Webinar backstage (extends into the Webinar plugin)
 *
 * The plugin is media-server agnostic: it manages the signalling layer
 * (room state, participants, permissions) while the actual WebRTC media
 * is handled by whatever SFU is deployed (Mediasoup, LiveKit, Janus).
 * If no SFU is available, rooms still work for signalling-only use cases
 * like access code validation and participant tracking.
 *
 * Key abstractions:
 *   Room           — a video session with settings, participants, state
 *   Participant    — a user in a room with role, media state, join time
 *   BreakoutRoom   — a sub-room spawned from a parent room
 *   WaitingRoom    — a holding area before host admission
 *   RecordingState — track active/paused/stopped recording
 *
 * Event prefix: room:*
 * REST endpoints: 22 under /api/video/
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────────────

export type RoomStatus = 'CREATED' | 'ACTIVE' | 'ENDED';
export type ParticipantRole = 'HOST' | 'CO_HOST' | 'PRESENTER' | 'ATTENDEE' | 'VIEWER';
export type LayoutMode = 'GALLERY' | 'SPEAKER' | 'PRESENTATION' | 'SIDEBAR';
export type RecordingStatus = 'IDLE' | 'RECORDING' | 'PAUSED' | 'STOPPED';

export interface VideoRoom {
  id: string;
  name: string;
  tenantId: string;
  createdBy: string;
  status: RoomStatus;
  /** Room settings */
  settings: RoomSettings;
  /** Active participants */
  participants: Participant[];
  /** Waiting room queue */
  waitingRoom: WaitingParticipant[];
  /** Active breakout rooms */
  breakoutRooms: BreakoutRoom[];
  /** Recording state */
  recording: RecordingState;
  /** Screen sharing state */
  screenShare: ScreenShareState;
  /** Scheduled time (optional — for calendar-linked meetings) */
  scheduledStart?: string;
  scheduledEnd?: string;
  /** Access control */
  accessCode?: string;
  isLocked: boolean;
  /** Metadata for plugin-specific use */
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  endedAt?: string;
}

export interface RoomSettings {
  maxParticipants: number;
  enableWaitingRoom: boolean;
  enableRecording: boolean;
  enableScreenShare: boolean;
  enableBreakoutRooms: boolean;
  enableChat: boolean;
  enableNoiseSuppression: boolean;
  enableBackgroundBlur: boolean;
  defaultLayout: LayoutMode;
  muteOnEntry: boolean;
  cameraOffOnEntry: boolean;
  /** Auto-end after N minutes with no participants */
  autoEndMinutes: number;
}

export interface Participant {
  userId: string;
  userName: string;
  role: ParticipantRole;
  isMuted: boolean;
  isCameraOff: boolean;
  isHandRaised: boolean;
  /** Which breakout room, if any (null = main room) */
  breakoutRoomId?: string;
  joinedAt: string;
  leftAt?: string;
}

export interface WaitingParticipant {
  userId: string;
  userName: string;
  requestedAt: string;
}

export interface BreakoutRoom {
  id: string;
  name: string;
  parentRoomId: string;
  participants: string[];
  /** Auto-return timer in minutes */
  autoReturnMinutes?: number;
  createdAt: string;
}

export interface RecordingState {
  status: RecordingStatus;
  startedAt?: string;
  recordingUrl?: string;
  recordingSize?: number;
}

export interface ScreenShareState {
  isActive: boolean;
  sharingUserId?: string;
  shareType?: 'SCREEN' | 'WINDOW' | 'TAB';
  startedAt?: string;
}

const DEFAULT_SETTINGS: RoomSettings = {
  maxParticipants: 100,
  enableWaitingRoom: false,
  enableRecording: true,
  enableScreenShare: true,
  enableBreakoutRooms: true,
  enableChat: true,
  enableNoiseSuppression: true,
  enableBackgroundBlur: true,
  defaultLayout: 'GALLERY',
  muteOnEntry: false,
  cameraOffOnEntry: false,
  autoEndMinutes: 60,
};

// ─── Plugin ─────────────────────────────────────────────────────────────────

export class VideoPlugin implements UCPlugin {
  readonly id = 'video';
  readonly name = 'Video Conferencing';
  readonly version = '4.0.0';
  readonly dependencies: string[] = [];

  private ctx!: PluginContext;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    ctx.logger.info('[Video] Initialised — rooms, breakouts, waiting rooms, screen share, recording');
  }

  getRoutes(): Router {
    const r = Router();

    // Room lifecycle
    r.post('/rooms', this.wrap(this.createRoom));
    r.get('/rooms', this.wrap(this.listRooms));
    r.get('/rooms/:roomId', this.wrap(this.getRoom));
    r.put('/rooms/:roomId/settings', this.wrap(this.updateSettings));
    r.post('/rooms/:roomId/end', this.wrap(this.endRoom));
    r.post('/rooms/:roomId/lock', this.wrap(this.lockRoom));

    // Participants
    r.post('/rooms/:roomId/join', this.wrap(this.joinRoom));
    r.post('/rooms/:roomId/leave', this.wrap(this.leaveRoom));
    r.post('/rooms/:roomId/kick/:userId', this.wrap(this.kickParticipant));
    r.put('/rooms/:roomId/participants/:userId/role', this.wrap(this.changeRole));
    r.post('/rooms/:roomId/participants/:userId/mute', this.wrap(this.muteParticipant));
    r.post('/rooms/:roomId/hand', this.wrap(this.raiseHand));

    // Waiting room
    r.post('/rooms/:roomId/waiting/admit/:userId', this.wrap(this.admitFromWaiting));
    r.post('/rooms/:roomId/waiting/admit-all', this.wrap(this.admitAll));
    r.post('/rooms/:roomId/waiting/reject/:userId', this.wrap(this.rejectFromWaiting));

    // Screen share
    r.post('/rooms/:roomId/screen-share/start', this.wrap(this.startScreenShare));
    r.post('/rooms/:roomId/screen-share/stop', this.wrap(this.stopScreenShare));

    // Breakout rooms
    r.post('/rooms/:roomId/breakouts', this.wrap(this.createBreakouts));
    r.post('/rooms/:roomId/breakouts/close', this.wrap(this.closeBreakouts));
    r.post('/rooms/:roomId/breakouts/:breakoutId/broadcast', this.wrap(this.broadcastToBreakout));

    // Recording
    r.post('/rooms/:roomId/recording/start', this.wrap(this.startRecording));
    r.post('/rooms/:roomId/recording/pause', this.wrap(this.pauseRecording));
    r.post('/rooms/:roomId/recording/stop', this.wrap(this.stopRecording));

    // Layout
    r.put('/rooms/:roomId/layout', this.wrap(this.setLayout));

    return r;
  }

  async shutdown(): Promise<void> {
    this.ctx.logger.info('[Video] Shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    return { status: 'healthy', details: {} };
  }

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'video.meeting', label: 'Video Meetings', description: 'Start or join video calls', icon: 'Video', routePath: '/meeting', requiredRoles: [] },
      { key: 'video.breakouts', label: 'Breakout Rooms', description: 'Split meetings into groups', icon: 'Grid', routePath: '/meeting/breakouts', requiredRoles: [] },
    ];
  }

  // ─── Public API (for other plugins) ───────────────────────────────────────

  /** Create a room programmatically — used by VirtualLessonAccess, Scheduling, etc. */
  async createRoomForPlugin(name: string, tenantId: string, createdBy: string, settings?: Partial<RoomSettings>, metadata?: Record<string, unknown>): Promise<VideoRoom> {
    return this.createRoomInternal(name, tenantId, createdBy, settings, metadata);
  }

  /** Check if a user is currently in a room */
  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    const room = await this.ctx.storage.get<VideoRoom>('video_rooms', roomId);
    if (!room) return false;
    return room.participants.some(p => p.userId === userId && !p.leftAt);
  }

  // ─── Room Lifecycle ───────────────────────────────────────────────────────

  private async createRoom(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const { name, settings, scheduledStart, scheduledEnd, accessCode, metadata } = req.body;

    const room = await this.createRoomInternal(
      name || 'Meeting', user.tenantId, user.userId, settings, metadata
    );

    if (scheduledStart) room.scheduledStart = scheduledStart;
    if (scheduledEnd) room.scheduledEnd = scheduledEnd;
    if (accessCode) room.accessCode = accessCode;

    await this.ctx.storage.set('video_rooms', room.id, room);
    res.status(201).json(room);
  }

  private async listRooms(req: Request, res: Response): Promise<void> {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;

    const rooms = await this.ctx.storage.query<VideoRoom>('video_rooms', filter, {
      limit: 50, orderBy: { field: 'createdAt', direction: 'desc' },
    });

    res.json({ rooms, total: rooms.length });
  }

  private async getRoom(req: Request, res: Response): Promise<void> {
    const room = await this.ctx.storage.get<VideoRoom>('video_rooms', req.params.roomId);
    if (!room) { res.status(404).json({ error: 'Room not found' }); return; }
    res.json(room);
  }

  private async updateSettings(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    room.settings = { ...room.settings, ...req.body };
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);
    res.json(room);
  }

  private async endRoom(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    room.status = 'ENDED';
    room.endedAt = new Date().toISOString();
    room.updatedAt = new Date().toISOString();
    // Mark all participants as left
    for (const p of room.participants) {
      if (!p.leftAt) p.leftAt = room.endedAt;
    }
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:ended', {
      roomId: room.id, endedBy: this.extractUser(req).userId,
      participantCount: room.participants.length, tenantId: room.tenantId,
    }, 'video');

    res.json(room);
  }

  private async lockRoom(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    room.isLocked = req.body.locked !== false;
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);
    res.json({ isLocked: room.isLocked });
  }

  // ─── Participants ─────────────────────────────────────────────────────────

  private async joinRoom(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    const user = this.extractUser(req);
    const { accessCode, userName } = req.body;

    // Access code check
    if (room.accessCode && accessCode !== room.accessCode) {
      res.status(403).json({ error: 'Invalid access code' }); return;
    }

    // Locked room check
    if (room.isLocked) {
      res.status(403).json({ error: 'Room is locked' }); return;
    }

    // Capacity check
    const activeCount = room.participants.filter(p => !p.leftAt).length;
    if (activeCount >= room.settings.maxParticipants) {
      res.status(400).json({ error: 'Room is full' }); return;
    }

    // Waiting room check
    if (room.settings.enableWaitingRoom) {
      const isHost = room.createdBy === user.userId;
      const isAlreadyIn = room.participants.some(p => p.userId === user.userId && !p.leftAt);
      if (!isHost && !isAlreadyIn) {
        room.waitingRoom.push({
          userId: user.userId, userName: userName || user.userId,
          requestedAt: new Date().toISOString(),
        });
        room.updatedAt = new Date().toISOString();
        await this.ctx.storage.set('video_rooms', room.id, room);

        this.ctx.bus.emit('room:waiting-room-joined', {
          roomId: room.id, userId: user.userId, userName: userName || user.userId,
          tenantId: room.tenantId,
        }, 'video');

        res.json({ status: 'waiting', message: 'Waiting for host to admit you' }); return;
      }
    }

    // Admit directly
    this.admitParticipant(room, user.userId, userName || user.userId,
      room.createdBy === user.userId ? 'HOST' : 'ATTENDEE');
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:participant-joined', {
      roomId: room.id, userId: user.userId, userName: userName || user.userId,
      participantCount: room.participants.filter(p => !p.leftAt).length,
      tenantId: room.tenantId,
    }, 'video');

    if (room.status === 'CREATED') {
      room.status = 'ACTIVE';
      await this.ctx.storage.set('video_rooms', room.id, room);
    }

    res.json({ status: 'joined', room });
  }

  private async leaveRoom(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    const user = this.extractUser(req);
    const participant = room.participants.find(p => p.userId === user.userId && !p.leftAt);
    if (participant) {
      participant.leftAt = new Date().toISOString();
      room.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('video_rooms', room.id, room);

      this.ctx.bus.emit('room:participant-left', {
        roomId: room.id, userId: user.userId, userName: participant.userName,
        participantCount: room.participants.filter(p => !p.leftAt).length,
        tenantId: room.tenantId,
      }, 'video');
    }

    res.json({ success: true });
  }

  private async kickParticipant(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    const participant = room.participants.find(p => p.userId === req.params.userId && !p.leftAt);
    if (participant) {
      participant.leftAt = new Date().toISOString();
      room.updatedAt = new Date().toISOString();
      await this.ctx.storage.set('video_rooms', room.id, room);

      this.ctx.bus.emit('room:participant-kicked', {
        roomId: room.id, userId: req.params.userId, kickedBy: this.extractUser(req).userId,
        tenantId: room.tenantId,
      }, 'video');
    }

    res.json({ success: true });
  }

  private async changeRole(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    const participant = room.participants.find(p => p.userId === req.params.userId && !p.leftAt);
    if (!participant) { res.status(404).json({ error: 'Participant not found' }); return; }

    participant.role = req.body.role;
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    res.json(participant);
  }

  private async muteParticipant(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    const participant = room.participants.find(p => p.userId === req.params.userId && !p.leftAt);
    if (!participant) { res.status(404).json({ error: 'Participant not found' }); return; }

    participant.isMuted = req.body.muted !== false;
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    res.json(participant);
  }

  private async raiseHand(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    const user = this.extractUser(req);
    const participant = room.participants.find(p => p.userId === user.userId && !p.leftAt);
    if (!participant) { res.status(400).json({ error: 'Not in room' }); return; }

    participant.isHandRaised = !participant.isHandRaised;
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:hand-raised', {
      roomId: room.id, userId: user.userId, isRaised: participant.isHandRaised,
      tenantId: room.tenantId,
    }, 'video');

    res.json({ isHandRaised: participant.isHandRaised });
  }

  // ─── Waiting Room ─────────────────────────────────────────────────────────

  private async admitFromWaiting(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    const idx = room.waitingRoom.findIndex(w => w.userId === req.params.userId);
    if (idx === -1) { res.status(404).json({ error: 'User not in waiting room' }); return; }

    const waiting = room.waitingRoom.splice(idx, 1)[0];
    this.admitParticipant(room, waiting.userId, waiting.userName, 'ATTENDEE');
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:participant-joined', {
      roomId: room.id, userId: waiting.userId, userName: waiting.userName,
      tenantId: room.tenantId,
    }, 'video');

    res.json({ success: true });
  }

  private async admitAll(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    for (const waiting of room.waitingRoom) {
      this.admitParticipant(room, waiting.userId, waiting.userName, 'ATTENDEE');
    }
    room.waitingRoom = [];
    await this.ctx.storage.set('video_rooms', room.id, room);
    res.json({ success: true });
  }

  private async rejectFromWaiting(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    room.waitingRoom = room.waitingRoom.filter(w => w.userId !== req.params.userId);
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:waiting-room-rejected', {
      roomId: room.id, userId: req.params.userId, tenantId: room.tenantId,
    }, 'video');

    res.json({ success: true });
  }

  // ─── Screen Sharing ───────────────────────────────────────────────────────

  private async startScreenShare(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    if (!room.settings.enableScreenShare) {
      res.status(400).json({ error: 'Screen sharing disabled' }); return;
    }

    if (room.screenShare.isActive) {
      res.status(400).json({ error: 'Someone is already sharing' }); return;
    }

    const user = this.extractUser(req);
    room.screenShare = {
      isActive: true, sharingUserId: user.userId,
      shareType: req.body.shareType || 'SCREEN',
      startedAt: new Date().toISOString(),
    };
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:screen-share-started', {
      roomId: room.id, userId: user.userId, tenantId: room.tenantId,
    }, 'video');

    res.json(room.screenShare);
  }

  private async stopScreenShare(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    room.screenShare = { isActive: false };
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:screen-share-stopped', {
      roomId: room.id, tenantId: room.tenantId,
    }, 'video');

    res.json({ success: true });
  }

  // ─── Breakout Rooms ───────────────────────────────────────────────────────

  private async createBreakouts(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    if (!room.settings.enableBreakoutRooms) {
      res.status(400).json({ error: 'Breakout rooms disabled' }); return;
    }

    const { rooms: breakoutDefs, autoReturnMinutes } = req.body;
    // breakoutDefs: [{ name: 'Group A', userIds: [...] }, ...]

    const breakouts: BreakoutRoom[] = (breakoutDefs || []).map((def: any) => ({
      id: uuidv4(), name: def.name || 'Breakout',
      parentRoomId: room.id, participants: def.userIds || [],
      autoReturnMinutes, createdAt: new Date().toISOString(),
    }));

    room.breakoutRooms = breakouts;
    // Move participants into breakout rooms
    for (const br of breakouts) {
      for (const uid of br.participants) {
        const p = room.participants.find(pp => pp.userId === uid && !pp.leftAt);
        if (p) p.breakoutRoomId = br.id;
      }
    }
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:breakouts-created', {
      roomId: room.id, breakoutCount: breakouts.length, tenantId: room.tenantId,
    }, 'video');

    res.status(201).json({ breakoutRooms: breakouts });
  }

  private async closeBreakouts(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    // Return all participants to main room
    for (const p of room.participants) {
      if (p.breakoutRoomId) p.breakoutRoomId = undefined;
    }
    room.breakoutRooms = [];
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:breakouts-closed', { roomId: room.id, tenantId: room.tenantId }, 'video');
    res.json({ success: true });
  }

  private async broadcastToBreakout(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    this.ctx.bus.emit('room:breakout-broadcast', {
      roomId: room.id, breakoutId: req.params.breakoutId,
      message: req.body.message, fromUserId: this.extractUser(req).userId,
      tenantId: room.tenantId,
    }, 'video');

    res.json({ success: true });
  }

  // ─── Recording ────────────────────────────────────────────────────────────

  private async startRecording(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    if (!room.settings.enableRecording) {
      res.status(400).json({ error: 'Recording disabled for this room' }); return;
    }

    room.recording = { status: 'RECORDING', startedAt: new Date().toISOString() };
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:recording-started', {
      roomId: room.id, startedBy: this.extractUser(req).userId, tenantId: room.tenantId,
    }, 'video');

    res.json(room.recording);
  }

  private async pauseRecording(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    room.recording.status = 'PAUSED';
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);
    res.json(room.recording);
  }

  private async stopRecording(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    room.recording.status = 'STOPPED';
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:recording-stopped', {
      roomId: room.id, stoppedBy: this.extractUser(req).userId, tenantId: room.tenantId,
    }, 'video');

    res.json(room.recording);
  }

  // ─── Layout ───────────────────────────────────────────────────────────────

  private async setLayout(req: Request, res: Response): Promise<void> {
    const room = await this.getRequiredRoom(req, res);
    if (!room) return;

    room.settings.defaultLayout = req.body.layout || 'GALLERY';
    room.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:layout-changed', {
      roomId: room.id, layout: room.settings.defaultLayout, tenantId: room.tenantId,
    }, 'video');

    res.json({ layout: room.settings.defaultLayout });
  }

  // ─── Internal Helpers ─────────────────────────────────────────────────────

  private async createRoomInternal(
    name: string, tenantId: string, createdBy: string,
    settings?: Partial<RoomSettings>, metadata?: Record<string, unknown>
  ): Promise<VideoRoom> {
    const room: VideoRoom = {
      id: uuidv4(), name, tenantId, createdBy,
      status: 'CREATED',
      settings: { ...DEFAULT_SETTINGS, ...settings },
      participants: [], waitingRoom: [], breakoutRooms: [],
      recording: { status: 'IDLE' },
      screenShare: { isActive: false },
      isLocked: false, metadata,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('video_rooms', room.id, room);

    this.ctx.bus.emit('room:created', {
      roomId: room.id, name, createdBy, tenantId,
    }, 'video');

    return room;
  }

  private admitParticipant(room: VideoRoom, userId: string, userName: string, role: ParticipantRole): void {
    // Check if already in room
    const existing = room.participants.find(p => p.userId === userId && !p.leftAt);
    if (existing) return;

    room.participants.push({
      userId, userName, role,
      isMuted: room.settings.muteOnEntry,
      isCameraOff: room.settings.cameraOffOnEntry,
      isHandRaised: false,
      joinedAt: new Date().toISOString(),
    });
    room.updatedAt = new Date().toISOString();
  }

  private async getRequiredRoom(req: Request, res: Response): Promise<VideoRoom | null> {
    const room = await this.ctx.storage.get<VideoRoom>('video_rooms', req.params.roomId);
    if (!room) { res.status(404).json({ error: 'Room not found' }); return null; }
    return room;
  }

  private extractUser(req: Request): { userId: string; tenantId: string } {
    const u = (req as any).scholarlyUser;
    if (u) return { userId: u.userId, tenantId: u.tenantId };
    return {
      userId: (req.body?.userId || req.query?.userId || 'anonymous') as string,
      tenantId: (req.body?.tenantId || req.query?.tenantId || '__default__') as string,
    };
  }

  private wrap(fn: (req: Request, res: Response) => Promise<void>) {
    return (req: Request, res: Response) => fn.call(this, req, res).catch((err: any) => {
      this.ctx.logger.error(`[Video] Error: ${err.message}`);
      res.status(500).json({ error: 'Internal video error' });
    });
  }
}

export default VideoPlugin;
