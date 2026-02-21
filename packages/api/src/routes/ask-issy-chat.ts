/**
 * Ask Issy Chat Route — Lightweight Anthropic-powered endpoint
 *
 * This is a focused chat endpoint that directly calls the Anthropic API,
 * bypassing the full Sprint 15 Ask Issy service (which has complex
 * unresolved dependencies). It provides real AI conversations for
 * the Ask Issy page while the full service is being integrated.
 */

import { Router } from 'express';
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger.js';

export const askIssyChatRouter: Router = Router();

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

// Fetch user profile data for system prompt enrichment (all roles)
async function fetchUserContext(userId: string, tenantId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        learnerProfile: {
          include: {
            subjects: { include: { subject: true } },
            sessionParticipations: {
              where: {
                session: {
                  scheduledStart: { gte: new Date() },
                  status: { in: ['scheduled', 'confirmed'] },
                },
              },
              include: {
                session: {
                  include: { subject: true, booking: true },
                },
              },
              take: 10,
            },
          },
        },
        tutorProfile: {
          include: {
            subjects: { include: { subject: true } },
            sessions: {
              where: {
                scheduledStart: { gte: new Date() },
                status: { in: ['scheduled', 'confirmed'] },
              },
              include: { subject: true },
              take: 10,
              orderBy: { scheduledStart: 'asc' },
            },
            qualifications: true,
          },
        },
        parentProfile: true,
      },
    });

    // For parents, also fetch children's profiles
    let childrenData: Array<{ firstName: string; lastName: string; learnerProfile: { yearLevel: string; subjects: Array<{ subject: { name: string } | null }> } | null }> = [];
    if (user?.parentProfile?.childIds?.length) {
      childrenData = await prisma.user.findMany({
        where: { id: { in: user.parentProfile.childIds } },
        select: {
          firstName: true,
          lastName: true,
          learnerProfile: {
            select: {
              yearLevel: true,
              subjects: { include: { subject: true } },
            },
          },
        },
      });
    }

    // For admins, fetch platform stats
    let platformStats: { userCount: number; tutorCount: number; contentCount: number; bookingCount: number } | null = null;
    if (user?.roles?.includes('platform_admin') || user?.roles?.includes('admin')) {
      const [userCount, tutorCount, contentCount, bookingCount] = await Promise.all([
        prisma.user.count({ where: { tenantId, status: 'active' } }),
        prisma.tutorProfile.count({ where: { user: { tenantId } } }),
        prisma.content.count({ where: { tenantId } }),
        prisma.booking.count({ where: { tenantId } }),
      ]);
      platformStats = { userCount, tutorCount, contentCount, bookingCount };
    }

    return { user, childrenData, platformStats };
  } catch (err) {
    log.error('Failed to fetch user context for Ask Issy', err instanceof Error ? err : undefined);
    return null;
  }
}

