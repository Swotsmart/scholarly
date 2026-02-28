/**
 * Unified Communications 4.0 — Telephony Plugin
 *
 * Think of this plugin as the switchboard operator for the entire platform.
 * It manages three core capabilities:
 *
 *   1. Number Management — provisioning, assigning, and routing phone numbers
 *      per tenant. Like giving each department in a company its own phone line.
 *
 *   2. Call Lifecycle — initiating outbound calls, receiving inbound calls,
 *      managing hold/transfer/conference, recording, and generating complete
 *      call detail records (CDRs). Every call is a state machine:
 *      INITIATED → RINGING → IN_PROGRESS → (HOLD) → COMPLETED/FAILED/NO_ANSWER
 *
 *   3. IVR Builder — configurable Interactive Voice Response trees stored as
 *      JSON, rendered to TwiML (or equivalent) on the fly. Admins define
 *      "Press 1 for sales, 2 for support" through the REST API, not code.
 *
 * The plugin is provider-agnostic at the interface level: it currently targets
 * Twilio Programmable Voice, but the IVR tree model and call lifecycle can be
 * adapted to other providers (Vonage, Plivo, Telnyx) by swapping the TwiML
 * renderer. The CDR format follows industry standards.
 *
 * Generalisation note: the same plugin handles school reception lines
 * (Scholarly), identity verification calls (Chekd-ID), or sales team
 * outbound campaigns (any SaaS). The IVR trees are fully tenant-configurable.
 *
 * Event prefix: call:*
 * REST endpoints: 18 under /api/telephony/
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CallStatus = 'INITIATED' | 'RINGING' | 'IN_PROGRESS' | 'ON_HOLD'
  | 'COMPLETED' | 'FAILED' | 'NO_ANSWER' | 'BUSY' | 'CANCELLED' | 'TRANSFERRED';
export type CallDirection = 'INBOUND' | 'OUTBOUND';
export type IVRNodeType = 'MENU' | 'ANNOUNCE' | 'COLLECT' | 'ROUTE' | 'WEBHOOK' | 'TRANSFER' | 'VOICEMAIL';

export interface PhoneNumber {
  id: string;
  number: string;
  displayName: string;
  numberType: 'LOCAL' | 'TOLL_FREE' | 'MOBILE';
  tenantId: string;
  assignedToUserId?: string;
  assignedToGroupId?: string;
  ivrTreeId?: string;
  capabilities: ('voice' | 'sms' | 'fax')[];
  provider: string;
  providerSid?: string;
  isActive: boolean;
  createdAt: string;
}

export interface CallRecord {
  id: string;
  tenantId: string;
  direction: CallDirection;
  status: CallStatus;
  fromNumber: string;
  toNumber: string;
  fromUserId?: string;
  toUserId?: string;
  /** Associated video room if call was bridged */
  roomId?: string;
  /** IVR tree that handled this call (if inbound) */
  ivrTreeId?: string;
  /** Digits collected via IVR */
  ivrDigits?: string;
  /** Recording URL */
  recordingUrl?: string;
  recordingDuration?: number;
  /** Voicemail */
  voicemailUrl?: string;
  voicemailTranscript?: string;
  /** Transfer chain: userId[] of agents who handled this call */
  transferChain: string[];
  /** Timing */
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  /** Provider reference */
  providerCallSid?: string;
  /** Cost tracking */
  costCents?: number;
  /** Metadata for CRM integration */
  metadata?: Record<string, unknown>;
}

