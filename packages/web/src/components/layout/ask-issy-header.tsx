'use client';

// =============================================================================
// ASK ISSY — Header Intelligent Search & Discovery
// =============================================================================
// A lightweight dialog triggered from the header that turns Issy into
// the universal discovery layer for the entire Scholarly platform.
//
// Issy knows every module, route, and affordance from the menu registry.
// Users ask natural language questions ("where can I create a report?",
// "how do I grade submissions?") and Issy responds with direct navigation
// links, explanations, and contextual help.
//
// Every query feeds into the composing menu store, making the adaptive
// menus smarter over time — the more users discover through Issy,
// the better their menus become.
// =============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { useComposingMenuStore } from '@/stores/composing-menu-store';
import { useMenuToast } from '@/hooks/use-menu-toast';
import { taskRegistry, getAnchorsForRole } from '@/config/menu-registry';
import { api } from '@/lib/api';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bot, Send, Loader2, ArrowRight, Sparkles, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RegisteredTask } from '@/types/composing-menu-types';

// =============================================================================
// Platform Knowledge Base
// =============================================================================
// Build a comprehensive knowledge map from the task registry so Issy
// can answer "where is..." and "how do I..." questions with precision.

interface ModuleInfo {
  ref: string;
  name: string;
  href: string;
  description: string;
  cluster: string;
  children?: Array<{ name: string; href: string }>;
}

function buildKnowledgeBase(): ModuleInfo[] {
  return Object.values(taskRegistry).map((task: RegisteredTask) => ({
    ref: task.ref,
    name: task.name,
    href: task.href,
    description: task.description || '',
    cluster: task.cluster,
    children: task.children?.map(c => ({ name: c.name, href: c.href })),
  }));
}

// Build a compact text description of the platform for the system prompt
function buildPlatformContext(): string {
  const modules = buildKnowledgeBase();
  const byCluster: Record<string, ModuleInfo[]> = {};
  for (const m of modules) {
    if (!byCluster[m.cluster]) byCluster[m.cluster] = [];
    byCluster[m.cluster].push(m);
  }

  const clusterNames: Record<string, string> = {
    daily: 'Daily Operations',
    teaching: 'Teaching & Curriculum',
    learning: 'Learning & Growth',
    language: 'Language Learning',
    family: 'Family & Parenting',
    homeschool: 'Homeschool',
    tutoring: 'Tutoring',
    admin: 'Administration',
    arena: 'Arena (Competitions)',
    creator: 'Content Creation',
    cross: 'General / Cross-cutting',
    voice: 'Voice Intelligence',
  };

  let ctx = 'SCHOLARLY PLATFORM — COMPLETE MODULE MAP\n\n';
  for (const [cluster, items] of Object.entries(byCluster)) {
    ctx += `## ${clusterNames[cluster] || cluster}\n`;
    for (const item of items) {
      ctx += `- **${item.name}** (${item.href}): ${item.description}`;
      if (item.children?.length) {
        ctx += ` — Sub-pages: ${item.children.map(c => `${c.name} (${c.href})`).join(', ')}`;
      }
      ctx += '\n';
    }
    ctx += '\n';
  }
  return ctx;
}

// Role-specific capabilities
function getRoleCapabilities(role: string): string {
  switch (role) {
    case 'teacher':
      return `This user is a TEACHER. They can: plan lessons, manage classes, grade submissions, create assessments, track student progress, use Voice Intelligence (/voice-intelligence) for TTS narration and pronunciation assessment, manage scheduling/timetable, view student alerts, create challenges, and generate reports.`;
    case 'tutor':
      return `This user is a TUTOR. They can: manage tutoring sessions, track student progress, set availability, manage resources/materials, view earnings and payouts, and manage their public profile.`;
    case 'parent':
      return `This user is a PARENT. They can: view their children's progress and grades, communicate with teachers, manage calendar/events, find and book tutors, manage payments and subscriptions, and access early years content.`;
    case 'admin':
      return `This user is an ADMINISTRATOR. They can: manage users, configure scheduling constraints and rooms, manage interoperability (LTI, OneRoster, Ed-Fi), handle payments/billing, manage marketplace, micro-schools, governance, ML pipeline, and generate institutional reports.`;
    case 'homeschool':
      return `This user is a HOMESCHOOL PARENT. They can: plan curriculum, manage compliance/standards, generate state registration reports, access resources, manage children, and participate in homeschool co-ops.`;
    case 'creator':
      return `This user is a CONTENT CREATOR. They can: use AI Content Studio, publish to the marketplace, manage their published content, and track earnings/analytics.`;
    default:
      return `This user is a LEARNER. They can: browse and enrol in courses, ask Issy for help, follow adaptive learning pathways (Golden Path), work on design challenges and pitch decks, manage their portfolio, track achievements/XP, find tutors, participate in Arena competitions, access LinguaFlow for language learning, and use Voice Intelligence (/voice-intelligence) for TTS, voice cloning, and pronunciation practice.`;
  }
}

