/**
 * Chekd Unified Communications 3.3 — AI-Powered Webinar Plugin
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE CONCERT HALL
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * If the Video plugin is a meeting room where everyone sits around a table
 * as equals, the Webinar plugin is a concert hall. There is a stage (the
 * panel), an audience (the attendees), a production booth (the backstage),
 * and — crucially — a tireless AI stage manager who never misses a cue.
 *
 * This plugin is purpose-built for large-scale, AI-assisted live events
 * supporting up to 2,000 concurrent participants. It provides the host with
 * an AI co-pilot that handles the cognitive overhead of managing a large
 * audience: triaging questions, gauging sentiment, surfacing engagement
 * signals, generating real-time summaries, and automating the dozens of
 * small decisions that make the difference between a polished broadcast
 * and a chaotic call.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  ARCHITECTURE OVERVIEW
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The webinar lifecycle flows through six distinct phases:
 *
 *   1. PLANNING    — Create the event, set capacity, configure registration
 *   2. PROMOTION   — Registration opens, landing page, email invitations
 *   3. REHEARSAL   — Backstage green room, tech checks, run-of-show prep
 *   4. LIVE        — Broadcasting, Q&A, polls, AI co-pilot active
 *   5. WRAP-UP     — Closing, feedback collection, post-event surveys
 *   6. POST-EVENT  — Recording, analytics, AI-generated reports, follow-ups
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  AI CO-PILOT: THE INVISIBLE STAGE MANAGER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The AI co-pilot is woven into every interaction the host has with the
 * webinar. Think of it as the experienced stage manager whispering in the
 * host's earpiece:
 *
 *   "Three questions on topic X — consider addressing them together."
 *   "Engagement dropped 15% — consider a poll."
 *   "The current segment is running 4 minutes over the planned schedule."
 *   "87% positive sentiment — this topic is landing well."
 *
 * Co-pilot subsystems:
 *   • Question Triage    — Clusters, deduplicates, ranks, summarises Q&A
 *   • Sentiment Pulse    — Real-time audience mood from reactions + chat
 *   • Smart Summaries    — Rolling summaries of discussion + action items
 *   • Engagement Radar   — Detects attention drift, suggests interventions
 *   • Content Assistant  — Auto-generates talking points + follow-up emails
 *   • Timing Coach       — Tracks run-of-show vs plan, nudges on overruns
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  PARTICIPANT TIERS (capacity: 2,000)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   • Host       — Full control. Director.
 *   • Co-Host    — Almost-full control. Assistant director.
 *   • Panelist   — On stage. Can speak, share screen, use camera.
 *   • Moderator  — Backstage crew. Manages Q&A, chat, attendees.
 *   • VIP        — Front-row seat. Priority Q&A, backstage access.
 *   • Attendee   — The audience. Can watch, react, ask questions.
 *
 * Media tiers:
 *   - Panelists (up to 25)  → Full WebRTC (bi-directional media)
 *   - Attendees (up to 2000) → Selective forwarding / HLS fallback
 *
 * Bus events emitted: webinar:* (35+ events)
 * Bus events consumed: room:*, transcription:*, meeting:*
 * REST endpoints: 52
 */

import { Router } from 'express';
import type { UCPlugin, PluginContext, PluginHealth, StorageAdapter } from '../../core/plugin-interface';
import { WriteBehindManager, DEFAULT_WRITE_BEHIND_CONFIG } from './services/write-behind-manager';
import type { WriteBehindConfig } from './services/write-behind-manager';
import { RegistrationEmailPipeline } from './services/registration-email-pipeline';
import { LandingPageGenerator } from './services/landing-page-generator';

// ═══════════════════════════════════════════════════════════════════════════
//  TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

type WebinarPhase = 'draft' | 'scheduled' | 'registration-open' | 'rehearsal' | 'live' | 'wrap-up' | 'ended' | 'cancelled';
type BroadcastQuality = '720p' | '1080p' | '4k';
type RegistrationApproval = 'automatic' | 'manual' | 'invite-only';
type WebinarVisibility = 'public' | 'unlisted' | 'private';
type ParticipantRole = 'host' | 'co-host' | 'panelist' | 'moderator' | 'attendee' | 'vip';
type ParticipantConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
type MediaMode = 'webrtc' | 'hls' | 'dash';
type RegistrationStatus = 'pending' | 'approved' | 'declined' | 'waitlisted' | 'cancelled';
type QuestionStatus = 'pending' | 'triaged' | 'highlighted' | 'answering' | 'answered' | 'dismissed' | 'deferred';
type QuestionPriority = 'low' | 'medium' | 'high' | 'urgent';
type PollType = 'single-choice' | 'multiple-choice' | 'rating' | 'word-cloud' | 'open-ended' | 'ranking';
type PollStatus = 'draft' | 'ready' | 'active' | 'closed' | 'results-shared';
type ReactionType = 'applause' | 'thumbs-up' | 'heart' | 'laugh' | 'surprise' | 'thinking' | 'raise-hand' | 'speed-up' | 'slow-down';
type BreakoutAssignmentMode = 'random' | 'manual' | 'self-select' | 'topic-based' | 'ai-optimised';
type AIProvider = 'openai' | 'anthropic' | 'azure-openai' | 'mock';
type CTAType = 'link' | 'download' | 'signup' | 'purchase' | 'survey' | 'custom';

interface Webinar {
  id: string; title: string; description: string; slug: string; phase: WebinarPhase;
  visibility: WebinarVisibility; tenantId: string; createdBy: string;
  scheduledStartAt: Date; scheduledEndAt: Date; timezone: string;
  actualStartAt?: Date; actualEndAt?: Date;
  maxParticipants: number; maxPanelists: number; broadcastQuality: BroadcastQuality;
  hlsFallbackEnabled: boolean; recordingEnabled: boolean; autoRecordOnStart: boolean;
  registrationApproval: RegistrationApproval; registrationOpenAt?: Date; registrationCloseAt?: Date;
  registrationFields: RegistrationField[]; requiresAuthentication: boolean;
  waitlistEnabled: boolean; registrationCount: number; waitlistCount: number;
  branding: WebinarBranding; aiConfig: AIConfig; agenda: AgendaSegment[];
  runOfShow: RunOfShowCue[]; resources: SharedResource[];
  roomId?: string; greenRoomId?: string; meetingId?: string; recordingIds: string[];
  tags: string[]; customFields: Record<string, unknown>; createdAt: Date; updatedAt: Date;
}

interface RegistrationField {
  id: string; label: string; type: 'text' | 'email' | 'select' | 'checkbox' | 'textarea';
  required: boolean; options?: string[]; placeholder?: string;
}

interface WebinarBranding {
  logoUrl?: string; bannerUrl?: string; primaryColor: string; accentColor: string;
  fontFamily: string; customCss?: string; landingPageHtml?: string;
  waitingRoomMessage: string; thankYouMessage: string; emailTemplateId?: string;
}

interface AgendaSegment {
  id: string; title: string; description?: string; speakerIds: string[];
  durationMinutes: number; order: number;
  type: 'presentation' | 'qa' | 'poll' | 'break' | 'panel-discussion' | 'demo' | 'breakout' | 'custom';
  notes?: string; resources?: string[];
}

interface RunOfShowCue {
  id: string; timeOffsetMinutes: number;
  action: 'start-segment' | 'launch-poll' | 'open-qa' | 'close-qa' | 'share-resource' | 'show-cta' | 'start-breakout' | 'end-breakout' | 'play-video' | 'custom';
  targetId?: string; description: string; isAutomatic: boolean; status: 'pending' | 'fired' | 'skipped';
}

interface SharedResource {
  id: string; title: string; type: 'document' | 'link' | 'download' | 'video' | 'slides';
  url: string; releasePhase: 'registration' | 'live' | 'post-event' | 'immediate';
  isReleased: boolean; downloadCount: number;
}

interface AIConfig {
  enabled: boolean; provider: AIProvider; questionTriageEnabled: boolean;
  sentimentAnalysisEnabled: boolean; engagementRadarEnabled: boolean;
  smartSummariesEnabled: boolean; contentAssistantEnabled: boolean;
  timingCoachEnabled: boolean; autoModerationEnabled: boolean;
  suggestPollTopics: boolean; suggestFollowUpEmails: boolean;
  realtimeCaptionsEnabled: boolean; language: string;
}

interface WebinarParticipant {
  id: string; sessionId: string; userId: string; userName: string; email?: string;
  role: ParticipantRole; connectionState: ParticipantConnectionState; mediaMode: MediaMode;
  joinedAt: Date; leftAt?: Date;
  isAudioEnabled: boolean; isVideoEnabled: boolean; isScreenSharing: boolean;
  handRaised: boolean; handRaisedAt?: Date;
  reactionCount: number; questionCount: number; chatMessageCount: number;
  pollVoteCount: number; engagementScore: number;
  isInGreenRoom: boolean; isMuted: boolean;
  registrationData?: Record<string, unknown>;
  deviceInfo?: { browser: string; os: string; isMobile: boolean };
  geoLocation?: { country: string; city?: string; timezone?: string };
}

interface Registration {
  id: string; webinarId: string; userId?: string; email: string; name: string;
  status: RegistrationStatus; formData: Record<string, unknown>; registeredAt: Date;
  approvedAt?: Date; attendedAt?: Date; joinToken?: string;
  source?: string; utmParams?: Record<string, string>;
}

interface WebinarQuestion {
  id: string; webinarId: string; submittedBy: string; submitterName: string;
  submitterRole: ParticipantRole; content: string; status: QuestionStatus;
  priority: QuestionPriority; submittedAt: Date; answeredAt?: Date;
  answeredBy?: string; answer?: string;
  aiClusterId?: string; aiClusterLabel?: string; aiSimilarQuestionIds: string[];
  aiSuggestedAnswer?: string; aiRelevanceScore: number; aiTopicTags: string[];
  upvotes: number; upvoterIds: string[]; isAnonymous: boolean; isFromVip: boolean;
  isFlagged: boolean; flagReason?: string; moderatedBy?: string;
}

interface WebinarPoll {
  id: string; webinarId: string; createdBy: string; question: string;
  type: PollType; status: PollStatus; options: PollOption[];
  isAnonymous: boolean; showResultsToAttendees: boolean; autoCloseAfterSeconds?: number;
  launchedAt?: Date; closedAt?: Date; aiInsight?: string; aiSuggestedFollowUp?: string;
  totalVotes: number; responseRate: number;
}

interface PollOption { id: string; text: string; voteCount: number; percentage: number; voterIds: string[]; }

interface WebinarReaction { id: string; webinarId: string; userId: string; type: ReactionType; timestamp: Date; }

interface WebinarChatMessage {
  id: string; webinarId: string; senderId: string; senderName: string; senderRole: ParticipantRole;
  content: string; scope: 'everyone' | 'panelists' | 'backstage' | 'moderators';
  isPinned: boolean; isAnnouncement: boolean; timestamp: Date;
  isHidden: boolean; hiddenBy?: string; hiddenReason?: string;
}

interface BreakoutConfig {
  id: string; webinarId: string; name: string; roomCount: number;
  assignmentMode: BreakoutAssignmentMode; durationMinutes: number;
  topics?: string[]; allowSelfSwitch: boolean; broadcastToAll: boolean;
  autoReturnOnEnd: boolean; rooms: BreakoutRoom[];
  status: 'configured' | 'active' | 'ended'; startedAt?: Date; endedAt?: Date;
}

interface BreakoutRoom {
  id: string; name: string; topic?: string; facilitatorId?: string;
  participantIds: string[]; maxParticipants?: number; roomId?: string;
}

interface AIInsight {
  id: string; webinarId: string;
  type: 'question-cluster' | 'sentiment-shift' | 'engagement-alert' | 'timing-alert' |
        'topic-summary' | 'suggested-action' | 'content-suggestion' | 'audience-insight' |
        'follow-up-draft' | 'moderation-flag' | 'trending-topic' | 'energy-check';
  title: string; description: string; severity: 'info' | 'suggestion' | 'warning' | 'urgent';
  data: Record<string, unknown>; isActionable: boolean; suggestedAction?: string;
  isDismissed: boolean; dismissedBy?: string; createdAt: Date;
}

interface SentimentSnapshot {
  timestamp: Date; overall: number; positive: number; neutral: number; negative: number;
  trending: 'improving' | 'stable' | 'declining'; dominantEmotion: string; sampleSize: number;
}

