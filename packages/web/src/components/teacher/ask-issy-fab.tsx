'use client';

/**
 * Ask Issy — Floating Action Button for Teacher Pages
 *
 * Always-visible AI assistant accessible from every teacher page.
 * Expands into a slide-up chat panel anchored to the bottom-right.
 * Calls /api/v1/ai-buddy/message for contextual AI responses.
 *
 * Design goals:
 * - One-tap access from any teacher page
 * - Persistent across navigation (lives in teacher layout)
 * - Non-intrusive when collapsed (small FAB)
 * - Rich when expanded (chat + suggestions + context)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { teacherApi } from '@/lib/teacher-api';
import {
  Bot, Send, X, Sparkles, ChevronDown, Brain, MessageCircle,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const CONTEXT_SUGGESTIONS: Record<string, string[]> = {
  '/teacher/dashboard': ['Who needs help today?', 'Summarise my class performance', 'What should I focus on?'],
  '/teacher/students': ['Which students are at risk?', 'Show mastery gaps across my class', 'Recommend interventions'],
  '/teacher/grading': ['Help me write feedback', 'Grade distribution insights', 'Suggest rubric criteria'],
  '/teacher/lesson-planner': ['Suggest a lesson for Year 4', 'Align to ACARA standards', 'Differentiation strategies'],
  '/teacher/assessment': ['Create a quiz on fractions', 'Assessment best practices', 'Compare formative vs summative'],
  '/teacher/scheduling': ['Predict absences this week', 'Relief teacher availability', 'Optimise my timetable'],
  '/teacher/reports': ['Generate a class report', 'Trend analysis for Term 1', 'Identify improvement areas'],
  '/teacher/ml': ['Explain the risk model', 'Model accuracy metrics', 'Retrain with new data?'],
  '/teacher/standards': ['ACARA alignment check', 'AITSL evidence suggestions', 'Compliance audit status'],
  default: ['How are my students doing?', 'What should I teach next?', 'Show at-risk students'],
};

function getSuggestions(pathname: string): string[] {
  for (const [prefix, suggestions] of Object.entries(CONTEXT_SUGGESTIONS)) {
    if (prefix !== 'default' && pathname.startsWith(prefix)) return suggestions;
  }
  return CONTEXT_SUGGESTIONS.default;
}

function getPageContext(pathname: string): string {
  const parts = pathname.replace('/teacher/', '').split('/');
  return parts[0] || 'dashboard';
}

export function AskIssyFab() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const suggestions = getSuggestions(pathname);
  const pageContext = getPageContext(pathname);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsThinking(true);

    try {
      const result = await teacherApi.ai.askIssy(msg, {
        conversationId,
      });
      setConversationId(result.data.conversationId);
      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: result.data.message.content,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please try again in a moment.',
        timestamp: new Date(),
      }]);
    } finally {
      setIsThinking(false);
    }
  }, [input, conversationId]);

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-purple-600 text-white shadow-lg shadow-purple-500/25 transition-all hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 group"
          aria-label="Ask Issy — AI Teaching Assistant"
        >
          <Bot className="h-6 w-6" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
            <span className="relative inline-flex h-4 w-4 rounded-full bg-purple-500">
              <Sparkles className="h-2.5 w-2.5 text-white m-auto" />
            </span>
          </span>
        </button>
      )}

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex w-96 max-h-[32rem] flex-col rounded-2xl border bg-background shadow-2xl shadow-purple-500/10 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <Bot className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Ask Issy</p>
                <p className="text-xs opacity-80">AI Teaching Assistant</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary" className="bg-white/20 text-white text-xs border-0">
                <Brain className="h-3 w-3 mr-1" />
                {pageContext}
              </Badge>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 hover:bg-white/20 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[12rem] max-h-[20rem]">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30 mb-3">
                  <MessageCircle className="h-6 w-6 text-purple-500" />
                </div>
                <p className="text-sm font-medium">How can I help?</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Ask about students, lessons, grades, or anything on this page.
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-md'
                      : 'bg-muted rounded-bl-md'
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {isThinking && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="h-2 w-2 rounded-full bg-purple-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 0 && (
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  className="text-xs rounded-full border border-purple-200 dark:border-purple-800 px-3 py-1.5 text-muted-foreground hover:border-purple-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask Issy anything..."
                className="flex-1 rounded-xl border bg-muted/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isThinking}
              />
              <Button
                size="sm"
                onClick={() => handleSend()}
                disabled={isThinking || !input.trim()}
                className="h-10 w-10 rounded-xl bg-purple-600 hover:bg-purple-700 p-0"
              >
                {isThinking ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