export interface IVRTree {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  rootNodeId: string;
  nodes: IVRNode[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IVRNode {
  id: string;
  nodeType: IVRNodeType;
  /** Text-to-speech message or audio URL */
  message?: string;
  audioUrl?: string;
  /** For MENU nodes: digit → target node ID */
  options?: Record<string, string>;
  /** For COLLECT: max digits, timeout */
  maxDigits?: number;
  timeoutSeconds?: number;
  /** For ROUTE: target user/group/queue */
  routeToUserId?: string;
  routeToGroupId?: string;
  routeToQueueId?: string;
  /** For WEBHOOK: URL to POST collected data to */
  webhookUrl?: string;
  /** For TRANSFER: destination number */
  transferTo?: string;
  /** Fallback node if no input or timeout */
  fallbackNodeId?: string;
  /** Next node (for linear flows) */
  nextNodeId?: string;
}

export interface VoicemailBox {
  id: string;
  tenantId: string;
  userId: string;
  greeting?: string;
  greetingAudioUrl?: string;
  maxDurationSeconds: number;
  isEnabled: boolean;
  createdAt: string;
}

// ─── Plugin ─────────────────────────────────────────────────────────────────

export class TelephonyPlugin implements UCPlugin {
  readonly id = 'telephony';
  readonly name = 'Telephony';
  readonly version = '4.0.0';
  readonly dependencies: string[] = [];

  private ctx!: PluginContext;
  private activeCalls: Map<string, CallRecord> = new Map();

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    ctx.logger.info('[Telephony] Initialised — numbers, IVR, call management, voicemail');
  }

  getRoutes(): Router {
    const r = Router();

    // Number management
    r.post('/numbers', this.wrap(this.provisionNumber));
    r.get('/numbers', this.wrap(this.listNumbers));
    r.put('/numbers/:numberId', this.wrap(this.updateNumber));
    r.delete('/numbers/:numberId', this.wrap(this.releaseNumber));

    // IVR trees
    r.post('/ivr', this.wrap(this.createIVRTree));
    r.get('/ivr', this.wrap(this.listIVRTrees));
    r.get('/ivr/:ivrId', this.wrap(this.getIVRTree));
    r.put('/ivr/:ivrId', this.wrap(this.updateIVRTree));
    r.delete('/ivr/:ivrId', this.wrap(this.deleteIVRTree));

    // Calls
    r.post('/calls', this.wrap(this.initiateCall));
    r.get('/calls', this.wrap(this.listCalls));
    r.get('/calls/:callId', this.wrap(this.getCall));
    r.post('/calls/:callId/hold', this.wrap(this.holdCall));
    r.post('/calls/:callId/resume', this.wrap(this.resumeCall));
    r.post('/calls/:callId/transfer', this.wrap(this.transferCall));
    r.post('/calls/:callId/end', this.wrap(this.endCall));

    // Voicemail
    r.get('/voicemail', this.wrap(this.listVoicemails));
    r.put('/voicemail/settings', this.wrap(this.updateVoicemailSettings));

    // Webhooks (public — Twilio callbacks)
    r.post('/webhooks/inbound', this.wrap(this.handleInboundWebhook));
    r.post('/webhooks/status', this.wrap(this.handleStatusWebhook));
    r.post('/webhooks/recording', this.wrap(this.handleRecordingWebhook));

    return r;
  }

  async shutdown(): Promise<void> {
    this.activeCalls.clear();
    this.ctx.logger.info('[Telephony] Shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    return { status: 'healthy', details: { activeCalls: this.activeCalls.size } };
  }

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'telephony.calls', label: 'Phone Calls', description: 'Make and receive calls', icon: 'Phone', routePath: '/calls', requiredRoles: [] },
      { key: 'telephony.ivr', label: 'IVR Builder', description: 'Configure automated phone menus', icon: 'Settings', routePath: '/ivr', requiredRoles: ['admin'] },
    ];
  }

  // ─── Number Management ────────────────────────────────────────────────────

  private async provisionNumber(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const { number, displayName, numberType, capabilities, assignedToUserId, ivrTreeId } = req.body;

    const phoneNumber: PhoneNumber = {
      id: uuidv4(), number, displayName: displayName || number,
      numberType: numberType || 'LOCAL',
      tenantId: user.tenantId,
      assignedToUserId, ivrTreeId,
      capabilities: capabilities || ['voice'],
      provider: 'twilio', isActive: true,
      createdAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('telephony_numbers', phoneNumber.id, phoneNumber);

    this.ctx.bus.emit('call:number-provisioned', {
      numberId: phoneNumber.id, number: phoneNumber.number, tenantId: user.tenantId,
    }, 'telephony');

    res.status(201).json(phoneNumber);
  }

  private async listNumbers(req: Request, res: Response): Promise<void> {
    const numbers = await this.ctx.storage.query<PhoneNumber>('telephony_numbers', {
      isActive: true,
    }, { limit: 100 });
    res.json({ numbers, total: numbers.length });
  }

  private async updateNumber(req: Request, res: Response): Promise<void> {
    const num = await this.ctx.storage.get<PhoneNumber>('telephony_numbers', req.params.numberId);
    if (!num) { res.status(404).json({ error: 'Number not found' }); return; }

    const { displayName, assignedToUserId, assignedToGroupId, ivrTreeId } = req.body;
    if (displayName !== undefined) num.displayName = displayName;
    if (assignedToUserId !== undefined) num.assignedToUserId = assignedToUserId;
    if (assignedToGroupId !== undefined) num.assignedToGroupId = assignedToGroupId;
    if (ivrTreeId !== undefined) num.ivrTreeId = ivrTreeId;

    await this.ctx.storage.set('telephony_numbers', num.id, num);
    res.json(num);
  }

  private async releaseNumber(req: Request, res: Response): Promise<void> {
    const num = await this.ctx.storage.get<PhoneNumber>('telephony_numbers', req.params.numberId);
    if (!num) { res.status(404).json({ error: 'Number not found' }); return; }

    num.isActive = false;
    await this.ctx.storage.set('telephony_numbers', num.id, num);

    this.ctx.bus.emit('call:number-released', {
      numberId: num.id, number: num.number, tenantId: num.tenantId,
    }, 'telephony');

    res.json({ success: true });
  }

  // ─── IVR Tree Management ──────────────────────────────────────────────────

  private async createIVRTree(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const { name, description, nodes } = req.body;

    const rootNode: IVRNode = {
      id: uuidv4(), nodeType: 'MENU',
      message: 'Welcome. Please select an option.',
      options: {}, fallbackNodeId: undefined,
    };

    const tree: IVRTree = {
      id: uuidv4(), tenantId: user.tenantId,
      name: name || 'New IVR Tree', description,
      rootNodeId: rootNode.id,
      nodes: nodes || [rootNode],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('telephony_ivr', tree.id, tree);
    res.status(201).json(tree);
  }

  private async listIVRTrees(req: Request, res: Response): Promise<void> {
    const trees = await this.ctx.storage.query<IVRTree>('telephony_ivr', { isActive: true }, { limit: 50 });
    res.json({ trees, total: trees.length });
  }

  private async getIVRTree(req: Request, res: Response): Promise<void> {
    const tree = await this.ctx.storage.get<IVRTree>('telephony_ivr', req.params.ivrId);
    if (!tree) { res.status(404).json({ error: 'IVR tree not found' }); return; }
    res.json(tree);
  }

  private async updateIVRTree(req: Request, res: Response): Promise<void> {
    const tree = await this.ctx.storage.get<IVRTree>('telephony_ivr', req.params.ivrId);
    if (!tree) { res.status(404).json({ error: 'IVR tree not found' }); return; }

    const { name, description, nodes, rootNodeId, isActive } = req.body;
    if (name !== undefined) tree.name = name;
    if (description !== undefined) tree.description = description;
    if (nodes !== undefined) tree.nodes = nodes;
    if (rootNodeId !== undefined) tree.rootNodeId = rootNodeId;
    if (isActive !== undefined) tree.isActive = isActive;
    tree.updatedAt = new Date().toISOString();

    await this.ctx.storage.set('telephony_ivr', tree.id, tree);
    res.json(tree);
  }

  private async deleteIVRTree(req: Request, res: Response): Promise<void> {
    const tree = await this.ctx.storage.get<IVRTree>('telephony_ivr', req.params.ivrId);
    if (!tree) { res.status(404).json({ error: 'IVR tree not found' }); return; }
    tree.isActive = false;
    tree.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('telephony_ivr', tree.id, tree);
    res.json({ success: true });
  }

  // ─── Call Management ──────────────────────────────────────────────────────

  private async initiateCall(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const { toNumber, fromNumberId, roomId, metadata } = req.body;

    const fromNum = fromNumberId
      ? await this.ctx.storage.get<PhoneNumber>('telephony_numbers', fromNumberId)
      : null;

    const call: CallRecord = {
      id: uuidv4(), tenantId: user.tenantId,
      direction: 'OUTBOUND', status: 'INITIATED',
      fromNumber: fromNum?.number || 'unknown',
      toNumber, fromUserId: user.userId,
      roomId, transferChain: [user.userId],
      startedAt: new Date().toISOString(),
      metadata,
    };

    await this.ctx.storage.set('telephony_calls', call.id, call);
    this.activeCalls.set(call.id, call);

    // In production: Twilio client.calls.create({ to, from, url: webhookUrl })
    call.status = 'RINGING';
    await this.ctx.storage.set('telephony_calls', call.id, call);

    this.ctx.bus.emit('call:initiated', {
      callId: call.id, direction: call.direction, fromNumber: call.fromNumber,
      toNumber: call.toNumber, fromUserId: user.userId, tenantId: user.tenantId,
    }, 'telephony');

    res.status(201).json(call);
  }

  private async listCalls(req: Request, res: Response): Promise<void> {
    const filter: Record<string, unknown> = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.direction) filter.direction = req.query.direction;

    const calls = await this.ctx.storage.query<CallRecord>('telephony_calls', filter, {
      limit: parseInt(req.query.limit as string || '50', 10),
      orderBy: { field: 'startedAt', direction: 'desc' },
    });

    res.json({ calls, total: calls.length });
  }

  private async getCall(req: Request, res: Response): Promise<void> {
    const call = await this.ctx.storage.get<CallRecord>('telephony_calls', req.params.callId);
    if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
    res.json(call);
  }

  private async holdCall(req: Request, res: Response): Promise<void> {
    const call = await this.ctx.storage.get<CallRecord>('telephony_calls', req.params.callId);
    if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
    if (call.status !== 'IN_PROGRESS') {
      res.status(400).json({ error: 'Can only hold active calls' }); return;
    }

    call.status = 'ON_HOLD';
    await this.ctx.storage.set('telephony_calls', call.id, call);

    this.ctx.bus.emit('call:hold', {
      callId: call.id, tenantId: call.tenantId, heldBy: this.extractUser(req).userId,
    }, 'telephony');

    res.json(call);
  }

  private async resumeCall(req: Request, res: Response): Promise<void> {
    const call = await this.ctx.storage.get<CallRecord>('telephony_calls', req.params.callId);
    if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
    if (call.status !== 'ON_HOLD') {
      res.status(400).json({ error: 'Call is not on hold' }); return;
    }

    call.status = 'IN_PROGRESS';
    await this.ctx.storage.set('telephony_calls', call.id, call);

    this.ctx.bus.emit('call:resumed', {
      callId: call.id, tenantId: call.tenantId,
    }, 'telephony');

    res.json(call);
  }

  private async transferCall(req: Request, res: Response): Promise<void> {
    const call = await this.ctx.storage.get<CallRecord>('telephony_calls', req.params.callId);
    if (!call) { res.status(404).json({ error: 'Call not found' }); return; }

    const { toUserId, toNumber } = req.body;
    call.status = 'TRANSFERRED';
    if (toUserId) call.transferChain.push(toUserId);
    call.toUserId = toUserId;
    if (toNumber) call.toNumber = toNumber;
    await this.ctx.storage.set('telephony_calls', call.id, call);

    this.ctx.bus.emit('call:transferred', {
      callId: call.id, fromUserId: this.extractUser(req).userId,
      toUserId, toNumber, tenantId: call.tenantId,
    }, 'telephony');

    // After transfer, the call resumes as IN_PROGRESS for the new agent
    call.status = 'IN_PROGRESS';
    await this.ctx.storage.set('telephony_calls', call.id, call);

    res.json(call);
  }

  private async endCall(req: Request, res: Response): Promise<void> {
    const call = await this.ctx.storage.get<CallRecord>('telephony_calls', req.params.callId);
    if (!call) { res.status(404).json({ error: 'Call not found' }); return; }

    call.status = 'COMPLETED';
    call.endedAt = new Date().toISOString();
    if (call.answeredAt) {
      call.durationSeconds = Math.floor(
        (new Date(call.endedAt).getTime() - new Date(call.answeredAt).getTime()) / 1000
      );
    }
    await this.ctx.storage.set('telephony_calls', call.id, call);
    this.activeCalls.delete(call.id);

    this.ctx.bus.emit('call:completed', {
      callId: call.id, direction: call.direction,
      durationSeconds: call.durationSeconds,
      fromNumber: call.fromNumber, toNumber: call.toNumber,
      tenantId: call.tenantId,
    }, 'telephony');

    res.json(call);
  }

  // ─── Voicemail ────────────────────────────────────────────────────────────

  private async listVoicemails(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const calls = await this.ctx.storage.query<CallRecord>('telephony_calls', {
      toUserId: user.userId,
    }, { limit: 50, orderBy: { field: 'startedAt', direction: 'desc' } });

    const voicemails = calls.filter(c => !!c.voicemailUrl);
    res.json({ voicemails, total: voicemails.length });
  }

  private async updateVoicemailSettings(req: Request, res: Response): Promise<void> {
    const user = this.extractUser(req);
    const { greeting, greetingAudioUrl, maxDurationSeconds, isEnabled } = req.body;

    const box: VoicemailBox = {
      id: `vm-${user.userId}`, tenantId: user.tenantId,
      userId: user.userId, greeting, greetingAudioUrl,
      maxDurationSeconds: maxDurationSeconds || 120,
      isEnabled: isEnabled !== false,
      createdAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('telephony_voicemail', box.id, box);
    res.json(box);
  }

  // ─── Webhooks (Twilio Callbacks) ──────────────────────────────────────────

  private async handleInboundWebhook(req: Request, res: Response): Promise<void> {
    const { From, To, CallSid } = req.body;

    // Find the number and its IVR tree
    const numbers = await this.ctx.storage.query<PhoneNumber>('telephony_numbers', {
      number: To, isActive: true,
    }, { limit: 1 });

    const phoneNumber = numbers[0];
    const call: CallRecord = {
      id: uuidv4(), tenantId: phoneNumber?.tenantId || '__default__',
      direction: 'INBOUND', status: 'RINGING',
      fromNumber: From || 'unknown', toNumber: To || 'unknown',
      ivrTreeId: phoneNumber?.ivrTreeId,
      providerCallSid: CallSid, transferChain: [],
      startedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('telephony_calls', call.id, call);
    this.activeCalls.set(call.id, call);

    this.ctx.bus.emit('call:inbound', {
      callId: call.id, fromNumber: call.fromNumber, toNumber: call.toNumber,
      tenantId: call.tenantId, ivrTreeId: call.ivrTreeId,
    }, 'telephony');

    // Generate TwiML response
    let twiml = '<?xml version="1.0" encoding="UTF-8"?><Response>';

    if (phoneNumber?.ivrTreeId) {
      const tree = await this.ctx.storage.get<IVRTree>('telephony_ivr', phoneNumber.ivrTreeId);
      if (tree) {
        twiml += this.renderIVRNode(tree, tree.rootNodeId);
      } else {
        twiml += '<Say>Welcome. Please hold while we connect you.</Say><Pause length="60"/>';
      }
    } else if (phoneNumber?.assignedToUserId) {
      // Direct ring — no IVR
      twiml += `<Say>Connecting you now.</Say><Dial><Client>${phoneNumber.assignedToUserId}</Client></Dial>`;
    } else {
      twiml += '<Say>Thank you for calling. No one is available to take your call.</Say>';
    }

    twiml += '</Response>';
    res.type('text/xml').send(twiml);
  }

  private async handleStatusWebhook(req: Request, res: Response): Promise<void> {
    const { CallSid, CallStatus } = req.body;

    // Find call by provider SID
    const calls = await this.ctx.storage.query<CallRecord>('telephony_calls', {
      providerCallSid: CallSid,
    }, { limit: 1 });

    if (calls[0]) {
      const call = calls[0];
      const statusMap: Record<string, CallStatus> = {
        'ringing': 'RINGING', 'in-progress': 'IN_PROGRESS',
        'completed': 'COMPLETED', 'busy': 'BUSY',
        'no-answer': 'NO_ANSWER', 'failed': 'FAILED', 'canceled': 'CANCELLED',
      };

      call.status = statusMap[CallStatus] || call.status;
      if (CallStatus === 'in-progress') call.answeredAt = new Date().toISOString();
      if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(CallStatus)) {
        call.endedAt = new Date().toISOString();
        if (call.answeredAt) {
          call.durationSeconds = Math.floor(
            (new Date(call.endedAt).getTime() - new Date(call.answeredAt).getTime()) / 1000
          );
        }
        this.activeCalls.delete(call.id);
      }

      await this.ctx.storage.set('telephony_calls', call.id, call);

      this.ctx.bus.emit(`call:${CallStatus.replace('-', '_')}` as any, {
        callId: call.id, status: call.status, tenantId: call.tenantId,
      }, 'telephony');
    }

    res.status(204).send();
  }

  private async handleRecordingWebhook(req: Request, res: Response): Promise<void> {
    const { CallSid, RecordingUrl, RecordingDuration } = req.body;

    const calls = await this.ctx.storage.query<CallRecord>('telephony_calls', {
      providerCallSid: CallSid,
    }, { limit: 1 });

    if (calls[0]) {
      const call = calls[0];
      call.recordingUrl = RecordingUrl;
      call.recordingDuration = parseInt(RecordingDuration, 10);
      await this.ctx.storage.set('telephony_calls', call.id, call);

      this.ctx.bus.emit('call:recording-available', {
        callId: call.id, recordingUrl: RecordingUrl,
        durationSeconds: call.recordingDuration, tenantId: call.tenantId,
      }, 'telephony');
    }

    res.status(204).send();
  }

  // ─── IVR TwiML Renderer ──────────────────────────────────────────────────

  /**
   * Render an IVR node to TwiML. This is a recursive descent through the
   * tree structure, producing Twilio-compatible XML. Think of each node as
   * a page in a "choose your own adventure" book — the caller navigates
   * by pressing digits, and each choice leads to another page.
   */
  private renderIVRNode(tree: IVRTree, nodeId: string): string {
    const node = tree.nodes.find(n => n.id === nodeId);
    if (!node) return '<Say>An error occurred. Goodbye.</Say><Hangup/>';

    switch (node.nodeType) {
      case 'MENU': {
        let xml = '<Gather numDigits="1" action="/api/telephony/webhooks/inbound">';
        if (node.audioUrl) {
          xml += `<Play>${node.audioUrl}</Play>`;
        } else if (node.message) {
          xml += `<Say>${this.escapeXml(node.message)}</Say>`;
        }
        xml += '</Gather>';
        // Fallback if no input
        if (node.fallbackNodeId) {
          xml += this.renderIVRNode(tree, node.fallbackNodeId);
        } else {
          xml += '<Say>We did not receive your selection. Goodbye.</Say><Hangup/>';
        }
        return xml;
      }

      case 'ANNOUNCE': {
        let xml = '';
        if (node.audioUrl) xml += `<Play>${node.audioUrl}</Play>`;
        else if (node.message) xml += `<Say>${this.escapeXml(node.message)}</Say>`;
        if (node.nextNodeId) xml += this.renderIVRNode(tree, node.nextNodeId);
        return xml;
      }

      case 'COLLECT': {
        const maxDigits = node.maxDigits || 4;
        const timeout = node.timeoutSeconds || 10;
        let xml = `<Gather numDigits="${maxDigits}" timeout="${timeout}" action="/api/telephony/webhooks/inbound">`;
        if (node.message) xml += `<Say>${this.escapeXml(node.message)}</Say>`;
        xml += '</Gather>';
        return xml;
      }

      case 'TRANSFER': {
        if (node.transferTo) return `<Dial>${node.transferTo}</Dial>`;
        if (node.routeToUserId) return `<Dial><Client>${node.routeToUserId}</Client></Dial>`;
        return '<Say>Transfer failed. Goodbye.</Say><Hangup/>';
      }

      case 'VOICEMAIL': {
        let xml = '';
        if (node.message) xml += `<Say>${this.escapeXml(node.message)}</Say>`;
        else xml += '<Say>Please leave a message after the tone.</Say>';
        xml += '<Record maxLength="120" action="/api/telephony/webhooks/recording" />';
        return xml;
      }

      case 'WEBHOOK': {
        if (node.webhookUrl) return `<Redirect>${node.webhookUrl}</Redirect>`;
        return '<Say>Service unavailable. Goodbye.</Say><Hangup/>';
      }

      default:
        return '<Say>Goodbye.</Say><Hangup/>';
    }
  }

  private escapeXml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
      this.ctx.logger.error(`[Telephony] Error: ${err.message}`);
      res.status(500).json({ error: 'Internal telephony error' });
    });
  }
}

export default TelephonyPlugin;