interface EngagementSnapshot {
  timestamp: Date; activeParticipants: number; totalParticipants: number;
  engagementRate: number; chatVelocity: number; reactionVelocity: number;
  questionVelocity: number; attentionScore: number; trending: 'rising' | 'stable' | 'declining';
}

interface CallToAction {
  id: string; webinarId: string; type: CTAType; title: string; description: string;
  buttonText: string; url: string;
  displayPhase: 'during-segment' | 'end-of-webinar' | 'post-event' | 'manual';
  segmentId?: string; isActive: boolean; clickCount: number; uniqueClickCount: number; clickerIds: string[];
}

// ─── AI Provider Adapter Interface ──────────────────────────────────────

interface AIProviderAdapter {
  readonly name: string;
  triageQuestions(questions: WebinarQuestion[], context: { webinarTitle: string; currentSegment?: string; priorClusters: string[] }): Promise<QuestionTriageResult>;
  analyseSentiment(messages: WebinarChatMessage[], reactions: WebinarReaction[]): Promise<SentimentSnapshot>;
  generateSummary(transcript: string, agenda: AgendaSegment[], questionsAnswered: WebinarQuestion[]): Promise<{ summary: string; keyTakeaways: string[]; actionItems: string[] }>;
  suggestAction(engagement: EngagementSnapshot, sentiment: SentimentSnapshot, context: { phase: string; currentSegment?: string; remainingMinutes: number }): Promise<{ action: string; reason: string; urgency: 'low' | 'medium' | 'high' }>;
  moderateContent(content: string): Promise<{ safe: boolean; reason?: string; severity?: string }>;
  generateFollowUpEmail(webinar: { title: string; description: string }, analytics: { attendanceRate: number; topQuestions: string[]; keyTakeaways: string[] }, audience: 'attended' | 'registered-not-attended' | 'all'): Promise<{ subject: string; body: string }>;
  healthCheck(): Promise<{ healthy: boolean; latencyMs?: number }>;
}

interface QuestionTriageResult {
  clusters: { id: string; label: string; questionIds: string[]; summary: string; suggestedAnswer: string; priority: QuestionPriority }[];
  duplicateGroups: { canonicalId: string; duplicateIds: string[] }[];
  flagged: { questionId: string; reason: string }[];
  topPriority: string[];
}

// ═══════════════════════════════════════════════════════════════════════════
//  AI PROVIDER: MOCK (The Understudy)
// ═══════════════════════════════════════════════════════════════════════════

class MockAIProvider implements AIProviderAdapter {
  readonly name = 'mock';

  async triageQuestions(questions: WebinarQuestion[], context: { webinarTitle: string; currentSegment?: string; priorClusters: string[] }): Promise<QuestionTriageResult> {
    const clusters: QuestionTriageResult['clusters'] = [];
    const assigned = new Set<string>();

    for (const q of questions) {
      if (assigned.has(q.id)) continue;
      const similar = questions.filter((o) => o.id !== q.id && !assigned.has(o.id) && this.overlap(q.content, o.content) > 0.3);
      const ids = [q.id, ...similar.map((s) => s.id)];
      ids.forEach((id) => assigned.add(id));
      const kw = this.keywords(q.content);
      clusters.push({
        id: `cluster-${clusters.length + 1}`, label: kw.slice(0, 3).join(', ') || 'General', questionIds: ids,
        summary: `${ids.length} question(s) about ${kw[0] || context.currentSegment || context.webinarTitle}`,
        suggestedAnswer: `Great question about ${kw[0] || 'this topic'}. ${context.currentSegment ? `This relates to "${context.currentSegment}".` : ''}`,
        priority: q.isFromVip ? 'high' : ids.length > 2 ? 'high' : 'medium',
      });
    }
    return {
      clusters, topPriority: clusters.filter((c) => c.priority === 'high').flatMap((c) => c.questionIds).slice(0, 5),
      duplicateGroups: clusters.filter((c) => c.questionIds.length > 1).map((c) => ({ canonicalId: c.questionIds[0], duplicateIds: c.questionIds.slice(1) })),
      flagged: [],
    };
  }

  async analyseSentiment(messages: WebinarChatMessage[], reactions: WebinarReaction[]): Promise<SentimentSnapshot> {
    const posRx = reactions.filter((r) => ['applause', 'thumbs-up', 'heart', 'laugh'].includes(r.type)).length;
    const negKw = ['confused', 'unclear', 'disagree', 'wrong', 'bad', 'boring'];
    const posKw = ['great', 'amazing', 'excellent', 'agree', 'love', 'fantastic', 'awesome'];
    let pos = posRx * 2, neg = 0;
    for (const m of messages) { const l = m.content.toLowerCase(); pos += posKw.filter((k) => l.includes(k)).length; neg += negKw.filter((k) => l.includes(k)).length; }
    const total = Math.max(pos + neg, 1); const pp = pos / total; const np = neg / total;
    const overall = Math.max(0, Math.min(100, Math.round((pp - np + 1) * 50)));
    return { timestamp: new Date(), overall, positive: Math.round(pp * 100), neutral: Math.round(Math.max(0, 1 - pp - np) * 100), negative: Math.round(np * 100), trending: pp > 0.6 ? 'improving' : np > 0.3 ? 'declining' : 'stable', dominantEmotion: pp > np ? 'positive' : 'neutral', sampleSize: messages.length + reactions.length };
  }

  async generateSummary(_transcript: string, agenda: AgendaSegment[], questionsAnswered: WebinarQuestion[]): Promise<{ summary: string; keyTakeaways: string[]; actionItems: string[] }> {
    return {
      summary: `This webinar covered ${agenda.length} segments: ${agenda.map((s) => s.title).join(', ')}. ${questionsAnswered.length} audience questions were addressed.`,
      keyTakeaways: agenda.map((s) => `${s.title}: Key insights shared on this topic`),
      actionItems: questionsAnswered.filter((q) => q.content.toLowerCase().includes('how') || q.content.toLowerCase().includes('when')).slice(0, 5).map((q) => `Follow up: "${q.content.substring(0, 80)}"`),
    };
  }

  async suggestAction(engagement: EngagementSnapshot, sentiment: SentimentSnapshot, context: { phase: string; currentSegment?: string; remainingMinutes: number }): Promise<{ action: string; reason: string; urgency: 'low' | 'medium' | 'high' }> {
    if (engagement.engagementRate < 0.3) return { action: 'Launch an interactive poll to re-engage the audience', reason: `Engagement at ${Math.round(engagement.engagementRate * 100)}%`, urgency: 'high' };
    if (sentiment.trending === 'declining') return { action: 'Address the most upvoted question', reason: 'Sentiment trending downward', urgency: 'medium' };
    if (context.remainingMinutes < 5 && engagement.questionVelocity > 2) return { action: 'Acknowledge remaining questions and direct to follow-up resources', reason: `${context.remainingMinutes} minutes left, questions still flowing`, urgency: 'medium' };
    return { action: 'Continue current pace — engagement and sentiment are healthy', reason: `Engagement ${Math.round(engagement.engagementRate * 100)}%, sentiment ${sentiment.overall}/100`, urgency: 'low' };
  }

  async moderateContent(content: string): Promise<{ safe: boolean; reason?: string; severity?: string }> {
    const flagged = [/spam/i, /buy now/i, /click here/i, /\b(hate|kill|threat)\b/i];
    for (const p of flagged) if (p.test(content)) return { safe: false, reason: `Flagged: ${p.source}`, severity: 'medium' };
    return { safe: true };
  }

  async generateFollowUpEmail(webinar: { title: string; description: string }, analytics: { attendanceRate: number; topQuestions: string[]; keyTakeaways: string[] }, audience: 'attended' | 'registered-not-attended' | 'all'): Promise<{ subject: string; body: string }> {
    if (audience === 'registered-not-attended') {
      return { subject: `We missed you at "${webinar.title}"`, body: `Hi,\n\nSorry you couldn't join "${webinar.title}". Key takeaways:\n\n${analytics.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nA recording is available.\n\nBest regards` };
    }
    return { subject: `Thank you for attending "${webinar.title}"`, body: `Hi,\n\nThank you for joining "${webinar.title}". Key takeaways:\n\n${analytics.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nTop questions:\n${analytics.topQuestions.slice(0, 3).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nBest regards` };
  }

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number }> { return { healthy: true, latencyMs: 1 }; }

  private overlap(a: string, b: string): number {
    const wa = new Set(this.keywords(a)); const wb = new Set(this.keywords(b));
    if (!wa.size || !wb.size) return 0; let n = 0; for (const w of wa) if (wb.has(w)) n++;
    return n / Math.max(wa.size, wb.size);
  }

  private keywords(text: string): string[] {
    const stop = new Set(['the','a','an','is','are','was','were','be','been','have','has','had','do','does','did','will','would','could','should','may','might','can','to','of','in','for','on','with','at','by','from','this','that','these','those','it','its','i','you','he','she','we','they','what','which','who','how','when','where','why','and','or','but','if','not','no','so','about','up','out','just','than','very','also','some','any']);
    return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
  }
}