// Map user roles to simplified key — checks both `role` (string) and `roles` (array)
function getUserRoleKey(role?: string, roles?: string[]): string {
  // Build a flat list of all role strings
  const all: string[] = [...(roles || [])];
  if (role) all.push(role);
  if (all.length === 0) return 'learner';

  if (all.some(r => r === 'teacher' || r === 'educator')) return 'teacher';
  if (all.some(r => r === 'tutor' || r === 'tutor_professional')) return 'tutor';
  if (all.some(r => r === 'parent' || r === 'guardian')) return 'parent';
  if (all.some(r => r === 'platform_admin' || r === 'admin')) return 'admin';
  if (all.some(r => r === 'homeschool' || r === 'homeschool_parent')) return 'homeschool';
  if (all.some(r => r === 'content_creator' || r === 'creator')) return 'creator';
  return 'learner';
}

// =============================================================================
// Suggested questions by role
// =============================================================================

const suggestedQuestions: Record<string, string[]> = {
  learner: [
    'Where can I find my courses?',
    'How do I track my progress?',
    'Where are my achievements?',
    'How do I join a competition?',
  ],
  teacher: [
    'How do I create a lesson plan?',
    'Where can I grade submissions?',
    'How do I generate a report?',
    'Where is the Voice Intelligence service?',
  ],
  parent: [
    "How do I check my child's progress?",
    'Where can I find a tutor?',
    'How do I message a teacher?',
    'Where are my payment details?',
  ],
  tutor: [
    'Where are my upcoming sessions?',
    'How do I track student progress?',
    'Where can I view my earnings?',
    'How do I update my availability?',
  ],
  admin: [
    'How do I manage users?',
    'Where are the institutional reports?',
    'How do I configure scheduling?',
    'Where is the ML pipeline?',
  ],
  homeschool: [
    'How do I plan my curriculum?',
    'Where are the compliance reports?',
    'How do I find resources?',
    'Where can I join a co-op?',
  ],
  creator: [
    'How do I publish content?',
    'Where can I see my earnings?',
    'How do I use AI Content Studio?',
    'Where is the marketplace?',
  ],
};

// =============================================================================
// Types
// =============================================================================

interface IsssyMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  navigations?: Array<{ label: string; href: string; ref?: string }>;
}

// =============================================================================
// Component
// =============================================================================