// Build system prompt based on user context
function buildSystemPrompt(
  user: { roles: string[]; email: string },
  context: z.infer<typeof chatSchema>['context'] | undefined,
  profileData: Awaited<ReturnType<typeof fetchUserContext>>,
): string {
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

  // Build profile context for all roles
  const profileLines: string[] = [];
  const userData = profileData?.user;
  if (userData) {
    profileLines.push(`- Name: ${userData.firstName} ${userData.lastName}`);

    // === LEARNER CONTEXT ===
    const lp = userData.learnerProfile;
    if (lp) {
      profileLines.push(`- Year level: ${lp.yearLevel}`);
      if (lp.specialNeeds?.length) {
        profileLines.push(`- Learning needs: ${lp.specialNeeds.join(', ')}`);
      }
      if (lp.subjects?.length) {
        const subjectList = lp.subjects.map((s: { subject: { name: string } | null; currentLevel?: string; needsHelp?: boolean }) => {
          const name = s.subject?.name || 'Unknown';
          const level = s.currentLevel ? ` (${s.currentLevel})` : '';
          const help = s.needsHelp ? ' — needs help' : '';
          return `${name}${level}${help}`;
        }).join(', ');
        profileLines.push(`- Enrolled subjects: ${subjectList}`);
      }
      const upcoming = lp.sessionParticipations || [];
      if (upcoming.length > 0) {
        profileLines.push(`\n### Upcoming Sessions`);
        for (const sp of upcoming) {
          const s = sp.session;
          const date = new Date(s.scheduledStart).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
          const time = new Date(s.scheduledStart).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
          const endTime = new Date(s.scheduledEnd).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
          const subjectName = s.subject?.name || 'General';
          const topics = s.topicsFocus?.length ? ` — Topics: ${s.topicsFocus.join(', ')}` : '';
          profileLines.push(`- ${date} ${time}–${endTime}: ${subjectName}${topics}`);
        }
      } else {
        profileLines.push(`- No upcoming tutoring sessions scheduled`);
      }
    }

    // === TUTOR CONTEXT ===
    const tp = userData.tutorProfile;
    if (tp) {
      profileLines.push(`- Tutor type: ${tp.tutorType}`);
      profileLines.push(`- Verification: ${tp.verificationStatus}`);
      if (tp.yearLevelsTeaching?.length) profileLines.push(`- Year levels: ${tp.yearLevelsTeaching.join(', ')}`);
      if (tp.languages?.length) profileLines.push(`- Languages: ${tp.languages.join(', ')}`);
      const metrics = (tp.metrics as Record<string, number>) || {};
      if (metrics.totalSessions) profileLines.push(`- Total sessions completed: ${metrics.totalSessions}`);
      if (metrics.averageRating) profileLines.push(`- Average rating: ${metrics.averageRating}`);
      if (tp.subjects?.length) {
        const subjects = tp.subjects.map((s: { subject: { name: string } | null }) => s.subject?.name || 'Unknown').join(', ');
        profileLines.push(`- Teaching subjects: ${subjects}`);
      }
      if (tp.qualifications?.length) {
        const quals = tp.qualifications.map((q: { title: string; institution?: string }) => `${q.title}${q.institution ? ` (${q.institution})` : ''}`).join(', ');
        profileLines.push(`- Qualifications: ${quals}`);
      }
      const tutorSessions = tp.sessions || [];
      if (tutorSessions.length > 0) {
        profileLines.push(`\n### Upcoming Teaching Sessions`);
        for (const s of tutorSessions) {
          const date = new Date(s.scheduledStart).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' });
          const time = new Date(s.scheduledStart).toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' });
          const subjectName = s.subject?.name || 'General';
          profileLines.push(`- ${date} ${time}: ${subjectName}`);
        }
      }
    }

    // === PARENT CONTEXT ===
    const pp = userData.parentProfile;
    if (pp) {
      profileLines.push(`- Number of children: ${pp.childIds?.length || 0}`);
      if (pp.isHomeschoolParent) profileLines.push(`- Homeschool parent`);
      if (pp.monthlyBudget) profileLines.push(`- Monthly tutoring budget: $${pp.monthlyBudget}`);
      const children = profileData?.childrenData || [];
      if (children.length > 0) {
        profileLines.push(`\n### Children`);
        for (const child of children) {
          const subjects = child.learnerProfile?.subjects?.map((s: { subject: { name: string } | null }) => s.subject?.name || '').filter(Boolean).join(', ') || 'none';
          profileLines.push(`- ${child.firstName} ${child.lastName} (${child.learnerProfile?.yearLevel || 'unknown year'}) — Subjects: ${subjects}`);
        }
      }
    }

    // === ADMIN CONTEXT ===
    const stats = profileData?.platformStats;
    if (stats) {
      profileLines.push(`\n### Platform Overview`);
      profileLines.push(`- Active users: ${stats.userCount}`);
      profileLines.push(`- Registered tutors: ${stats.tutorCount}`);
      profileLines.push(`- Published content items: ${stats.contentCount}`);
      profileLines.push(`- Total bookings: ${stats.bookingCount}`);
    }
  }

  const sectionTitle = role === 'teacher' ? 'Teacher Profile'
    : role === 'parent' ? 'Parent Profile'
    : userData?.tutorProfile ? 'Tutor Profile'
    : userData?.roles?.includes('platform_admin') || userData?.roles?.includes('admin') ? 'Admin Overview'
    : 'Student Profile';

  const profileSection = profileLines.length > 0
    ? `\n## ${sectionTitle}\n${profileLines.join('\n')}`
    : '';

  const systemPrompt = `You are Scholarly Ask Issy, an educational AI assistant on the Scholarly learning platform.

${personaInstructions[persona] || personaInstructions.tutor}

## Context
- User role: ${role}
${context?.yearLevel ? `- Year level: ${context.yearLevel}` : ''}
${context?.subjects?.length ? `- Subjects: ${context.subjects.join(', ')}` : ''}
${context?.currentTopic ? `- Current topic: ${context.currentTopic}` : ''}
${profileSection}

## Guidelines
- Keep responses educational, age-appropriate, and curriculum-aligned
- Use Australian English spelling and terminology
- Reference the Australian Curriculum where relevant
- You have full access to the user's profile, role-specific data, and schedule. ALWAYS use this information to give personalised, proactive, contextual answers.
- If asked about timetable, schedule, or upcoming classes, refer to the sessions listed in the profile above. If no sessions are listed, suggest they check with their school, book a tutoring session, or contact their administrator.
- For students: use Socratic questioning, reference their enrolled subjects and year level, know their upcoming sessions
- For teachers/educators: provide pedagogical strategies, classroom resources, help with lesson planning. Know their qualifications and teaching subjects.
- For tutors: help with session preparation, student progress tracking, teaching strategies. Reference their upcoming teaching sessions and student roster.
- For parents/guardians: give clear, jargon-free updates about their children's learning. Reference their children's names, year levels, and subjects. Help them understand progress and support learning at home.
- For admins: provide platform insights, help with operational decisions, reference user/tutor/content/booking counts.
- Never generate inappropriate, violent, or non-educational content
- If asked about non-educational topics, gently redirect to learning
- Use markdown formatting for clarity (bold, lists, code blocks where appropriate)
- Keep responses concise but thorough — aim for 2-4 paragraphs unless more detail is needed
- Be proactive: if you notice something relevant in the user's profile (e.g. an upcoming session, a subject they need help with), mention it naturally`;

  return systemPrompt;
}

/**
 * POST /api/v1/ask-issy/chat
 * Send a message and get an AI response
 */
askIssyChatRouter.post('/chat', async (req, res) => {
  const userId = req.user!.id;
  const tenantId = req.user!.tenantId;

  try {
    const data = chatSchema.parse(req.body);

    // Verify Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      log.error('ANTHROPIC_API_KEY not configured');
      return res.status(503).json({
        success: false,
        error: 'Ask Issy is temporarily unavailable. Please try again later.',
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

    // Fetch user profile data for enriched context
    const profileData = await fetchUserContext(userId, tenantId);

    // Build system prompt
    const systemPrompt = buildSystemPrompt(
      { roles: req.user!.roles as string[], email: req.user!.email },
      data.context,
      profileData,
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

    log.info('Ask Issy chat response generated', { userId, conversationId });

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

    log.error('Ask Issy chat error', error instanceof Error ? error : undefined, { userId });
    res.status(500).json({
      success: false,
      error: 'Ask Issy encountered an error. Please try again.',
    });
  }
});