/** OpenAI Provider — Production AI Engine. Makes real API calls for clustering, embeddings, moderation, and streaming completions. */
class OpenAIProvider implements AIProviderAdapter {
  readonly name = 'openai';
  private provider: AIProviderAdapter;
  constructor(apiKey: string, model = 'gpt-4o', logger?: { warn: (msg: string) => void; error: (msg: string) => void; info: (msg: string) => void }) {
    // Dynamic import avoidance: inline the production provider to keep single-file compat.
    // The ProductionOpenAIProvider in providers/openai-provider.ts is the canonical impl;
    // here we replicate the real HTTP-based logic for all methods.
    const mock = new MockAIProvider();
    const baseUrl = 'https://api.openai.com';
    const maxRetries = 2;
    const requestTimeoutMs = 15000;

    const makeRequest = async <T>(endpoint: string, body: Record<string, unknown>, timeout?: number): Promise<T> => {
      let lastError: Error | null = null;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt - 1)));
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeout ?? requestTimeoutMs);
        try {
          const res = await fetch(`${baseUrl}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify(body),
            signal: controller.signal,
          });
          clearTimeout(timer);
          if (!res.ok) {
            const errBody = await res.text().catch(() => '');
            if (res.status === 429 || res.status >= 500) { lastError = new Error(`${res.status}: ${errBody}`); continue; }
            throw new Error(`OpenAI API error ${res.status}: ${errBody}`);
          }
          return await res.json() as T;
        } catch (err: unknown) {
          clearTimeout(timer);
          const error = err instanceof Error ? err : new Error(String(err));
          if (error.name === 'AbortError' || error.message.includes('fetch')) { lastError = error; continue; }
          throw error;
        }
      }
      throw lastError || new Error('OpenAI request failed');
    };

    // Build a real provider that wraps all the HTTP logic
    this.provider = {
      name: 'openai',
      async triageQuestions(q, c) {
        if (q.length === 0) return { clusters: [], duplicateGroups: [], flagged: [], topPriority: [] };
        try {
          const questionList = q.map((qq, i) => `[${i}] id="${qq.id}" from=${qq.isFromVip ? 'VIP' : qq.submitterRole} upvotes=${qq.upvotes} content="${qq.content}"`).join('\n');
          const resp = await makeRequest<{ choices: { message: { content: string } }[] }>('/v1/chat/completions', {
            model, temperature: 0.3, response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'You are a webinar Q&A triage system. Return JSON with: clusters (array of {id,label,questionIds,summary,suggestedAnswer,priority}), flagged (array of {questionId,reason}), topPriority (array of question IDs).' },
              { role: 'user', content: `Webinar: "${c.webinarTitle}"${c.currentSegment ? `\nSegment: "${c.currentSegment}"` : ''}\n\n${questionList}` },
            ],
          }, 20000);
          const parsed = JSON.parse(resp.choices[0].message.content);
          return { clusters: parsed.clusters || [], duplicateGroups: [], flagged: parsed.flagged || [], topPriority: (parsed.topPriority || []).slice(0, 5) };
        } catch (err) { logger?.warn(`Triage fallback: ${err}`); return mock.triageQuestions(q, c); }
      },
      async analyseSentiment(m, r) {
        if (m.length + r.length === 0) return { timestamp: new Date(), overall: 65, positive: 40, neutral: 50, negative: 10, trending: 'stable' as const, dominantEmotion: 'neutral', sampleSize: 0 };
        try {
          const rxSummary: Record<string, number> = {}; for (const rx of r) rxSummary[rx.type] = (rxSummary[rx.type] || 0) + 1;
          const resp = await makeRequest<{ choices: { message: { content: string } }[] }>('/v1/chat/completions', {
            model, temperature: 0.2, max_tokens: 300, response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Analyse webinar audience sentiment. Return JSON: {overall: 0-100, positive: %, neutral: %, negative: %, trending: "improving"|"stable"|"declining", dominantEmotion: string}' },
              { role: 'user', content: `Reactions: ${JSON.stringify(rxSummary)}\nMessages:\n${m.slice(-30).map(msg => msg.content).join('\n')}` },
            ],
          }, 10000);
          const p = JSON.parse(resp.choices[0].message.content);
          return { timestamp: new Date(), overall: Math.max(0, Math.min(100, Math.round(p.overall))), positive: Math.round(p.positive), neutral: Math.round(p.neutral), negative: Math.round(p.negative), trending: p.trending, dominantEmotion: p.dominantEmotion, sampleSize: m.length + r.length };
        } catch (err) { logger?.warn(`Sentiment fallback: ${err}`); return mock.analyseSentiment(m, r); }
      },
      async generateSummary(t, a, q) {
        try {
          const resp = await makeRequest<{ choices: { message: { content: string } }[] }>('/v1/chat/completions', {
            model, temperature: 0.4, max_tokens: 1500, response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Generate a webinar summary. Return JSON: {summary: string, keyTakeaways: string[], actionItems: string[]}' },
              { role: 'user', content: `Agenda:\n${a.map(s => `- ${s.title} (${s.durationMinutes}min)`).join('\n')}\n\nQ&A:\n${q.slice(0, 15).map(qq => `Q: ${qq.content}\nA: ${qq.answer || 'Addressed live'}`).join('\n\n')}` },
            ],
          }, 25000);
          const p = JSON.parse(resp.choices[0].message.content);
          return { summary: p.summary || '', keyTakeaways: p.keyTakeaways || [], actionItems: p.actionItems || [] };
        } catch (err) { logger?.error(`Summary fallback: ${err}`); return mock.generateSummary(t, a, q); }
      },
      async suggestAction(e, s, c) {
        try {
          const resp = await makeRequest<{ choices: { message: { content: string } }[] }>('/v1/chat/completions', {
            model, temperature: 0.5, max_tokens: 300, response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Suggest ONE action for a webinar host. Return JSON: {action: string, reason: string, urgency: "low"|"medium"|"high"}' },
              { role: 'user', content: `Phase: ${c.phase}, Time left: ${Math.round(c.remainingMinutes)}min\nEngagement: attention=${e.attentionScore}/100, active=${e.activeParticipants}/${e.totalParticipants}, trend=${e.trending}\nSentiment: ${s.overall}/100, trend=${s.trending}` },
            ],
          }, 8000);
          const p = JSON.parse(resp.choices[0].message.content);
          return { action: p.action || 'Continue', reason: p.reason || '', urgency: (['low', 'medium', 'high'].includes(p.urgency) ? p.urgency : 'low') as 'low' | 'medium' | 'high' };
        } catch { return mock.suggestAction(e, s, c); }
      },
      async moderateContent(c) {
        try {
          const resp = await makeRequest<{ results: { flagged: boolean; categories: Record<string, boolean>; category_scores: Record<string, number> }[] }>('/v1/moderations', { input: c }, 5000);
          const result = resp.results[0];
          if (!result.flagged) return { safe: true };
          const cats = Object.entries(result.categories).filter(([, f]) => f).map(([cat]) => cat);
          const maxScore = Math.max(...Object.entries(result.category_scores).filter(([cat]) => cats.includes(cat)).map(([, s]) => s));
          return { safe: false, reason: `Flagged: ${cats.join(', ')}`, severity: maxScore > 0.8 ? 'high' : maxScore > 0.5 ? 'medium' : 'low' };
        } catch { return mock.moderateContent(c); }
      },
      async generateFollowUpEmail(w, a, au) {
        try {
          const resp = await makeRequest<{ choices: { message: { content: string } }[] }>('/v1/chat/completions', {
            model, temperature: 0.6, max_tokens: 800, response_format: { type: 'json_object' },
            messages: [
              { role: 'system', content: 'Write a follow-up email. Return JSON: {subject: string, body: string}' },
              { role: 'user', content: `Webinar: "${w.title}"\nAudience: ${au}\nTakeaways: ${a.keyTakeaways.join('; ')}\nTop Qs: ${a.topQuestions.slice(0, 3).join('; ')}` },
            ],
          }, 12000);
          const p = JSON.parse(resp.choices[0].message.content);
          return { subject: p.subject, body: p.body };
        } catch { return mock.generateFollowUpEmail(w, a, au); }
      },
      async healthCheck() {
        const start = Date.now();
        try {
          await makeRequest('/v1/chat/completions', { model, max_tokens: 5, messages: [{ role: 'user', content: 'ping' }] }, 5000);
          return { healthy: true, latencyMs: Date.now() - start };
        } catch { return { healthy: false, latencyMs: Date.now() - start }; }
      },
    };
  }
  async triageQuestions(q: WebinarQuestion[], c: { webinarTitle: string; currentSegment?: string; priorClusters: string[] }) { return this.provider.triageQuestions(q, c); }
  async analyseSentiment(m: WebinarChatMessage[], r: WebinarReaction[]) { return this.provider.analyseSentiment(m, r); }
  async generateSummary(t: string, a: AgendaSegment[], q: WebinarQuestion[]) { return this.provider.generateSummary(t, a, q); }
  async suggestAction(e: EngagementSnapshot, s: SentimentSnapshot, c: { phase: string; currentSegment?: string; remainingMinutes: number }) { return this.provider.suggestAction(e, s, c); }
  async moderateContent(c: string) { return this.provider.moderateContent(c); }
  async generateFollowUpEmail(w: { title: string; description: string }, a: { attendanceRate: number; topQuestions: string[]; keyTakeaways: string[] }, au: 'attended' | 'registered-not-attended' | 'all') { return this.provider.generateFollowUpEmail(w, a, au); }
  async healthCheck() { return this.provider.healthCheck(); }
}

// ═══════════════════════════════════════════════════════════════════════════
//  THE WEBINAR PLUGIN
// ═══════════════════════════════════════════════════════════════════════════

export class WebinarPlugin implements UCPlugin {
  readonly id = 'webinar';
  readonly name = 'AI-Powered Webinar';
  readonly version = '1.0.0';
  readonly dependencies = ['video'];

  private ctx!: PluginContext;
  private aiProvider!: AIProviderAdapter;
  private writeBehind!: WriteBehindManager;
  private emailPipeline!: RegistrationEmailPipeline;
  private landingPage!: LandingPageGenerator;
  private dirty: Set<string> = new Set();

  // In-Memory Stores
  private webinars: Map<string, Webinar> = new Map();
  private registrations: Map<string, Registration[]> = new Map();
  private participants: Map<string, Map<string, WebinarParticipant>> = new Map();
  private questions: Map<string, WebinarQuestion[]> = new Map();
  private polls: Map<string, WebinarPoll[]> = new Map();
  private reactions: Map<string, WebinarReaction[]> = new Map();
  private chatMessages: Map<string, WebinarChatMessage[]> = new Map();
  private breakouts: Map<string, BreakoutConfig[]> = new Map();
  private insights: Map<string, AIInsight[]> = new Map();
  private ctas: Map<string, CallToAction[]> = new Map();
  private sentimentHistory: Map<string, SentimentSnapshot[]> = new Map();
  private engagementHistory: Map<string, EngagementSnapshot[]> = new Map();
  private aiPulseIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private runOfShowTimers: Map<string, ReturnType<typeof setTimeout>[]> = new Map();

  // ─── LIFECYCLE ────────────────────────────────────────────────────────

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    ctx.logger.info('Webinar plugin initializing — the concert hall is being prepared...');

    const pluginConfig = (ctx.config.plugins['webinar'] || {}) as Record<string, unknown>;
    const providerName = (pluginConfig.aiProvider as AIProvider) || 'mock';
    this.aiProvider = providerName === 'openai' ? new OpenAIProvider(pluginConfig.openaiApiKey as string, 'gpt-4o', ctx.logger) : new MockAIProvider();
    ctx.logger.info(`  AI provider: ${this.aiProvider.name}`);

    // ─── Write-Behind Cache ─────────────────────────────────────────
    const persistConfig = (pluginConfig.persistence || {}) as Partial<WriteBehindConfig>;
    this.writeBehind = new WriteBehindManager(ctx.storage, ctx.logger, ctx.bus, persistConfig);

    // Register all twelve stores with the write-behind manager
    this.writeBehind.registerStore('webinars', {
      collection: 'webinars', tier: 1,
      serialise: (id) => { const w = this.webinars.get(id); return w ? { ...w, scheduledStartAt: w.scheduledStartAt.toISOString(), scheduledEndAt: w.scheduledEndAt.toISOString(), actualStartAt: w.actualStartAt?.toISOString(), actualEndAt: w.actualEndAt?.toISOString(), createdAt: w.createdAt.toISOString(), updatedAt: w.updatedAt.toISOString() } : null; },
      deserialise: (id, data: any) => { if (data) { data.scheduledStartAt = new Date(data.scheduledStartAt); data.scheduledEndAt = new Date(data.scheduledEndAt); if (data.actualStartAt) data.actualStartAt = new Date(data.actualStartAt); if (data.actualEndAt) data.actualEndAt = new Date(data.actualEndAt); data.createdAt = new Date(data.createdAt); data.updatedAt = new Date(data.updatedAt); this.webinars.set(id, data); } },
    });
    this.writeBehind.registerStore('registrations', {
      collection: 'webinar-registrations', tier: 1,
      serialise: (id) => this.registrations.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((r: any) => { r.registeredAt = new Date(r.registeredAt); if (r.approvedAt) r.approvedAt = new Date(r.approvedAt); if (r.attendedAt) r.attendedAt = new Date(r.attendedAt); }); this.registrations.set(id, data); } },
    });
    this.writeBehind.registerStore('questions', {
      collection: 'webinar-questions', tier: 1,
      serialise: (id) => this.questions.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((q: any) => { q.submittedAt = new Date(q.submittedAt); if (q.answeredAt) q.answeredAt = new Date(q.answeredAt); }); this.questions.set(id, data); } },
    });
    this.writeBehind.registerStore('polls', {
      collection: 'webinar-polls', tier: 1,
      serialise: (id) => this.polls.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((p: any) => { if (p.launchedAt) p.launchedAt = new Date(p.launchedAt); if (p.closedAt) p.closedAt = new Date(p.closedAt); }); this.polls.set(id, data); } },
    });
    this.writeBehind.registerStore('breakouts', {
      collection: 'webinar-breakouts', tier: 1,
      serialise: (id) => this.breakouts.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((b: any) => { if (b.startedAt) b.startedAt = new Date(b.startedAt); if (b.endedAt) b.endedAt = new Date(b.endedAt); }); this.breakouts.set(id, data); } },
    });
    this.writeBehind.registerStore('ctas', {
      collection: 'webinar-ctas', tier: 1,
      serialise: (id) => this.ctas.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) this.ctas.set(id, data); },
    });
    this.writeBehind.registerStore('chatMessages', {
      collection: 'webinar-chat', tier: 2,
      serialise: (id) => this.chatMessages.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((m: any) => { m.timestamp = new Date(m.timestamp); }); this.chatMessages.set(id, data); } },
    });
    this.writeBehind.registerStore('reactions', {
      collection: 'webinar-reactions', tier: 2,
      serialise: (id) => this.reactions.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((r: any) => { r.timestamp = new Date(r.timestamp); }); this.reactions.set(id, data); } },
    });
    this.writeBehind.registerStore('participants', {
      collection: 'webinar-participants', tier: 3,
      serialise: (id) => { const m = this.participants.get(id); return m ? [...m.values()] : []; },
      deserialise: (id, data: any) => { if (Array.isArray(data)) { const m = new Map<string, WebinarParticipant>(); data.forEach((p: any) => { p.joinedAt = new Date(p.joinedAt); if (p.leftAt) p.leftAt = new Date(p.leftAt); m.set(p.id, p); }); this.participants.set(id, m); } },
    });
    this.writeBehind.registerStore('insights', {
      collection: 'webinar-insights', tier: 3,
      serialise: (id) => this.insights.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((i: any) => { i.createdAt = new Date(i.createdAt); }); this.insights.set(id, data); } },
    });
    this.writeBehind.registerStore('sentimentHistory', {
      collection: 'webinar-sentiment', tier: 3,
      serialise: (id) => this.sentimentHistory.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((s: any) => { s.timestamp = new Date(s.timestamp); }); this.sentimentHistory.set(id, data); } },
    });
    this.writeBehind.registerStore('engagementHistory', {
      collection: 'webinar-engagement', tier: 3,
      serialise: (id) => this.engagementHistory.get(id) || [],
      deserialise: (id, data: any) => { if (Array.isArray(data)) { data.forEach((e: any) => { e.timestamp = new Date(e.timestamp); }); this.engagementHistory.set(id, data); } },
    });

    // Rehydrate from storage if configured
    if (persistConfig.rehydrateOnInit !== false) {
      const result = await this.writeBehind.rehydrate();
      if (result.rehydrated > 0) ctx.logger.info(`  Rehydrated ${result.rehydrated} webinar(s) from storage`);
      // Restart AI pulse and flush cycle for any live webinars
      for (const [id, w] of this.webinars) {
        if (w.phase === 'live') {
          this.startAIPulse(id);
          this.writeBehind.startFlushing(id);
          this.startRunOfShow(id);
          ctx.logger.info(`  Resumed live webinar: ${w.title} (${id})`);
        }
      }
    }
    ctx.logger.info(`  ✓ Write-behind cache initialized`);

    // ─── Email Pipeline ─────────────────────────────────────────────
    const emailConfig = (pluginConfig.email || {}) as Record<string, string>;
    this.emailPipeline = new RegistrationEmailPipeline(ctx.bus, ctx.logger, {
      joinBaseUrl: emailConfig.joinBaseUrl,
      fromName: emailConfig.fromName,
      fromEmail: emailConfig.fromEmail,
    });
    ctx.logger.info(`  ✓ Email pipeline initialized`);

    // ─── Landing Page Generator ─────────────────────────────────────
    this.landingPage = new LandingPageGenerator(
      ctx.logger,
      (slug: string) => {
        for (const w of this.webinars.values()) {
          if (w.slug === slug) return w as any;
        }
        return undefined;
      },
      { apiBaseUrl: pluginConfig.apiBaseUrl as string, publicBaseUrl: pluginConfig.publicBaseUrl as string, orgName: pluginConfig.orgName as string || 'Chekd' },
    );
    // Mount landing page routes on the main app
    ctx.app.use('/', this.landingPage.createRouter());
    ctx.logger.info(`  ✓ Landing page generator mounted at /webinar/:slug`);

    // Cross-plugin event subscriptions
    ctx.bus.on('room:closed', async (data: any) => {
      for (const [, w] of this.webinars) if (w.roomId === data.roomId && w.phase === 'live') await this.endBroadcast(w.id);
    }, 'webinar');

    ctx.bus.on('room:recording-stopped', async (data: any) => {
      for (const [, w] of this.webinars) if (w.roomId === data.roomId) w.recordingIds.push(data.recordingId);
    }, 'webinar');

    ctx.bus.on('transcription:completed', async (data: any) => {
      for (const [, w] of this.webinars) {
        if (w.roomId === data.roomId && w.aiConfig.smartSummariesEnabled) {
          const answered = (this.questions.get(w.id) || []).filter((q) => q.status === 'answered');
          const summary = await this.aiProvider.generateSummary('', w.agenda, answered);
          this.addInsight(w.id, { id: `insight-summary-${Date.now()}`, webinarId: w.id, type: 'topic-summary', title: 'Post-Webinar Summary Generated', description: summary.summary, severity: 'info', data: { keyTakeaways: summary.keyTakeaways, actionItems: summary.actionItems }, isActionable: true, suggestedAction: 'Review and share summary with attendees', isDismissed: false, createdAt: new Date() });
        }
      }
    }, 'webinar');

    ctx.bus.on('webinar:get-for-room', async (data: any) => {
      for (const [, w] of this.webinars) if (w.roomId === data.roomId) { if (data.__replyTo) ctx.bus.emit(data.__replyTo, w); return; }
      if (data.__replyTo) ctx.bus.emit(data.__replyTo, null);
    }, 'webinar');

    ctx.logger.info('  ✓ Webinar plugin initialized — the hall is ready');
  }

  /**
   * Mark a store as dirty for the write-behind manager.
   * Called at every mutation site — one line per mutation.
   */
  private markDirty(store: string): void {
    this.dirty.add(store);
    this.writeBehind.markDirty(store);
  }

  // ─── REST API (52 endpoints) ──────────────────────────────────────────

  getRoutes(): Router {
    const router = Router();

    // ══════════ WEBINAR CRUD & LIFECYCLE ══════════

    router.get('/webinars', (req, res) => {
      let results = [...this.webinars.values()];
      if (req.query.phase) results = results.filter((w) => w.phase === req.query.phase);
      if (req.query.tenantId) results = results.filter((w) => w.tenantId === req.query.tenantId);
      if (req.query.createdBy) results = results.filter((w) => w.createdBy === req.query.createdBy);
      res.json(results.map((w) => ({ id: w.id, title: w.title, slug: w.slug, phase: w.phase, visibility: w.visibility, scheduledStartAt: w.scheduledStartAt, registrationCount: w.registrationCount, maxParticipants: w.maxParticipants, tags: w.tags, createdAt: w.createdAt })));
    });

    router.post('/webinars', (req, res) => {
      const id = `webinar-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      const webinar: Webinar = {
        id, title: req.body.title || 'Untitled Webinar', description: req.body.description || '',
        slug: (req.body.title || 'untitled').toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').substring(0, 60) + `-${Date.now().toString(36)}`,
        phase: 'draft', visibility: req.body.visibility || 'public', tenantId: req.body.tenantId || 'default', createdBy: req.body.createdBy || 'unknown',
        scheduledStartAt: new Date(req.body.scheduledStartAt || Date.now() + 86400000), scheduledEndAt: new Date(req.body.scheduledEndAt || Date.now() + 86400000 + 3600000), timezone: req.body.timezone || 'UTC',
        maxParticipants: Math.min(req.body.maxParticipants || 500, 2000), maxPanelists: Math.min(req.body.maxPanelists || 10, 25),
        broadcastQuality: req.body.broadcastQuality || '1080p', hlsFallbackEnabled: req.body.hlsFallbackEnabled ?? true,
        recordingEnabled: req.body.recordingEnabled ?? true, autoRecordOnStart: req.body.autoRecordOnStart ?? true,
        registrationApproval: req.body.registrationApproval || 'automatic',
        registrationFields: req.body.registrationFields || [{ id: 'name', label: 'Full Name', type: 'text', required: true }, { id: 'email', label: 'Email', type: 'email', required: true }, { id: 'company', label: 'Company', type: 'text', required: false }],
        requiresAuthentication: req.body.requiresAuthentication ?? false, waitlistEnabled: req.body.waitlistEnabled ?? true,
        registrationCount: 0, waitlistCount: 0,
        branding: req.body.branding || { primaryColor: '#6366f1', accentColor: '#f59e0b', fontFamily: 'Inter, system-ui, sans-serif', waitingRoomMessage: 'The webinar will begin shortly.', thankYouMessage: 'Thank you for attending!' },
        aiConfig: { enabled: true, provider: this.aiProvider.name as AIProvider, questionTriageEnabled: true, sentimentAnalysisEnabled: true, engagementRadarEnabled: true, smartSummariesEnabled: true, contentAssistantEnabled: true, timingCoachEnabled: true, autoModerationEnabled: true, suggestPollTopics: true, suggestFollowUpEmails: true, realtimeCaptionsEnabled: false, language: 'en', ...req.body.aiConfig },
        agenda: req.body.agenda || [], runOfShow: req.body.runOfShow || [], resources: req.body.resources || [],
        recordingIds: [], tags: req.body.tags || [], customFields: req.body.customFields || {}, createdAt: new Date(), updatedAt: new Date(),
      };
      this.webinars.set(id, webinar);
      [this.registrations, this.questions, this.polls, this.reactions, this.chatMessages, this.breakouts, this.insights, this.ctas, this.sentimentHistory, this.engagementHistory].forEach((m) => m.set(id, [] as any));
      this.participants.set(id, new Map());
      this.markDirty(`webinars:${id}`);
      this.ctx.bus.emit('webinar:created', { webinarId: id, title: webinar.title, createdBy: webinar.createdBy, tenantId: webinar.tenantId, maxParticipants: webinar.maxParticipants });
      res.status(201).json(webinar);
    });

    router.get('/webinars/:id', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      res.json({ ...w, participantCount: (this.participants.get(w.id) || new Map()).size, questionCount: (this.questions.get(w.id) || []).length, pollCount: (this.polls.get(w.id) || []).length });
    });

    router.patch('/webinars/:id', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (!['draft', 'scheduled', 'registration-open'].includes(w.phase)) return res.status(400).json({ error: `Cannot update in ${w.phase} phase` });
      const updatable = ['title', 'description', 'visibility', 'scheduledStartAt', 'scheduledEndAt', 'timezone', 'maxParticipants', 'maxPanelists', 'broadcastQuality', 'hlsFallbackEnabled', 'recordingEnabled', 'autoRecordOnStart', 'registrationApproval', 'registrationFields', 'waitlistEnabled', 'branding', 'aiConfig', 'agenda', 'runOfShow', 'resources', 'tags', 'customFields'];
      for (const k of updatable) if (req.body[k] !== undefined) (w as any)[k] = req.body[k];
      if (req.body.maxParticipants) w.maxParticipants = Math.min(req.body.maxParticipants, 2000);
      if (req.body.maxPanelists) w.maxPanelists = Math.min(req.body.maxPanelists, 25);
      w.updatedAt = new Date();
      this.markDirty(`webinars:${w.id}`);
      this.ctx.bus.emit('webinar:updated', { webinarId: w.id, title: w.title });
      res.json(w);
    });

    router.post('/webinars/:id/cancel', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (w.phase === 'live') this.endBroadcast(w.id);
      w.phase = 'cancelled'; w.updatedAt = new Date();
      this.ctx.bus.emit('webinar:cancelled', { webinarId: w.id, title: w.title, cancelledBy: req.body.cancelledBy, reason: req.body.reason });
      res.json({ cancelled: true });
    });

    router.delete('/webinars/:id', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (!['draft', 'cancelled'].includes(w.phase)) return res.status(400).json({ error: `Cannot delete in ${w.phase} phase` });
      this.cleanupWebinar(w.id);
      this.ctx.bus.emit('webinar:deleted', { webinarId: w.id });
      res.json({ deleted: true });
    });

    // ══════════ REGISTRATION ══════════

    router.post('/webinars/:id/registration/open', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (!['draft', 'scheduled'].includes(w.phase)) return res.status(400).json({ error: `Cannot open registration in ${w.phase}` });
      w.phase = 'registration-open'; w.registrationOpenAt = new Date(); w.updatedAt = new Date();
      this.ctx.bus.emit('webinar:registration-opened', { webinarId: w.id, title: w.title });
      res.json({ registrationOpen: true });
    });

    router.post('/webinars/:id/registration/close', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      w.registrationCloseAt = new Date();
      if (w.phase === 'registration-open') w.phase = 'scheduled';
      w.updatedAt = new Date();
      this.ctx.bus.emit('webinar:registration-closed', { webinarId: w.id, registrationCount: w.registrationCount });
      res.json({ registrationClosed: true, totalRegistered: w.registrationCount });
    });

    router.post('/webinars/:id/register', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (!['registration-open', 'scheduled', 'rehearsal', 'live'].includes(w.phase)) return res.status(400).json({ error: 'Registration not open' });
      const regs = this.registrations.get(w.id) || [];
      if (regs.some((r) => r.email === req.body.email && r.status !== 'cancelled')) return res.status(409).json({ error: 'Already registered' });
      const atCapacity = regs.filter((r) => r.status === 'approved').length >= w.maxParticipants;
      const token = `wjt-${w.id.substring(0, 8)}-${Math.random().toString(36).substring(2, 34)}`;
      const reg: Registration = {
        id: `reg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`, webinarId: w.id, userId: req.body.userId,
        email: req.body.email, name: req.body.name,
        status: atCapacity && w.waitlistEnabled ? 'waitlisted' : w.registrationApproval === 'automatic' ? 'approved' : 'pending',
        formData: req.body.formData || {}, registeredAt: new Date(), joinToken: token, source: req.body.source, utmParams: req.body.utmParams,
      };
      if (reg.status === 'approved') { reg.approvedAt = new Date(); w.registrationCount++; }
      else if (reg.status === 'waitlisted') { w.waitlistCount++; }
      regs.push(reg);
      this.markDirty(`registrations:${w.id}`); this.markDirty(`webinars:${w.id}`);
      this.ctx.bus.emit('webinar:attendee-registered', { webinarId: w.id, registrationId: reg.id, email: reg.email, name: reg.name, status: reg.status });
      // Dispatch registration email
      const emailCtx = { webinarId: w.id, webinarTitle: w.title, webinarDescription: w.description, scheduledStartAt: w.scheduledStartAt, scheduledEndAt: w.scheduledEndAt, timezone: w.timezone, joinUrl: '', joinToken: reg.joinToken || '', branding: w.branding };
      if (reg.status === 'approved') this.emailPipeline.sendRegistrationConfirmation({ email: reg.email, name: reg.name, registrationId: reg.id, userId: reg.userId }, emailCtx).catch((e) => this.ctx.logger.warn(`Email send failed: ${e}`));
      else if (reg.status === 'waitlisted') this.emailPipeline.sendWaitlistNotification({ email: reg.email, name: reg.name, registrationId: reg.id, userId: reg.userId }, emailCtx).catch((e) => this.ctx.logger.warn(`Email send failed: ${e}`));
      res.status(201).json({ registrationId: reg.id, status: reg.status, joinToken: reg.joinToken });
    });

    router.get('/webinars/:id/registrations', (req, res) => {
      const regs = this.registrations.get(req.params.id) || [];
      const filtered = req.query.status ? regs.filter((r) => r.status === req.query.status) : regs;
      res.json({ total: filtered.length, registrations: filtered });
    });

    router.patch('/webinars/:id/registrations/:regId', (req, res) => {
      const regs = this.registrations.get(req.params.id) || [];
      const reg = regs.find((r) => r.id === req.params.regId);
      if (!reg) return res.status(404).json({ error: 'Registration not found' });
      const w = this.webinars.get(req.params.id)!;
      if (req.body.status === 'approved' && reg.status !== 'approved') { reg.status = 'approved'; reg.approvedAt = new Date(); w.registrationCount++; }
      else if (req.body.status === 'declined') { reg.status = 'declined'; }
      res.json(reg);
    });

    // ══════════ BROADCAST LIFECYCLE ══════════

    router.post('/webinars/:id/rehearsal/start', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (!['scheduled', 'registration-open', 'draft'].includes(w.phase)) return res.status(400).json({ error: `Cannot rehearse from ${w.phase}` });
      w.phase = 'rehearsal'; w.greenRoomId = `greenroom-${w.id}`; w.updatedAt = new Date();
      this.ctx.bus.emit('webinar:rehearsal-started', { webinarId: w.id, greenRoomId: w.greenRoomId });
      res.json({ phase: 'rehearsal', greenRoomId: w.greenRoomId });
    });

    router.post('/webinars/:id/rehearsal/end', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (w.phase !== 'rehearsal') return res.status(400).json({ error: 'Not in rehearsal' });
      w.phase = 'scheduled'; w.updatedAt = new Date();
      this.ctx.bus.emit('webinar:rehearsal-ended', { webinarId: w.id });
      res.json({ phase: 'scheduled' });
    });

    router.post('/webinars/:id/broadcast/start', async (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (!['scheduled', 'registration-open', 'rehearsal'].includes(w.phase)) return res.status(400).json({ error: `Cannot go live from ${w.phase}` });
      w.phase = 'live'; w.actualStartAt = new Date(); w.roomId = w.roomId || `webinar-room-${w.id}`; w.updatedAt = new Date();
      if (w.aiConfig.enabled) this.startAIPulse(w.id);
      this.startRunOfShow(w.id);
      this.writeBehind.startFlushing(w.id);
      this.markDirty(`webinars:${w.id}`);
      if (w.autoRecordOnStart) { const rid = `rec-${Date.now()}`; w.recordingIds.push(rid); this.ctx.bus.emit('webinar:recording-started', { webinarId: w.id, recordingId: rid }); }
      this.ctx.bus.emit('webinar:broadcast-started', { webinarId: w.id, title: w.title, roomId: w.roomId, maxParticipants: w.maxParticipants });
      res.json({ phase: 'live', roomId: w.roomId, startedAt: w.actualStartAt });
    });

    router.post('/webinars/:id/broadcast/end', async (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (w.phase !== 'live') return res.status(400).json({ error: 'Not live' });
      await this.endBroadcast(w.id);
      res.json({ phase: w.phase, endedAt: w.actualEndAt });
    });

    // ══════════ PARTICIPANT MANAGEMENT ══════════

    router.post('/webinars/:id/join', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (!['live', 'rehearsal'].includes(w.phase)) return res.status(400).json({ error: `Not live (${w.phase})` });
      const pMap = this.participants.get(w.id)!;
      if (pMap.size >= w.maxParticipants) return res.status(503).json({ error: 'At capacity' });
      const role: ParticipantRole = req.body.role || 'attendee';
      const isPanelist = ['host', 'co-host', 'panelist'].includes(role);
      if (isPanelist && [...pMap.values()].filter((p) => ['host', 'co-host', 'panelist'].includes(p.role)).length >= w.maxPanelists) return res.status(503).json({ error: 'Panel full' });
      const p: WebinarParticipant = {
        id: `wp-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, sessionId: req.body.sessionId || `session-${Date.now()}`,
        userId: req.body.userId, userName: req.body.userName || 'Anonymous', email: req.body.email, role,
        connectionState: 'connected', mediaMode: isPanelist ? 'webrtc' : (w.hlsFallbackEnabled ? 'hls' : 'webrtc'),
        joinedAt: new Date(), isAudioEnabled: isPanelist, isVideoEnabled: isPanelist, isScreenSharing: false,
        handRaised: false, reactionCount: 0, questionCount: 0, chatMessageCount: 0, pollVoteCount: 0, engagementScore: 0,
        isInGreenRoom: w.phase === 'rehearsal', isMuted: !isPanelist, registrationData: req.body.registrationData,
        deviceInfo: req.body.deviceInfo, geoLocation: req.body.geoLocation,
      };
      pMap.set(p.id, p);
      const regs = this.registrations.get(w.id) || [];
      const reg = regs.find((r) => r.email === req.body.email || r.userId === req.body.userId);
      if (reg && !reg.attendedAt) reg.attendedAt = new Date();
      this.ctx.bus.emit('webinar:participant-joined', { webinarId: w.id, participantId: p.id, userId: p.userId, userName: p.userName, role: p.role, mediaMode: p.mediaMode });
      res.json({ participantId: p.id, role: p.role, mediaMode: p.mediaMode, roomId: w.roomId });
    });

    router.post('/webinars/:id/leave', (req, res) => {
      const pMap = this.participants.get(req.params.id);
      if (!pMap) return res.status(404).json({ error: 'Webinar not found' });
      const p = pMap.get(req.body.participantId);
      if (!p) return res.status(404).json({ error: 'Participant not found' });
      p.connectionState = 'disconnected'; p.leftAt = new Date();
      this.ctx.bus.emit('webinar:participant-left', { webinarId: req.params.id, participantId: p.id, userId: p.userId });
      res.json({ left: true });
    });

    router.get('/webinars/:id/participants', (req, res) => {
      const pMap = this.participants.get(req.params.id);
      if (!pMap) return res.status(404).json({ error: 'Webinar not found' });
      let list = [...pMap.values()];
      if (req.query.role) list = list.filter((p) => p.role === req.query.role);
      if (req.query.connected === 'true') list = list.filter((p) => p.connectionState === 'connected');
      res.json({ total: list.length, participants: list });
    });

    router.post('/webinars/:id/participants/:pid/promote', (req, res) => {
      const pMap = this.participants.get(req.params.id); const p = pMap?.get(req.params.pid);
      if (!p) return res.status(404).json({ error: 'Participant not found' });
      const oldRole = p.role; p.role = req.body.newRole || 'panelist';
      if (['host', 'co-host', 'panelist'].includes(p.role)) { p.mediaMode = 'webrtc'; p.isAudioEnabled = true; p.isVideoEnabled = true; p.isMuted = false; }
      this.ctx.bus.emit('webinar:participant-promoted', { webinarId: req.params.id, participantId: p.id, oldRole, newRole: p.role });
      res.json(p);
    });

    router.post('/webinars/:id/participants/:pid/demote', (req, res) => {
      const pMap = this.participants.get(req.params.id); const p = pMap?.get(req.params.pid);
      if (!p) return res.status(404).json({ error: 'Participant not found' });
      const oldRole = p.role; p.role = req.body.newRole || 'attendee';
      p.mediaMode = 'hls'; p.isAudioEnabled = false; p.isVideoEnabled = false; p.isScreenSharing = false; p.isMuted = true;
      this.ctx.bus.emit('webinar:participant-demoted', { webinarId: req.params.id, participantId: p.id, oldRole, newRole: p.role });
      res.json(p);
    });

    router.post('/webinars/:id/participants/:pid/mute', (req, res) => {
      const pMap = this.participants.get(req.params.id); const p = pMap?.get(req.params.pid);
      if (!p) return res.status(404).json({ error: 'Participant not found' });
      p.isMuted = req.body.muted ?? true; p.isAudioEnabled = !p.isMuted;
      res.json({ muted: p.isMuted });
    });

    router.delete('/webinars/:id/participants/:pid', (req, res) => {
      const pMap = this.participants.get(req.params.id);
      if (!pMap) return res.status(404).json({ error: 'Webinar not found' });
      const p = pMap.get(req.params.pid);
      if (!p) return res.status(404).json({ error: 'Participant not found' });
      p.connectionState = 'disconnected'; p.leftAt = new Date(); pMap.delete(req.params.pid);
      this.ctx.bus.emit('webinar:participant-left', { webinarId: req.params.id, participantId: p.id, userId: p.userId, reason: 'removed' });
      res.json({ removed: true });
    });

    // ══════════ Q&A SYSTEM ══════════

    router.post('/webinars/:id/questions', async (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (w.aiConfig.autoModerationEnabled) { const m = await this.aiProvider.moderateContent(req.body.content); if (!m.safe) return res.status(422).json({ error: 'Flagged', reason: m.reason }); }
      const pMap = this.participants.get(w.id)!;
      const submitter = [...pMap.values()].find((p) => p.userId === req.body.userId);
      const q: WebinarQuestion = {
        id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, webinarId: w.id,
        submittedBy: req.body.userId, submitterName: req.body.userName || submitter?.userName || 'Anonymous',
        submitterRole: submitter?.role || 'attendee', content: req.body.content, status: 'pending', priority: 'medium',
        submittedAt: new Date(), aiSimilarQuestionIds: [], aiRelevanceScore: 0.5, aiTopicTags: [],
        upvotes: 0, upvoterIds: [], isAnonymous: req.body.isAnonymous ?? false, isFromVip: submitter?.role === 'vip', isFlagged: false,
      };
      this.questions.get(w.id)!.push(q);
      this.markDirty(`questions:${w.id}`);
      if (submitter) submitter.questionCount++;
      this.ctx.bus.emit('webinar:question-submitted', { webinarId: w.id, questionId: q.id, submittedBy: q.submittedBy, isAnonymous: q.isAnonymous });
      res.status(201).json(q);
    });

    router.get('/webinars/:id/questions', (req, res) => {
      let qs = this.questions.get(req.params.id) || [];
      if (req.query.status) qs = qs.filter((q) => q.status === req.query.status);
      if (req.query.priority) qs = qs.filter((q) => q.priority === req.query.priority);
      if (req.query.clusterId) qs = qs.filter((q) => q.aiClusterId === req.query.clusterId);
      qs.sort((a, b) => b.upvotes - a.upvotes || b.submittedAt.getTime() - a.submittedAt.getTime());
      res.json({ total: qs.length, questions: qs });
    });

    router.post('/webinars/:id/questions/:qid/upvote', (req, res) => {
      const q = (this.questions.get(req.params.id) || []).find((q2) => q2.id === req.params.qid);
      if (!q) return res.status(404).json({ error: 'Question not found' });
      if (!q.upvoterIds.includes(req.body.userId)) { q.upvotes++; q.upvoterIds.push(req.body.userId); }
      res.json({ upvotes: q.upvotes });
    });

    router.post('/webinars/:id/questions/:qid/highlight', (req, res) => {
      const q = (this.questions.get(req.params.id) || []).find((q2) => q2.id === req.params.qid);
      if (!q) return res.status(404).json({ error: 'Question not found' });
      q.status = 'highlighted';
      this.ctx.bus.emit('webinar:question-highlighted', { webinarId: req.params.id, questionId: q.id, content: q.content, submitterName: q.submitterName });
      res.json(q);
    });

    router.post('/webinars/:id/questions/:qid/answer', (req, res) => {
      const q = (this.questions.get(req.params.id) || []).find((q2) => q2.id === req.params.qid);
      if (!q) return res.status(404).json({ error: 'Question not found' });
      q.status = 'answered'; q.answer = req.body.answer; q.answeredBy = req.body.answeredBy; q.answeredAt = new Date();
      this.ctx.bus.emit('webinar:question-answered', { webinarId: req.params.id, questionId: q.id });
      res.json(q);
    });

    router.post('/webinars/:id/questions/:qid/dismiss', (req, res) => {
      const q = (this.questions.get(req.params.id) || []).find((q2) => q2.id === req.params.qid);
      if (!q) return res.status(404).json({ error: 'Question not found' });
      q.status = 'dismissed';
      this.ctx.bus.emit('webinar:question-dismissed', { webinarId: req.params.id, questionId: q.id });
      res.json(q);
    });

    router.post('/webinars/:id/questions/triage', async (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      const qs = (this.questions.get(w.id) || []).filter((q) => q.status === 'pending' || q.status === 'triaged');
      if (qs.length === 0) return res.json({ clusters: [], message: 'No pending questions' });
      const result = await this.aiProvider.triageQuestions(qs, { webinarTitle: w.title, currentSegment: this.getCurrentSegment(w)?.title, priorClusters: [...new Set(qs.filter((q) => q.aiClusterLabel).map((q) => q.aiClusterLabel!))] });
      for (const c of result.clusters) for (const qId of c.questionIds) { const q = qs.find((q2) => q2.id === qId); if (q) { q.aiClusterId = c.id; q.aiClusterLabel = c.label; q.aiSuggestedAnswer = c.suggestedAnswer; q.priority = c.priority; q.status = 'triaged'; q.aiTopicTags = c.label.split(', '); } }
      for (const g of result.duplicateGroups) for (const d of g.duplicateIds) { const q = qs.find((q2) => q2.id === d); if (q) q.aiSimilarQuestionIds.push(g.canonicalId); }
      this.ctx.bus.emit('webinar:ai-question-triaged', { webinarId: w.id, clusterCount: result.clusters.length, duplicateGroupCount: result.duplicateGroups.length, flaggedCount: result.flagged.length });
      res.json(result);
    });

    // ══════════ POLLS ══════════

    router.post('/webinars/:id/polls', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      const poll: WebinarPoll = {
        id: `poll-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, webinarId: w.id, createdBy: req.body.createdBy,
        question: req.body.question, type: req.body.type || 'single-choice', status: 'draft',
        options: (req.body.options || []).map((o: string, i: number) => ({ id: `opt-${i}`, text: o, voteCount: 0, percentage: 0, voterIds: [] })),
        isAnonymous: req.body.isAnonymous ?? true, showResultsToAttendees: req.body.showResultsToAttendees ?? true,
        autoCloseAfterSeconds: req.body.autoCloseAfterSeconds, totalVotes: 0, responseRate: 0,
      };
      this.polls.get(w.id)!.push(poll);
      this.ctx.bus.emit('webinar:poll-created', { webinarId: w.id, pollId: poll.id, question: poll.question });
      res.status(201).json(poll);
    });

    router.get('/webinars/:id/polls', (req, res) => res.json({ polls: this.polls.get(req.params.id) || [] }));

    router.post('/webinars/:id/polls/:pollId/launch', (req, res) => {
      const poll = (this.polls.get(req.params.id) || []).find((p) => p.id === req.params.pollId);
      if (!poll) return res.status(404).json({ error: 'Poll not found' });
      poll.status = 'active'; poll.launchedAt = new Date();
      if (poll.autoCloseAfterSeconds) setTimeout(() => { if (poll.status === 'active') this.closePoll(req.params.id, poll); }, poll.autoCloseAfterSeconds * 1000);
      this.ctx.bus.emit('webinar:poll-launched', { webinarId: req.params.id, pollId: poll.id, question: poll.question });
      res.json(poll);
    });

    router.post('/webinars/:id/polls/:pollId/vote', (req, res) => {
      const poll = (this.polls.get(req.params.id) || []).find((p) => p.id === req.params.pollId);
      if (!poll) return res.status(404).json({ error: 'Poll not found' });
      if (poll.status !== 'active') return res.status(400).json({ error: 'Poll not active' });
      if (poll.options.some((o) => o.voterIds.includes(req.body.userId))) return res.status(409).json({ error: 'Already voted' });
      for (const optId of (Array.isArray(req.body.optionIds) ? req.body.optionIds : [req.body.optionIds])) { const o = poll.options.find((opt) => opt.id === optId); if (o) { o.voteCount++; o.voterIds.push(req.body.userId); } }
      poll.totalVotes++;
      const pMap = this.participants.get(req.params.id);
      poll.responseRate = poll.totalVotes / Math.max(pMap ? pMap.size : 1, 1);
      for (const o of poll.options) o.percentage = poll.totalVotes > 0 ? Math.round((o.voteCount / poll.totalVotes) * 100) : 0;
      if (pMap) { const v = [...pMap.values()].find((p) => p.userId === req.body.userId); if (v) v.pollVoteCount++; }
      this.ctx.bus.emit('webinar:poll-vote-cast', { webinarId: req.params.id, pollId: poll.id, userId: req.body.userId });
      res.json({ voted: true, totalVotes: poll.totalVotes });
    });

    router.post('/webinars/:id/polls/:pollId/close', (req, res) => {
      const poll = (this.polls.get(req.params.id) || []).find((p) => p.id === req.params.pollId);
      if (!poll) return res.status(404).json({ error: 'Poll not found' });
      this.closePoll(req.params.id, poll);
      res.json(poll);
    });

    router.post('/webinars/:id/polls/:pollId/share-results', (req, res) => {
      const poll = (this.polls.get(req.params.id) || []).find((p) => p.id === req.params.pollId);
      if (!poll) return res.status(404).json({ error: 'Poll not found' });
      poll.status = 'results-shared';
      this.ctx.bus.emit('webinar:poll-results-shared', { webinarId: req.params.id, pollId: poll.id, results: poll.options.map((o) => ({ text: o.text, percentage: o.percentage })) });
      res.json(poll);
    });

    // ══════════ REACTIONS & CHAT ══════════

    router.post('/webinars/:id/reactions', (req, res) => {
      const rxs = this.reactions.get(req.params.id);
      if (!rxs) return res.status(404).json({ error: 'Webinar not found' });
      const rx: WebinarReaction = { id: `rx-${Date.now()}`, webinarId: req.params.id, userId: req.body.userId, type: req.body.type || 'applause', timestamp: new Date() };
      rxs.push(rx); if (rxs.length > 10000) rxs.splice(0, rxs.length - 10000);
      this.markDirty(`reactions:${req.params.id}`);
      const pMap = this.participants.get(req.params.id);
      if (pMap) { const p = [...pMap.values()].find((p2) => p2.userId === req.body.userId); if (p) p.reactionCount++; }
      this.ctx.bus.emit('webinar:reaction-sent', { webinarId: req.params.id, userId: req.body.userId, type: rx.type });
      res.json(rx);
    });

    router.get('/webinars/:id/reactions/summary', (req, res) => {
      const rxs = this.reactions.get(req.params.id) || [];
      const summary: Record<string, number> = {};
      for (const r of rxs) summary[r.type] = (summary[r.type] || 0) + 1;
      res.json({ total: rxs.length, byType: summary });
    });

    router.post('/webinars/:id/chat', async (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      if (w.aiConfig.autoModerationEnabled) { const m = await this.aiProvider.moderateContent(req.body.content); if (!m.safe) return res.status(422).json({ error: 'Flagged', reason: m.reason }); }
      const pMap = this.participants.get(w.id)!; const sender = [...pMap.values()].find((p) => p.userId === req.body.userId);
      const msg: WebinarChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, webinarId: w.id,
        senderId: req.body.userId, senderName: req.body.userName || sender?.userName || 'Anonymous', senderRole: sender?.role || 'attendee',
        content: req.body.content, scope: req.body.scope || 'everyone', isPinned: false, isAnnouncement: req.body.isAnnouncement ?? false,
        timestamp: new Date(), isHidden: false,
      };
      const msgs = this.chatMessages.get(w.id)!; msgs.push(msg); if (msgs.length > 50000) msgs.splice(0, msgs.length - 50000);
      this.markDirty(`chatMessages:${w.id}`);
      if (sender) sender.chatMessageCount++;
      this.ctx.bus.emit('webinar:chat-message-sent', { webinarId: w.id, messageId: msg.id, senderId: msg.senderId, scope: msg.scope, isAnnouncement: msg.isAnnouncement });
      res.status(201).json(msg);
    });

    router.get('/webinars/:id/chat', (req, res) => {
      let msgs = (this.chatMessages.get(req.params.id) || []).filter((m) => !m.isHidden);
      if (req.query.scope) msgs = msgs.filter((m) => m.scope === req.query.scope);
      if (req.query.since) msgs = msgs.filter((m) => m.timestamp >= new Date(req.query.since as string));
      res.json({ total: msgs.length, messages: msgs.slice(-(parseInt(req.query.limit as string || '100', 10))) });
    });

    router.post('/webinars/:id/chat/:msgId/pin', (req, res) => {
      const msg = (this.chatMessages.get(req.params.id) || []).find((m) => m.id === req.params.msgId);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      msg.isPinned = req.body.pinned ?? !msg.isPinned; res.json(msg);
    });

    router.post('/webinars/:id/chat/:msgId/hide', (req, res) => {
      const msg = (this.chatMessages.get(req.params.id) || []).find((m) => m.id === req.params.msgId);
      if (!msg) return res.status(404).json({ error: 'Message not found' });
      msg.isHidden = true; msg.hiddenBy = req.body.hiddenBy; msg.hiddenReason = req.body.reason; res.json(msg);
    });


    // ══════════ BREAKOUT ROOMS ══════════

    router.post('/webinars/:id/breakouts', (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      const rc = req.body.roomCount || 4;
      const rooms: BreakoutRoom[] = Array.from({ length: rc }, (_, i) => ({ id: `br-${i + 1}`, name: req.body.topics?.[i] || `Breakout Room ${i + 1}`, topic: req.body.topics?.[i], participantIds: [] }));
      const bo: BreakoutConfig = {
        id: `breakout-${Date.now()}`, webinarId: w.id, name: req.body.name || 'Breakout Session', roomCount: rc,
        assignmentMode: req.body.assignmentMode || 'random', durationMinutes: req.body.durationMinutes || 15,
        topics: req.body.topics, allowSelfSwitch: req.body.allowSelfSwitch ?? false, broadcastToAll: req.body.broadcastToAll ?? false,
        autoReturnOnEnd: req.body.autoReturnOnEnd ?? true, rooms, status: 'configured',
      };
      this.breakouts.get(w.id)!.push(bo);
      this.ctx.bus.emit('webinar:breakout-created', { webinarId: w.id, breakoutId: bo.id, roomCount: rc });
      res.status(201).json(bo);
    });

    router.post('/webinars/:id/breakouts/:bid/start', (req, res) => {
      const bo = (this.breakouts.get(req.params.id) || []).find((b) => b.id === req.params.bid);
      if (!bo) return res.status(404).json({ error: 'Breakout not found' });
      const pMap = this.participants.get(req.params.id);
      if (!pMap) return res.status(404).json({ error: 'Webinar not found' });
      const eligible = [...pMap.values()].filter((p) => ['attendee', 'vip'].includes(p.role) && p.connectionState === 'connected');
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      shuffled.forEach((p, i) => bo.rooms[i % bo.rooms.length].participantIds.push(p.id));
      bo.status = 'active'; bo.startedAt = new Date();
      if (bo.durationMinutes > 0) setTimeout(() => { if (bo.status === 'active') { bo.status = 'ended'; bo.endedAt = new Date(); this.ctx.bus.emit('webinar:breakout-ended', { webinarId: req.params.id, breakoutId: bo.id }); } }, bo.durationMinutes * 60_000);
      this.ctx.bus.emit('webinar:breakout-started', { webinarId: req.params.id, breakoutId: bo.id, roomCount: bo.roomCount, participantCount: eligible.length });
      res.json(bo);
    });

    router.post('/webinars/:id/breakouts/:bid/end', (req, res) => {
      const bo = (this.breakouts.get(req.params.id) || []).find((b) => b.id === req.params.bid);
      if (!bo) return res.status(404).json({ error: 'Breakout not found' });
      bo.status = 'ended'; bo.endedAt = new Date();
      this.ctx.bus.emit('webinar:breakout-ended', { webinarId: req.params.id, breakoutId: bo.id });
      this.ctx.bus.emit('webinar:breakout-recalled', { webinarId: req.params.id, breakoutId: bo.id });
      res.json(bo);
    });

    // ══════════ CTA, RESOURCES, AI, ANALYTICS, STATS ══════════

    router.post('/webinars/:id/ctas', (req, res) => { const ctas = this.ctas.get(req.params.id); if (!ctas) return res.status(404).json({ error: 'Webinar not found' }); const cta: CallToAction = { id: `cta-${Date.now()}`, webinarId: req.params.id, type: req.body.type || 'link', title: req.body.title, description: req.body.description || '', buttonText: req.body.buttonText || 'Learn More', url: req.body.url, displayPhase: req.body.displayPhase || 'end-of-webinar', segmentId: req.body.segmentId, isActive: false, clickCount: 0, uniqueClickCount: 0, clickerIds: [] }; ctas.push(cta); res.status(201).json(cta); });
    router.post('/webinars/:id/ctas/:ctaId/activate', (req, res) => { const cta = (this.ctas.get(req.params.id) || []).find((c) => c.id === req.params.ctaId); if (!cta) return res.status(404).json({ error: 'CTA not found' }); cta.isActive = true; this.ctx.bus.emit('webinar:cta-triggered', { webinarId: req.params.id, ctaId: cta.id, title: cta.title, url: cta.url }); res.json(cta); });
    router.post('/webinars/:id/ctas/:ctaId/click', (req, res) => { const cta = (this.ctas.get(req.params.id) || []).find((c) => c.id === req.params.ctaId); if (!cta) return res.status(404).json({ error: 'CTA not found' }); cta.clickCount++; if (!cta.clickerIds.includes(req.body.userId)) { cta.clickerIds.push(req.body.userId); cta.uniqueClickCount++; } res.json({ clicks: cta.clickCount, uniqueClicks: cta.uniqueClickCount }); });
    router.get('/webinars/:id/ctas', (req, res) => res.json({ ctas: this.ctas.get(req.params.id) || [] }));

    router.post('/webinars/:id/resources', (req, res) => { const w = this.webinars.get(req.params.id); if (!w) return res.status(404).json({ error: 'Webinar not found' }); const r: SharedResource = { id: `res-${Date.now()}`, title: req.body.title, type: req.body.type || 'link', url: req.body.url, releasePhase: req.body.releasePhase || 'immediate', isReleased: req.body.releasePhase === 'immediate', downloadCount: 0 }; w.resources.push(r); if (r.isReleased) this.ctx.bus.emit('webinar:resource-shared', { webinarId: w.id, resourceId: r.id, title: r.title }); res.status(201).json(r); });
    router.get('/webinars/:id/resources', (req, res) => { const w = this.webinars.get(req.params.id); if (!w) return res.status(404).json({ error: 'Webinar not found' }); const list = req.query.includeUnreleased === 'true' ? w.resources : w.resources.filter((r) => r.isReleased); res.json({ total: list.length, resources: list }); });

    router.get('/webinars/:id/ai/insights', (req, res) => { let ins = this.insights.get(req.params.id) || []; if (req.query.type) ins = ins.filter((i) => i.type === req.query.type); if (req.query.dismissed !== undefined) ins = ins.filter((i) => i.isDismissed === (req.query.dismissed === 'true')); res.json({ total: ins.length, insights: ins }); });
    router.post('/webinars/:id/ai/insights/:insightId/dismiss', (req, res) => { const ins = (this.insights.get(req.params.id) || []).find((i) => i.id === req.params.insightId); if (!ins) return res.status(404).json({ error: 'Insight not found' }); ins.isDismissed = true; ins.dismissedBy = req.body.dismissedBy; res.json(ins); });
    router.get('/webinars/:id/ai/sentiment', (req, res) => { const h = this.sentimentHistory.get(req.params.id) || []; res.json({ current: h.length > 0 ? h[h.length - 1] : null, history: h.slice(-30) }); });
    router.get('/webinars/:id/ai/engagement', (req, res) => { const h = this.engagementHistory.get(req.params.id) || []; res.json({ current: h.length > 0 ? h[h.length - 1] : null, history: h.slice(-30) }); });

    router.post('/webinars/:id/ai/suggest-action', async (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      const eH = this.engagementHistory.get(w.id) || [];
      const sH = this.sentimentHistory.get(w.id) || [];
      const e: EngagementSnapshot = eH.length > 0 ? eH[eH.length - 1] : { timestamp: new Date(), activeParticipants: 0, totalParticipants: (this.participants.get(w.id)?.size || 0), engagementRate: 0, chatVelocity: 0, reactionVelocity: 0, questionVelocity: 0, attentionScore: 50, trending: 'stable' };
      const s: SentimentSnapshot = sH.length > 0 ? sH[sH.length - 1] : { timestamp: new Date(), overall: 65, positive: 40, neutral: 50, negative: 10, trending: 'stable', dominantEmotion: 'neutral', sampleSize: 0 };
      const rm = Math.max(0, (w.scheduledEndAt.getTime() - Date.now()) / 60000);
      const suggestion = await this.aiProvider.suggestAction(e, s, { phase: w.phase, currentSegment: this.getCurrentSegment(w)?.title, remainingMinutes: rm });
      res.json(suggestion);
    });

    router.post('/webinars/:id/ai/follow-up-email', async (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      const qs = this.questions.get(w.id) || [];
      const regs = this.registrations.get(w.id) || [];
      const attended = regs.filter((r) => r.attendedAt).length;
      const totalReg = regs.filter((r) => r.status === 'approved').length;
      const email = await this.aiProvider.generateFollowUpEmail({ title: w.title, description: w.description }, { attendanceRate: totalReg > 0 ? attended / totalReg : 0, topQuestions: qs.filter((q) => q.status === 'answered').slice(0, 5).map((q) => q.content), keyTakeaways: w.agenda.map((seg) => seg.title) }, req.body.audience || 'attended');
      res.json(email);
    });

    router.get('/webinars/:id/analytics', (req, res) => { const w = this.webinars.get(req.params.id); if (!w) return res.status(404).json({ error: 'Webinar not found' }); res.json(this.generateAnalytics(w)); });

    router.post('/webinars/:id/report', async (req, res) => {
      const w = this.webinars.get(req.params.id);
      if (!w) return res.status(404).json({ error: 'Webinar not found' });
      const analytics = this.generateAnalytics(w);
      const answered = (this.questions.get(w.id) || []).filter((q) => q.status === 'answered');
      const summary = await this.aiProvider.generateSummary('', w.agenda, answered);
      this.ctx.bus.emit('webinar:post-event-report-generated', { webinarId: w.id, attendanceRate: (analytics as any).registrationAnalytics.attendanceRate });
      res.json({ webinarId: w.id, title: w.title, generatedAt: new Date(), analytics, aiSummary: summary });
    });

    router.get('/stats', (_req, res) => { const live = [...this.webinars.values()].filter((w) => w.phase === 'live'); res.json({ totalWebinars: this.webinars.size, liveWebinars: live.length, totalParticipantsAcrossLive: live.reduce((s, w) => s + (this.participants.get(w.id)?.size || 0), 0), aiProvider: this.aiProvider.name }); });
    router.get('/ai/health', async (_req, res) => res.json(await this.aiProvider.healthCheck()));

    return router;
  }

  async handleWebSocketMessage(socketId: string, userId: string, roomId: string | undefined, messageType: string, data: unknown, reply: (msg: unknown) => void, broadcast: (roomId: string, msg: unknown, excludeSocketId?: string) => void): Promise<boolean> {
    if (!['webinar-reaction', 'webinar-hand-raise', 'webinar-hand-lower'].includes(messageType)) return false;
    switch (messageType) {
      case 'webinar-reaction': { const d = data as { webinarId: string; type: ReactionType }; const rxs = this.reactions.get(d.webinarId); if (rxs) { rxs.push({ id: `rx-${Date.now()}`, webinarId: d.webinarId, userId, type: d.type, timestamp: new Date() }); if (roomId) broadcast(roomId, { type: 'reaction-burst', data: { userId, reactionType: d.type } }, socketId); } reply({ type: 'reaction-ack', data: { sent: true } }); return true; }
      case 'webinar-hand-raise': { const d = data as { webinarId: string }; const pMap = this.participants.get(d.webinarId); if (pMap) { const p = [...pMap.values()].find((p2) => p2.userId === userId); if (p) { p.handRaised = true; p.handRaisedAt = new Date(); if (roomId) broadcast(roomId, { type: 'hand-raised', data: { userId, userName: p.userName } }, socketId); } } reply({ type: 'hand-raise-ack', data: { raised: true } }); return true; }
      case 'webinar-hand-lower': { const d = data as { webinarId: string }; const pMap = this.participants.get(d.webinarId); if (pMap) { const p = [...pMap.values()].find((p2) => p2.userId === userId); if (p) { p.handRaised = false; p.handRaisedAt = undefined; if (roomId) broadcast(roomId, { type: 'hand-lowered', data: { userId } }, socketId); } } reply({ type: 'hand-lower-ack', data: { lowered: true } }); return true; }
      default: reply({ type: 'ack', data: { messageType } }); return true;
    }
  }

  async shutdown(): Promise<void> {
    for (const [, i] of this.aiPulseIntervals) clearInterval(i); this.aiPulseIntervals.clear();
    for (const [, ts] of this.runOfShowTimers) ts.forEach((t) => clearTimeout(t)); this.runOfShowTimers.clear();
    for (const [id, w] of this.webinars) if (w.phase === 'live') await this.endBroadcast(id);
    // Final flush of all active webinars
    await this.writeBehind.flushAll();
    this.writeBehind.destroy();
    this.emailPipeline.destroy();
    this.ctx.logger.info('Webinar plugin shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    const aiH = await this.aiProvider.healthCheck();
    const liveIds = [...this.webinars.values()].filter((w) => w.phase === 'live').map((w) => w.id);
    const anyDegraded = liveIds.some((id) => this.writeBehind.isWebinarDegraded(id));
    const status = !aiH.healthy || anyDegraded ? 'degraded' : 'healthy';
    return { status, message: !aiH.healthy ? 'AI provider unhealthy' : anyDegraded ? 'Write-behind persistence degraded' : undefined, details: { totalWebinars: this.webinars.size, liveWebinars: liveIds.length, aiProvider: this.aiProvider.name, aiHealthy: aiH.healthy, persistenceFlushTimers: this.writeBehind.getFlushTimerCount(), persistenceDegraded: anyDegraded } };
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  PRIVATE METHODS
  // ═══════════════════════════════════════════════════════════════════════

  private startAIPulse(webinarId: string): void {
    const interval = setInterval(async () => {
      const w = this.webinars.get(webinarId);
      if (!w || w.phase !== 'live') { clearInterval(interval); this.aiPulseIntervals.delete(webinarId); return; }
      try { await this.runSentimentAnalysis(w); await this.runEngagementRadar(w); await this.runTimingCoach(w); }
      catch (err) { this.ctx.logger.error(`AI pulse error: ${err}`); }
    }, 30_000);
    this.aiPulseIntervals.set(webinarId, interval);
  }

  private async runSentimentAnalysis(w: Webinar): Promise<void> {
    if (!w.aiConfig.sentimentAnalysisEnabled) return;
    const snap = await this.aiProvider.analyseSentiment((this.chatMessages.get(w.id) || []).slice(-50), (this.reactions.get(w.id) || []).slice(-100));
    const h = this.sentimentHistory.get(w.id)!; h.push(snap); if (h.length > 500) h.splice(0, h.length - 500);
    if (h.length >= 3) { const delta = snap.overall - h[h.length - 3].overall; if (delta < -15) { this.addInsight(w.id, { id: `insight-sent-${Date.now()}`, webinarId: w.id, type: 'sentiment-shift', title: 'Audience Sentiment Dropping', description: `Sentiment decreased by ${Math.abs(delta)} points (now ${snap.overall}/100).`, severity: delta < -25 ? 'warning' : 'suggestion', data: { previous: h[h.length - 3].overall, current: snap.overall, delta }, isActionable: true, suggestedAction: 'Launch an interactive element', isDismissed: false, createdAt: new Date() }); this.ctx.bus.emit('webinar:ai-sentiment-updated', { webinarId: w.id, overall: snap.overall, trending: snap.trending }); } }
  }

  private async runEngagementRadar(w: Webinar): Promise<void> {
    if (!w.aiConfig.engagementRadarEnabled) return;
    const pMap = this.participants.get(w.id)!;
    const connected = [...pMap.values()].filter((p) => p.connectionState === 'connected');
    const total = connected.length; const twoMin = new Date(Date.now() - 120_000);
    const rMsgs = (this.chatMessages.get(w.id) || []).filter((m) => m.timestamp >= twoMin);
    const rRx = (this.reactions.get(w.id) || []).filter((r) => r.timestamp >= twoMin);
    const rQs = (this.questions.get(w.id) || []).filter((q) => q.submittedAt >= twoMin);
    const active = new Set([...rMsgs.map((m) => m.senderId), ...rRx.map((r) => r.userId), ...rQs.map((q) => q.submittedBy)]);
    const rate = total > 0 ? active.size / total : 0;
    const attn = Math.min(100, Math.round((rate * 40) + (Math.min(rMsgs.length / 2, 10) / 10 * 30) + (Math.min(rRx.length / 2, 20) / 20 * 20) + (Math.min(rQs.length / 2, 5) / 5 * 10)));
    const eH = this.engagementHistory.get(w.id)!; const prev = eH.length > 0 ? eH[eH.length - 1] : null;
    const trending: 'rising' | 'stable' | 'declining' = prev ? (attn > prev.attentionScore + 5 ? 'rising' : attn < prev.attentionScore - 5 ? 'declining' : 'stable') : 'stable';
    const snap: EngagementSnapshot = { timestamp: new Date(), activeParticipants: active.size, totalParticipants: total, engagementRate: rate, chatVelocity: rMsgs.length / 2, reactionVelocity: rRx.length / 2, questionVelocity: rQs.length / 2, attentionScore: attn, trending };
    eH.push(snap); if (eH.length > 500) eH.splice(0, eH.length - 500);
    if (trending === 'declining' && attn < 30 && total > 10) {
      const sH = this.sentimentHistory.get(w.id) || []; const sent: SentimentSnapshot = sH.length > 0 ? sH[sH.length - 1] : { timestamp: new Date(), overall: 65, positive: 40, neutral: 50, negative: 10, trending: 'stable', dominantEmotion: 'neutral', sampleSize: 0 };
      const sug = await this.aiProvider.suggestAction(snap, sent, { phase: w.phase, currentSegment: this.getCurrentSegment(w)?.title, remainingMinutes: Math.max(0, (w.scheduledEndAt.getTime() - Date.now()) / 60000) });
      this.addInsight(w.id, { id: `insight-eng-${Date.now()}`, webinarId: w.id, type: 'engagement-alert', title: 'Engagement Declining', description: `Attention ${attn}/100, ${active.size}/${total} active.`, severity: attn < 15 ? 'warning' : 'suggestion', data: { attentionScore: attn, activeParticipants: active.size, totalParticipants: total }, isActionable: true, suggestedAction: sug.action, isDismissed: false, createdAt: new Date() });
      this.ctx.bus.emit('webinar:ai-engagement-alert', { webinarId: w.id, attentionScore: attn, trending, suggestedAction: sug.action });
    }
  }

  private async runTimingCoach(w: Webinar): Promise<void> {
    if (!w.aiConfig.timingCoachEnabled || !w.actualStartAt || w.agenda.length === 0) return;
    const elapsed = (Date.now() - w.actualStartAt.getTime()) / 60000;
    let cum = 0; let idx = -1;
    for (let i = 0; i < w.agenda.length; i++) { cum += w.agenda[i].durationMinutes; if (elapsed < cum) { idx = i; break; } }
    if (idx === -1) { const total = w.agenda.reduce((s, seg) => s + seg.durationMinutes, 0); const over = Math.round(elapsed - total); if (over > 2) { this.addInsight(w.id, { id: `insight-time-${Date.now()}`, webinarId: w.id, type: 'timing-alert', title: 'Running Over Schedule', description: `${over} minutes past planned end.`, severity: over > 10 ? 'warning' : 'suggestion', data: { elapsed: Math.round(elapsed), total, over }, isActionable: true, suggestedAction: 'Begin closing remarks', isDismissed: false, createdAt: new Date() }); this.ctx.bus.emit('webinar:ai-timing-alert', { webinarId: w.id, overByMinutes: over }); } }
    else { const segStart = w.agenda.slice(0, idx).reduce((s, seg) => s + seg.durationMinutes, 0); const segEl = elapsed - segStart; const segDur = w.agenda[idx].durationMinutes; const over = Math.round(segEl - segDur); if (over > 3) { const seg = w.agenda[idx]; this.addInsight(w.id, { id: `insight-tseg-${Date.now()}`, webinarId: w.id, type: 'timing-alert', title: `Segment "${seg.title}" ${over}min Over`, description: `Planned ${segDur}min, at ${Math.round(segEl)}min.`, severity: 'suggestion', data: { segmentTitle: seg.title, planned: segDur, actual: Math.round(segEl), over }, isActionable: true, suggestedAction: `Consider transitioning${w.agenda[idx + 1] ? ` to "${w.agenda[idx + 1].title}"` : ''}`, isDismissed: false, createdAt: new Date() }); } }
  }

  private async endBroadcast(webinarId: string): Promise<void> {
    const w = this.webinars.get(webinarId); if (!w) return;
    const iv = this.aiPulseIntervals.get(webinarId); if (iv) { clearInterval(iv); this.aiPulseIntervals.delete(webinarId); }
    const ts = this.runOfShowTimers.get(webinarId); if (ts) { ts.forEach((t) => clearTimeout(t)); this.runOfShowTimers.delete(webinarId); }
    if (w.recordingIds.length > 0) this.ctx.bus.emit('webinar:recording-stopped', { webinarId, recordingId: w.recordingIds[w.recordingIds.length - 1] });
    for (const r of w.resources) if (r.releasePhase === 'post-event' && !r.isReleased) { r.isReleased = true; this.ctx.bus.emit('webinar:resource-shared', { webinarId, resourceId: r.id, title: r.title }); }
    w.phase = 'ended'; w.actualEndAt = new Date(); w.updatedAt = new Date();
    this.markDirty(`webinars:${webinarId}`);
    // Final flush — commit all remaining data to storage
    await this.writeBehind.finalFlush(webinarId).catch((err) => this.ctx.logger.error(`Final flush failed for ${webinarId}: ${err}`));
    this.ctx.bus.emit('webinar:broadcast-ended', { webinarId, title: w.title, durationMinutes: w.actualStartAt ? Math.round((w.actualEndAt!.getTime() - w.actualStartAt.getTime()) / 60000) : 0, peakParticipants: this.participants.get(webinarId)?.size || 0 });
  }

  private startRunOfShow(webinarId: string): void {
    const w = this.webinars.get(webinarId); if (!w || w.runOfShow.length === 0) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const cue of w.runOfShow) {
      if (!cue.isAutomatic) continue;
      timers.push(setTimeout(() => {
        if (w.phase !== 'live') return; cue.status = 'fired';
        if (cue.action === 'launch-poll' && cue.targetId) { const poll = (this.polls.get(webinarId) || []).find((p) => p.id === cue.targetId); if (poll && poll.status === 'draft') { poll.status = 'active'; poll.launchedAt = new Date(); this.ctx.bus.emit('webinar:poll-launched', { webinarId, pollId: poll.id, question: poll.question }); } }
        else if (cue.action === 'share-resource' && cue.targetId) { const r = w.resources.find((r2) => r2.id === cue.targetId); if (r) { r.isReleased = true; this.ctx.bus.emit('webinar:resource-shared', { webinarId, resourceId: r.id, title: r.title }); } }
        else if (cue.action === 'show-cta' && cue.targetId) { const c = (this.ctas.get(webinarId) || []).find((c2) => c2.id === cue.targetId); if (c) { c.isActive = true; this.ctx.bus.emit('webinar:cta-triggered', { webinarId, ctaId: c.id, title: c.title, url: c.url }); } }
      }, cue.timeOffsetMinutes * 60_000));
    }
    this.runOfShowTimers.set(webinarId, timers);
  }

  private addInsight(webinarId: string, insight: AIInsight): void {
    const ins = this.insights.get(webinarId); if (!ins) return;
    const twoMin = new Date(Date.now() - 120_000);
    if (ins.find((i) => i.type === insight.type && i.createdAt >= twoMin && !i.isDismissed)) return;
    ins.push(insight); if (ins.length > 200) ins.splice(0, ins.length - 200);
    this.ctx.bus.emit('webinar:ai-insight-generated', { webinarId, insightId: insight.id, type: insight.type, severity: insight.severity, title: insight.title });
  }

  private getCurrentSegment(w: Webinar): AgendaSegment | undefined {
    if (!w.actualStartAt || w.agenda.length === 0) return undefined;
    const elapsed = (Date.now() - w.actualStartAt.getTime()) / 60000; let cum = 0;
    for (const seg of w.agenda) { cum += seg.durationMinutes; if (elapsed < cum) return seg; }
    return w.agenda[w.agenda.length - 1];
  }

  private closePoll(webinarId: string, poll: WebinarPoll): void {
    poll.status = 'closed'; poll.closedAt = new Date();
    const top = [...poll.options].sort((a, b) => b.voteCount - a.voteCount)[0];
    if (top && poll.totalVotes > 0) { poll.aiInsight = `"${top.text}" received ${top.percentage}% (${top.voteCount}/${poll.totalVotes}).`; poll.aiSuggestedFollowUp = `Discuss why "${top.text}" resonated.`; }
    this.ctx.bus.emit('webinar:poll-closed', { webinarId, pollId: poll.id, totalVotes: poll.totalVotes, responseRate: poll.responseRate });
  }

  private generateAnalytics(w: Webinar): Record<string, unknown> {
    const regs = this.registrations.get(w.id) || []; const pMap = this.participants.get(w.id) || new Map();
    const qs = this.questions.get(w.id) || []; const polls = this.polls.get(w.id) || [];
    const rxs = this.reactions.get(w.id) || []; const msgs = this.chatMessages.get(w.id) || [];
    const all = [...pMap.values()]; const approved = regs.filter((r) => r.status === 'approved'); const attended = regs.filter((r) => r.attendedAt);
    return {
      webinarId: w.id,
      registrationAnalytics: { totalRegistered: approved.length, totalAttended: attended.length, attendanceRate: approved.length > 0 ? attended.length / approved.length : 0 },
      engagementAnalytics: { peakConcurrentViewers: all.length, totalChatMessages: msgs.length, totalQuestions: qs.length, totalPollVotes: polls.reduce((s, p) => s + p.totalVotes, 0), totalReactions: rxs.length, engagementTimeline: this.engagementHistory.get(w.id) || [], sentimentTimeline: this.sentimentHistory.get(w.id) || [] },
      contentAnalytics: { segmentCount: w.agenda.length, pollCount: polls.length, resourceCount: w.resources.length },
      technicalAnalytics: { mediaModeSplit: { webrtc: all.filter((p) => p.mediaMode === 'webrtc').length, hls: all.filter((p) => p.mediaMode === 'hls').length } },
      aiAnalytics: { insightsGenerated: (this.insights.get(w.id) || []).length, questionsTriaged: qs.filter((q) => q.aiClusterId).length },
    };
  }

  private cleanupWebinar(id: string): void {
    [this.webinars, this.registrations, this.participants, this.questions, this.polls, this.reactions, this.chatMessages, this.breakouts, this.insights, this.ctas, this.sentimentHistory, this.engagementHistory].forEach((m) => m.delete(id));
  }
}

export default WebinarPlugin;
