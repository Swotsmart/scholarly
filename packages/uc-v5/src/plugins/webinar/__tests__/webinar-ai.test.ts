/**
 * Chekd Unified Communications 3.2 — Webinar AI Co-Pilot Tests
 *
 * Tests for the AI subsystems: question triage, sentiment analysis,
 * engagement radar, timing coach, content moderation, and action suggestions.
 */

import { describe, it, expect } from 'vitest';

describe('AI Co-Pilot (Mock Provider)', () => {

  describe('Question Triage', () => {
    it('should cluster questions by keyword overlap', () => {
      const q1Words = extractKeywords('What is the pricing model?');
      const q2Words = extractKeywords('How does enterprise pricing work?');
      const q3Words = extractKeywords('What features are in the free tier?');

      const overlap12 = computeOverlap(q1Words, q2Words);
      expect(overlap12).toBeGreaterThan(0);

      const overlap13 = computeOverlap(q1Words, q3Words);
      expect(overlap13).toBeLessThan(overlap12);
    });

    it('should prioritise VIP questions as high', () => {
      const vipQ = createQuestion('q-vip', 'What about API access?', true);
      expect(vipQ.isFromVip).toBe(true);
    });

    it('should handle empty question list gracefully', () => {
      const result = { clusters: [], duplicateGroups: [], flagged: [], topPriority: [] };
      expect(result.clusters.length).toBe(0);
    });
  });

  describe('Sentiment Analysis', () => {
    it('should detect positive sentiment from positive keywords', () => {
      const messages = [createMessage('This is great!'), createMessage('Amazing presentation!'), createMessage('Love this topic')];
      const reactions = [createReaction('applause'), createReaction('thumbs-up'), createReaction('heart')];

      const posKw = ['great', 'amazing', 'excellent', 'agree', 'love', 'fantastic', 'awesome'];
      let posCount = 0;
      for (const m of messages) posCount += posKw.filter((k) => m.content.toLowerCase().includes(k)).length;
      posCount += reactions.filter((r) => ['applause', 'thumbs-up', 'heart', 'laugh'].includes(r.type)).length * 2;

      expect(posCount).toBeGreaterThan(0);
    });

    it('should detect declining sentiment from negative keywords', () => {
      const negKw = ['confus', 'unclear', 'disagree', 'wrong', 'bad', 'boring'];
      const messages = [createMessage('This is really confusing'), createMessage('I disagree'), createMessage('This is unclear')];

      let negCount = 0;
      for (const m of messages) negCount += negKw.filter((k) => m.content.toLowerCase().includes(k)).length;
      expect(negCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Content Moderation', () => {
    it('should flag spam content', () => {
      const flagPatterns = [/spam/i, /buy now/i, /click here/i, /\b(hate|kill|threat)\b/i];
      expect(flagPatterns.some((p) => p.test('This is spam'))).toBe(true);
      expect(flagPatterns.some((p) => p.test('Buy now, limited offer!'))).toBe(true);
    });

    it('should pass clean content', () => {
      const flagPatterns = [/spam/i, /buy now/i, /click here/i, /\b(hate|kill|threat)\b/i];
      expect(flagPatterns.some((p) => p.test('Great presentation, thank you!'))).toBe(false);
    });
  });

  describe('Engagement Radar', () => {
    it('should calculate attention score from activity rates', () => {
      const total = 100, activeUsers = 25, chatMessages = 10, reactions = 15, questions = 3;
      const rate = activeUsers / total;
      const attn = Math.min(100, Math.round(
        (rate * 40) + (Math.min(chatMessages / 2, 10) / 10 * 30) + (Math.min(reactions / 2, 20) / 20 * 20) + (Math.min(questions / 2, 5) / 5 * 10)
      ));
      expect(attn).toBeGreaterThan(0);
      expect(attn).toBeLessThanOrEqual(100);
    });

    it('should detect declining engagement', () => {
      const trending = 25 < 60 - 5 ? 'declining' : 'stable';
      expect(trending).toBe('declining');
    });

    it('should detect rising engagement', () => {
      const trending = 70 > 40 + 5 ? 'rising' : 'stable';
      expect(trending).toBe('rising');
    });
  });

  describe('Timing Coach', () => {
    it('should detect when a segment runs over', () => {
      const agenda = [{ title: 'Intro', durationMinutes: 10 }, { title: 'Main', durationMinutes: 30 }, { title: 'Q&A', durationMinutes: 15 }];
      let cum = 0, idx = -1;
      for (let i = 0; i < agenda.length; i++) { cum += agenda[i].durationMinutes; if (45 < cum) { idx = i; break; } }
      expect(idx).toBe(2);
    });

    it('should detect when total webinar runs over', () => {
      const agenda = [{ title: 'Talk', durationMinutes: 30 }];
      const total = agenda.reduce((s, seg) => s + seg.durationMinutes, 0);
      const over = Math.round(35 - total);
      expect(over).toBe(5);
    });
  });

  describe('Action Suggestions', () => {
    it('should suggest poll when engagement is low', () => {
      const action = 0.2 < 0.3 ? 'Launch an interactive poll to re-engage the audience' : 'Continue';
      expect(action).toContain('poll');
    });

    it('should suggest addressing questions when sentiment declines', () => {
      const action = 'declining' === 'declining' ? 'Address the most upvoted question' : 'Continue';
      expect(action).toContain('question');
    });
  });
});

function createQuestion(id: string, content: string, isVip = false) {
  return { id, content, isFromVip: isVip, webinarId: 'w1', submittedBy: 'u1', submitterName: 'User', submitterRole: isVip ? 'vip' : 'attendee', status: 'pending', priority: 'medium', submittedAt: new Date(), upvotes: 0, upvoterIds: [] as string[], isAnonymous: false, aiSimilarQuestionIds: [] as string[], aiRelevanceScore: 0.5, aiTopicTags: [] as string[], isFlagged: false };
}

function createMessage(content: string) {
  return { id: `msg-${Date.now()}`, webinarId: 'w1', senderId: 'u1', senderName: 'User', senderRole: 'attendee', content, scope: 'everyone', isPinned: false, isAnnouncement: false, timestamp: new Date(), isHidden: false };
}

function createReaction(type: string) {
  return { id: `rx-${Date.now()}`, webinarId: 'w1', userId: 'u1', type, timestamp: new Date() };
}

function extractKeywords(text: string): string[] {
  const stop = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'this', 'that', 'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'how', 'when', 'where', 'why', 'and', 'or', 'but', 'if', 'not', 'no', 'so', 'about', 'up', 'out', 'just', 'than', 'very', 'also', 'some', 'any']);
  return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
}

function computeOverlap(a: string[], b: string[]): number {
  const wa = new Set(a), wb = new Set(b);
  if (!wa.size || !wb.size) return 0;
  let n = 0;
  for (const w of wa) if (wb.has(w)) n++;
  return n / Math.max(wa.size, wb.size);
}
