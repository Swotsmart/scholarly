/**
 * AI Buddy Chat Route — Lightweight Anthropic-powered endpoint
 *
 * This is a focused chat endpoint that directly calls the Anthropic API,
 * bypassing the full Sprint 15 AI Buddy service (which has complex
 * unresolved dependencies). It provides real AI conversations for
 * the AI Buddy page while the full service is being integrated.
 */

import { Router } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger.js';

export const aiBuddyChatRouter: Router = Router();

// Validation schema
const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  context: z.object({
    conversationId: z.string().optional(),
    yearLevel: z.string().optional(),
    subjects: z.array(z.string()).optional(),
    currentTopic: z.string().optional(),
    persona: z.string().optional(),
  }).optional(),
});

// Build system prompt based on user context
function buildSystemPrompt(user: { roles: string[]; email: string }, context?: z.infer<typeof chatSchema>['context']): string {
  const role = user.roles.includes('teacher') || user.roles.includes('educator')
    ? 'teacher'
    : user.roles.includes('parent') || user.roles.includes('guardian')
      ? 'parent'
      : 'student';

  const persona = context?.persona || 'tutor';

  const personaInstructions: Record<string, string> = {
    tutor: 'You are an expert tutor providing detailed, academic explanations with structured guidance.',
    'study-buddy': 'You are a friendly study companion who engages in casual, conversational learning.',
    coach: 'You are a motivational learning coach focused on encouragement, goal-setting, and celebrating progress.',
    mentor: 'You are a thoughtful mentor offering guidance on growth and long-term learning goals.',
  };

  let systemPrompt = `You are Scholarly AI Buddy, an educational AI assistant on the Scholarly learning platform.

${personaInstructions[persona] || personaInstructions.tutor}

## Context
- User role: ${role}
${context?.yearLevel ? `- Year level: ${context.yearLevel}` : ''}
${context?.subjects?.length ? `- Subjects: ${context.subjects.join(', ')}` : ''}
${context?.currentTopic ? `- Current topic: ${context.currentTopic}` : ''}

## Guidelines
- Keep responses educational, age-appropriate, and curriculum-aligned
- Use Australian English spelling and terminology
- Reference the Australian Curriculum where relevant
- For students: use Socratic questioning to guide understanding rather than just giving answers
- For teachers: provide pedagogical strategies and classroom resources
- For parents: give clear, jargon-free explanations of their child's learning
- Never generate inappropriate, violent, or non-educational content
- If asked about non-educational topics, gently redirect to learning
- Use markdown formatting for clarity (bold, lists, code blocks where appropriate)
- Keep responses concise but thorough — aim for 2-4 paragraphs unless more detail is needed`;

  return systemPrompt;
}

/**
 * POST /api/v1/ai-buddy/chat
 * Send a message and get an AI response
 */
aiBuddyChatRouter.post('/chat', async (req, res) => {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  try {
    const data = chatSchema.parse(req.body);

    // Verify Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      log.error('ANTHROPIC_API_KEY not configured');
      return res.status(503).json({
        success: false,
        error: 'AI Buddy is temporarily unavailable. Please try again later.',
      });
    }

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Load conversation history if conversationId provided
    let conversationMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
    let conversationId = data.context?.conversationId;
    let existingMessages: Array<{ role: string; content: string; timestamp: string }> = [];

    if (conversationId) {
      const existing = await prisma.aIBuddyConversation.findFirst({
        where: { id: conversationId, userId, tenantId },
      });

      if (existing && existing.messages) {
        // Messages are stored as JSON array in the conversation record
        existingMessages = (existing.messages as Array<{ role: string; content: string; timestamp: string }>) || [];
        // Take last 20 messages for context window
        conversationMessages = existingMessages.slice(-20).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      }
    }

    // Add user's new message
    conversationMessages.push({ role: 'user', content: data.message });

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      { roles: req.user!.roles as string[], email: req.user!.email },
      data.context,
    );

    // Call Anthropic
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationMessages,
    });

    const assistantContent = response.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('\n');

    const now = new Date();
    const newUserMsg = { role: 'user', content: data.message, timestamp: new Date(now.getTime() - 1000).toISOString() };
    const newAssistantMsg = { role: 'assistant', content: assistantContent, timestamp: now.toISOString() };
    const updatedMessages = [...existingMessages, newUserMsg, newAssistantMsg];

    // Determine user role for the conversation record
    const userRoles = req.user!.roles as string[];
    let buddyRole = 'student';
    if (userRoles.includes('teacher') || userRoles.includes('tutor')) buddyRole = 'teacher';
    else if (userRoles.includes('parent')) buddyRole = 'parent';

    // Save to database
    if (!conversationId) {
      // Create new conversation with messages as JSON
      const titlePreview = data.message.substring(0, 60) + (data.message.length > 60 ? '...' : '');
      const conv = await prisma.aIBuddyConversation.create({
        data: {
          tenantId,
          userId,
          role: buddyRole,
          title: titlePreview,
          messages: updatedMessages,
          context: (data.context || {}) as Record<string, unknown>,
          status: 'active',
          lastMessageAt: now,
        },
      });
      conversationId = conv.id;
    } else {
      // Update existing conversation with new messages
      await prisma.aIBuddyConversation.update({
        where: { id: conversationId },
        data: {
          messages: updatedMessages,
          lastMessageAt: now,
        },
      });
    }

    log.info('AI Buddy chat response generated', { userId, conversationId });

    res.json({
      success: true,
      data: {
        conversationId,
        message: {
          id: `msg_${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          timestamp: now.toISOString(),
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request',
        details: error.errors,
      });
    }

    log.error('AI Buddy chat error', error instanceof Error ? error : undefined, { userId });
    res.status(500).json({
      success: false,
      error: 'AI Buddy encountered an error. Please try again.',
    });
  }
});