interface AskIssyHeaderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AskIssyHeader({ open, onOpenChange }: AskIssyHeaderProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const store = useComposingMenuStore();
  const menuToast = useMenuToast();
  const roleKey = getUserRoleKey(user?.role, user?.roles);
  const suggestions = suggestedQuestions[roleKey] || suggestedQuestions.learner;

  const [messages, setMessages] = useState<IsssyMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      // Reset on close
      setMessages([]);
      setInput('');
    }
  }, [open]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNavigate = useCallback((href: string, taskRef?: string) => {
    // Record usage in the composing menu store
    if (taskRef && user?.roles) {
      const result = store.recordUse(roleKey, taskRef);
      menuToast.handleUseResult(result, roleKey, taskRef);
    }
    router.push(href);
    onOpenChange(false);
  }, [router, onOpenChange, store, menuToast, roleKey, user?.roles]);

  const handleSend = async (text?: string) => {
    const query = text || input.trim();
    if (!query || isLoading) return;

    const userMsg: IsssyMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: query,
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // In demo mode, use local search directly — the API only returns a
    // generic canned response that doesn't help with discovery.
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

    if (isDemoMode) {
      const result = localSearch(query, roleKey);
      setMessages(prev => [...prev, result]);
    } else {
      try {
        const response = await api.askIssy.chat(query, {
          persona: 'discovery',
        });

        if (response.success) {
          const content = response.data.message.content;
          const navigations = extractNavigations(content, roleKey);

          const aiMsg: IsssyMessage = {
            id: response.data.message.id,
            role: 'assistant',
            content,
            navigations,
          };
          setMessages(prev => [...prev, aiMsg]);
        } else {
          const result = localSearch(query, roleKey);
          setMessages(prev => [...prev, result]);
        }
      } catch {
        const result = localSearch(query, roleKey);
        setMessages(prev => [...prev, result]);
      }
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] p-0 gap-0 overflow-hidden max-h-[80vh]">
        <DialogTitle className="sr-only">Ask Issy</DialogTitle>

        {/* Header */}
        <div className="flex items-center gap-3 border-b px-4 py-3 bg-primary/5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary">
            <Bot className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Ask Issy</h3>
            <p className="text-xs text-muted-foreground">
              Ask me anything about Scholarly
            </p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[200px] max-h-[50vh]">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">
                    I know every part of Scholarly. Ask me where to find something,
                    how to do something, or what the platform can do for you.
                  </p>
                </div>
              </div>

              {/* Suggested questions */}
              <div className="grid gap-1.5">
                {suggestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(msg => (
                <div key={msg.id} className={cn('flex gap-2', msg.role === 'user' && 'flex-row-reverse')}>
                  {msg.role === 'assistant' && (
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-3 w-3 text-primary" />
                    </div>
                  )}
                  <div className={cn(
                    'max-w-[85%] space-y-2',
                    msg.role === 'user' && 'text-right',
                  )}>
                    <div className={cn(
                      'inline-block rounded-lg px-3 py-2 text-sm',
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted',
                    )}>
                      {msg.content}
                    </div>

                    {/* Navigation suggestions */}
                    {msg.navigations && msg.navigations.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {msg.navigations.map((nav, i) => (
                          <Button
                            key={i}
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1.5"
                            onClick={() => handleNavigate(nav.href, nav.ref)}
                          >
                            <ArrowRight className="h-3 w-3" />
                            {nav.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                    <Bot className="h-3 w-3 text-primary" />
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/50" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t px-4 py-3">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Issy anything..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={isLoading}
            />
            <Button
              type="submit"
              size="icon"
              className="h-7 w-7 shrink-0"
              disabled={!input.trim() || isLoading}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Local Search — Offline-capable intelligent matching
// =============================================================================
// When the API is unavailable (demo mode, offline, etc.), Issy can still
// answer discovery questions by searching the registry directly.

function localSearch(query: string, role: string): IsssyMessage {
  const q = query.toLowerCase();
  const modules = buildKnowledgeBase();

  // Score each module by relevance to the query
  const scored = modules.map(m => {
    let score = 0;
    const terms = q.split(/\s+/).filter(t => t.length > 2);

    for (const term of terms) {
      if (m.name.toLowerCase().includes(term)) score += 10;
      if (m.description.toLowerCase().includes(term)) score += 5;
      if (m.cluster.toLowerCase().includes(term)) score += 3;
      if (m.children?.some(c => c.name.toLowerCase().includes(term))) score += 4;
    }

    // Boost role-relevant modules
    const roleClusterMap: Record<string, string[]> = {
      teacher: ['teaching', 'daily', 'voice'],
      learner: ['learning', 'daily', 'language', 'arena'],
      parent: ['family', 'daily'],
      tutor: ['tutoring', 'daily'],
      admin: ['admin', 'daily', 'teaching', 'voice'],
      homeschool: ['homeschool', 'family'],
      creator: ['creator', 'voice'],
    };
    if (roleClusterMap[role]?.includes(m.cluster)) score += 2;

    return { module: m, score };
  });

  const matches = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  if (matches.length === 0) {
    return {
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: "I'm not sure about that one. Try asking differently, or you can explore the full platform via the sidebar menu. You can also open the full Ask Issy chat for a more detailed conversation.",
      navigations: [{ label: 'Open Ask Issy', href: '/ask-issy', ref: 'L3' }],
    };
  }

  const top = matches[0].module;
  let content = '';

  // Generate a helpful response
  if (q.includes('where') || q.includes('find') || q.includes('how do i get to')) {
    content = `You can find **${top.name}** here. ${top.description}.`;
    if (top.children?.length) {
      content += ` It includes: ${top.children.map(c => c.name).join(', ')}.`;
    }
  } else if (q.includes('how') || q.includes('create') || q.includes('make') || q.includes('do')) {
    content = `To do that, head to **${top.name}**. ${top.description}.`;
    if (matches.length > 1) {
      content += ` You might also find **${matches[1].module.name}** useful.`;
    }
  } else if (q.includes('what') || q.includes('can i') || q.includes('is there')) {
    content = `Yes! **${top.name}** — ${top.description}.`;
    if (matches.length > 1) {
      content += ` There's also **${matches[1].module.name}** (${matches[1].module.description}).`;
    }
  } else {
    content = `Here's what I found: **${top.name}** — ${top.description}.`;
  }

  const navigations = matches.map(m => ({
    label: m.module.name,
    href: m.module.href,
    ref: m.module.ref,
  }));

  return {
    id: `a-${Date.now()}`,
    role: 'assistant',
    content,
    navigations,
  };
}

// =============================================================================
// Extract navigations from AI response
// =============================================================================
// Scans the AI response text for module names and creates navigation links.

function extractNavigations(content: string, role: string): Array<{ label: string; href: string; ref?: string }> {
  const modules = buildKnowledgeBase();
  const contentLower = content.toLowerCase();
  const navigations: Array<{ label: string; href: string; ref?: string }> = [];
  const seen = new Set<string>();

  for (const m of modules) {
    if (seen.has(m.ref)) continue;
    // Check if module name appears in the response
    if (contentLower.includes(m.name.toLowerCase())) {
      navigations.push({ label: m.name, href: m.href, ref: m.ref });
      seen.add(m.ref);
    }
    // Check children too
    if (m.children) {
      for (const child of m.children) {
        if (contentLower.includes(child.name.toLowerCase()) && !seen.has(m.ref)) {
          navigations.push({ label: `${m.name} > ${child.name}`, href: child.href, ref: m.ref });
          seen.add(m.ref);
        }
      }
    }
  }

  return navigations.slice(0, 4);
}

// =============================================================================
// Onboarding Overlay
// =============================================================================
// Shown once per user after login to introduce Issy as the discovery layer.

const ONBOARDING_KEY = 'scholarly_issy_onboarding_seen';

export function useIssyOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has seen the onboarding
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (!seen) {
      // Small delay so the dashboard loads first
      const timer = setTimeout(() => setShowOnboarding(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const dismissOnboarding = useCallback(() => {
    setShowOnboarding(false);
    localStorage.setItem(ONBOARDING_KEY, 'true');
  }, []);

  return { showOnboarding, dismissOnboarding };
}

interface IssyOnboardingOverlayProps {
  open: boolean;
  onDismiss: () => void;
  onAskIssy: () => void;
}

export function IssyOnboardingOverlay({ open, onDismiss, onAskIssy }: IssyOnboardingOverlayProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="mx-4 w-full max-w-lg animate-in slide-in-from-bottom-4 duration-500">
        <div className="rounded-2xl border bg-card shadow-2xl overflow-hidden">
          {/* Hero */}
          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-8 pt-8 pb-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
              <Bot className="h-8 w-8 text-primary-foreground" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Meet Issy</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Your intelligent guide to everything in Scholarly
            </p>
          </div>

          {/* Features */}
          <div className="px-8 py-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
                <Sparkles className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Ask anything</p>
                <p className="text-xs text-muted-foreground">
                  &ldquo;Where can I create a report?&rdquo; &ldquo;How do I grade submissions?&rdquo;
                  Issy knows every feature and will take you right there.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-500/10">
                <Bot className="h-4 w-4 text-purple-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Always in the header</p>
                <p className="text-xs text-muted-foreground">
                  Look for <strong>Ask Issy</strong> at the top of every page.
                  No need to memorise menus — just ask.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10">
                <ArrowRight className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm font-medium">Your menu learns from you</p>
                <p className="text-xs text-muted-foreground">
                  The more you discover through Issy, the smarter your sidebar becomes.
                  Frequently used features surface automatically.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t px-8 py-4 flex items-center gap-3">
            <Button
              className="flex-1"
              onClick={() => { onDismiss(); onAskIssy(); }}
            >
              <Bot className="mr-2 h-4 w-4" />
              Try Ask Issy
            </Button>
            <Button variant="ghost" onClick={onDismiss}>
              Maybe later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
