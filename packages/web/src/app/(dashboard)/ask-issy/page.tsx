'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Send,
  Copy,
  Bookmark,
  Share2,
  Flag,
  MoreVertical,
  Download,
  ClipboardCopy,
  Mic,
  MicOff,
  Bot,
  GraduationCap,
  Users,
  Trophy,
  Heart,
  Sparkles,
  Shield,
  BookOpen,
  Lightbulb,
  HelpCircle,
  Code,
  ThumbsUp,
  ThumbsDown,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';

// Persona definitions
const personas = [
  {
    id: 'tutor',
    name: 'Tutor',
    description: 'Expert guidance and explanations',
    icon: GraduationCap,
    color: 'bg-blue-500',
    greeting: "Hello! I'm your Issy Tutor. I'm here to help you understand concepts deeply and guide you through challenging material. What would you like to learn about today?",
    style: 'formal',
  },
  {
    id: 'study-buddy',
    name: 'Study Buddy',
    description: 'Casual learning companion',
    icon: Users,
    color: 'bg-emerald-500',
    greeting: "Hey there! Ready to tackle some learning together? I'm your study buddy - we can work through problems, quiz each other, or just chat about what you're learning. What's on your mind?",
    style: 'casual',
  },
  {
    id: 'coach',
    name: 'Coach',
    description: 'Motivation and goal tracking',
    icon: Trophy,
    color: 'bg-amber-500',
    greeting: "Welcome, champion! I'm your learning coach. Let's work together to set goals, track your progress, and celebrate your wins. Ready to level up your learning game?",
    style: 'motivational',
  },
  {
    id: 'mentor',
    name: 'Mentor',
    description: 'Career and growth guidance',
    icon: Heart,
    color: 'bg-violet-500',
    greeting: "Hello! I'm here as your mentor to help you think about the bigger picture - your goals, interests, and how your learning connects to your future. What's on your mind today?",
    style: 'supportive',
  },
];

// Sample messages
const initialMessages: Message[] = [
  {
    id: 'msg-1',
    role: 'assistant' as const,
    content: "Hello! I'm your Issy Tutor. I'm here to help you understand concepts deeply and guide you through challenging material. What would you like to learn about today?",
    timestamp: new Date(Date.now() - 300000),
    persona: 'tutor',
  },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persona?: string;
  bookmarked?: boolean;
}

// Role-aware quick prompts
const quickPromptsByRole: Record<string, Array<{ id: string; text: string; icon: typeof Lightbulb }>> = {
  learner: [
    { id: 'qp-1', text: 'Explain the concept I just learned', icon: Lightbulb },
    { id: 'qp-2', text: 'Give me a practice problem', icon: BookOpen },
    { id: 'qp-3', text: 'Why is this important?', icon: HelpCircle },
    { id: 'qp-4', text: 'Show me an example', icon: Code },
  ],
  teacher: [
    { id: 'qp-1', text: 'Help me plan a lesson on...', icon: BookOpen },
    { id: 'qp-2', text: 'Suggest differentiation strategies', icon: Lightbulb },
    { id: 'qp-3', text: 'Create an assessment rubric', icon: Code },
    { id: 'qp-4', text: 'How can I support a struggling student?', icon: HelpCircle },
  ],
  tutor: [
    { id: 'qp-1', text: 'Prepare me for my next session', icon: BookOpen },
    { id: 'qp-2', text: 'Suggest practice exercises for...', icon: Code },
    { id: 'qp-3', text: 'How do I explain this concept simply?', icon: Lightbulb },
    { id: 'qp-4', text: 'Tips for engaging a reluctant learner', icon: HelpCircle },
  ],
  parent: [
    { id: 'qp-1', text: "How is my child progressing?", icon: HelpCircle },
    { id: 'qp-2', text: 'How can I support learning at home?', icon: Lightbulb },
    { id: 'qp-3', text: 'Explain this topic in simple terms', icon: BookOpen },
    { id: 'qp-4', text: "What should I discuss at parent-teacher night?", icon: Code },
  ],
  admin: [
    { id: 'qp-1', text: 'Summarise platform activity this week', icon: BookOpen },
    { id: 'qp-2', text: 'What are the key engagement metrics?', icon: Code },
    { id: 'qp-3', text: 'Suggest ways to improve tutor retention', icon: Lightbulb },
    { id: 'qp-4', text: 'Help me draft a communication to parents', icon: HelpCircle },
  ],
};

// Sample code block for demonstration
const sampleCodeMessage = `Here's how you can factor a quadratic expression:

\`\`\`python
def factor_quadratic(a, b, c):
    """
    Factor ax^2 + bx + c into (px + q)(rx + s)
    """
    # Find two numbers that multiply to ac
    # and add up to b
    ac = a * c

    # Find factors
    for i in range(-abs(ac), abs(ac) + 1):
        if i != 0 and ac % i == 0:
            j = ac // i
            if i + j == b:
                return f"Factors found: {i} and {j}"

    return "Cannot be factored with integers"

# Example: x^2 + 5x + 6
result = factor_quadratic(1, 5, 6)
print(result)  # Factors found: 2 and 3
# So x^2 + 5x + 6 = (x + 2)(x + 3)
\`\`\`

The key steps are:
1. Identify a, b, and c in the standard form
2. Find two numbers that multiply to give ac
3. Those same numbers should add up to b
4. Use those numbers to split the middle term and factor by grouping`;

// Map user roles array to a simplified role key for prompts/context
function getUserRoleKey(roles?: string[]): string {
  if (!roles || roles.length === 0) return 'learner';
  if (roles.includes('teacher') || roles.includes('educator')) return 'teacher';
  if (roles.includes('tutor') || roles.includes('tutor_professional') || roles.includes('tutor_university') || roles.includes('tutor_peer')) return 'tutor';
  if (roles.includes('parent') || roles.includes('guardian')) return 'parent';
  if (roles.includes('platform_admin') || roles.includes('admin')) return 'admin';
  return 'learner';
}

// Role-aware sidebar context
function getRoleContext(roleKey: string, user: { firstName?: string; lastName?: string } | null) {
  switch (roleKey) {
    case 'teacher':
      return {
        heading: 'Teaching Context',
        items: [
          { label: 'Role', value: 'Teacher / Educator' },
          { label: 'Focus', value: 'Lesson planning & delivery' },
          { label: 'Support', value: 'Pedagogy, resources, differentiation' },
        ],
      };
    case 'tutor':
      return {
        heading: 'Tutoring Context',
        items: [
          { label: 'Role', value: 'Tutor' },
          { label: 'Focus', value: 'Session prep & student progress' },
          { label: 'Support', value: 'Explanations, exercises, strategies' },
        ],
      };
    case 'parent':
      return {
        heading: 'Parent Context',
        items: [
          { label: 'Role', value: 'Parent / Guardian' },
          { label: 'Focus', value: "Your children's learning" },
          { label: 'Support', value: 'Progress, home learning, communication' },
        ],
      };
    case 'admin':
      return {
        heading: 'Admin Context',
        items: [
          { label: 'Role', value: 'Platform Administrator' },
          { label: 'Focus', value: 'Platform operations' },
          { label: 'Support', value: 'Metrics, communications, decisions' },
        ],
      };
    default:
      return {
        heading: 'Learning Context',
        items: [
          { label: 'Role', value: 'Learner' },
          { label: 'Focus', value: 'Your courses & subjects' },
          { label: 'Support', value: 'Explanations, practice, study tips' },
        ],
      };
  }
}

// Role-aware placeholder text
function getPlaceholder(roleKey: string): string {
  switch (roleKey) {
    case 'teacher': return 'Ask about lesson planning, pedagogy, student support...';
    case 'tutor': return 'Ask about session prep, teaching strategies, exercises...';
    case 'parent': return "Ask about your child's progress, home learning tips...";
    case 'admin': return 'Ask about platform metrics, operations, communications...';
    default: return 'Ask me anything about your learning...';
  }
}

// Role-aware subtitle
function getSubtitle(roleKey: string): string {
  switch (roleKey) {
    case 'teacher': return 'Your intelligent teaching assistant';
    case 'tutor': return 'Your tutoring preparation companion';
    case 'parent': return "Your guide to your child's education";
    case 'admin': return 'Your platform intelligence assistant';
    default: return 'Your personalised learning companion';
  }
}

export default function AskIssyPage() {
  const { user } = useAuthStore();
  const roleKey = getUserRoleKey(user?.roles);
  const quickPrompts = quickPromptsByRole[roleKey] || quickPromptsByRole.learner;
  const sidebarContext = getRoleContext(roleKey, user);

  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('tutor');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentPersona = personas.find((p) => p.id === selectedPersona) || personas[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Speech recognition setup
  useEffect(() => {
    const SpeechRecognitionAPI = (window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition;
    if (SpeechRecognitionAPI) {
      setSpeechSupported(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognitionAPI as any)();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-AU';
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setInputValue((prev: string) => prev ? `${prev} ${transcript}` : transcript);
        }
      };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleSpeechRecognition = useCallback(() => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.askIssy.chat(userMessage.content, {
        conversationId,
        persona: selectedPersona,
      });

      if (response.success) {
        const { message, conversationId: convId } = response.data;
        if (convId) setConversationId(convId);

        const aiResponse: Message = {
          id: message.id,
          role: 'assistant',
          content: message.content,
          timestamp: new Date(message.timestamp),
          persona: selectedPersona,
        };

        setMessages((prev) => [...prev, aiResponse]);
      } else {
        setError('Ask Issy is temporarily unavailable. Please try again.');
        // Add error message to chat
        setMessages((prev) => [...prev, {
          id: `msg-err-${Date.now()}`,
          role: 'assistant',
          content: 'I\'m sorry, I\'m temporarily unavailable. Please try again in a moment.',
          timestamp: new Date(),
          persona: selectedPersona,
        }]);
      }
    } catch {
      setError('Failed to connect to Ask Issy.');
      setMessages((prev) => [...prev, {
        id: `msg-err-${Date.now()}`,
        role: 'assistant',
        content: 'I\'m having trouble connecting right now. Please check your connection and try again.',
        timestamp: new Date(),
        persona: selectedPersona,
      }]);
    }

    setIsLoading(false);
  };

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt);
  };

  const handleCopyMessage = async (id: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBookmarkMessage = (id: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id ? { ...msg, bookmarked: !msg.bookmarked } : msg
      )
    );
  };

  const handlePersonaChange = (personaId: string) => {
    setSelectedPersona(personaId);
    const persona = personas.find((p) => p.id === personaId);
    if (persona) {
      const greetingMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: persona.greeting,
        timestamp: new Date(),
        persona: personaId,
      };
      setMessages((prev) => [...prev, greetingMessage]);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const formatTranscript = () => {
    const lines = messages.map((msg) => {
      const time = formatTimestamp(msg.timestamp);
      const speaker = msg.role === 'user' ? 'You' : `Ask Issy (${(personas.find((p) => p.id === msg.persona) || currentPersona).name})`;
      return `[${time}] ${speaker}:\n${msg.content}\n`;
    });
    return `Ask Issy Transcript — ${new Date().toLocaleDateString('en-AU', { dateStyle: 'long' })}\n${'='.repeat(50)}\n\n${lines.join('\n')}`;
  };

  const handleCopyTranscript = async () => {
    await navigator.clipboard.writeText(formatTranscript());
  };

  const handleDownloadTranscript = () => {
    const blob = new Blob([formatTranscript()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ask-issy-transcript-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    // Handle code blocks
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts = content.split(codeBlockRegex);

    return parts.map((part, index) => {
      // Every third element starting from index 2 is code content
      if (index % 3 === 2) {
        const language = parts[index - 1] || 'text';
        return (
          <div key={index} className="my-3 rounded-lg bg-muted/80 overflow-hidden">
            <div className="flex items-center justify-between bg-muted px-3 py-1.5 text-xs text-muted-foreground">
              <span>{language}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6"
                onClick={() => navigator.clipboard.writeText(part)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
            <pre className="overflow-x-auto p-3 text-sm">
              <code>{part}</code>
            </pre>
          </div>
        );
      }
      // Skip language identifier parts
      if (index % 3 === 1) return null;

      // Regular text - handle bold and line breaks
      return (
        <span key={index}>
          {part.split('\n').map((line, lineIdx) => (
            <span key={lineIdx}>
              {line.split(/\*\*(.*?)\*\*/g).map((segment, segIdx) =>
                segIdx % 2 === 1 ? (
                  <strong key={segIdx}>{segment}</strong>
                ) : (
                  segment
                )
              )}
              {lineIdx < part.split('\n').length - 1 && <br />}
            </span>
          ))}
        </span>
      );
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Ask Issy</h1>
          <p className="text-sm text-muted-foreground">{getSubtitle(roleKey)}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Transcript Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Transcript
                <ChevronDown className="ml-1 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopyTranscript}>
                <ClipboardCopy className="mr-2 h-3.5 w-3.5" />
                Copy to clipboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadTranscript}>
                <Download className="mr-2 h-3.5 w-3.5" />
                Download as text file
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Safety Indicator */}
          <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600">
            <Shield className="mr-1 h-3 w-3" />
            Content Filtered
          </Badge>

          {/* Persona Selector */}
          <Select value={selectedPersona} onValueChange={handlePersonaChange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {personas.map((persona) => {
                const Icon = persona.icon;
                return (
                  <SelectItem key={persona.id} value={persona.id}>
                    <div className="flex items-center gap-2">
                      <div className={cn('rounded-full p-1', persona.color)}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span>{persona.name}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid flex-1 gap-4 overflow-hidden lg:grid-cols-4">
        {/* Chat Area */}
        <div className="flex flex-col overflow-hidden lg:col-span-3">
          <Card className="flex flex-1 flex-col overflow-hidden">
            {/* Messages */}
            <CardContent className="flex-1 overflow-y-auto p-4 scrollbar-thin">
              <div className="space-y-4">
                {messages.map((message) => {
                  const messagePersona = message.persona
                    ? personas.find((p) => p.id === message.persona)
                    : currentPersona;
                  const PersonaIcon = messagePersona?.icon || Bot;

                  return (
                    <div
                      key={message.id}
                      className={cn(
                        'flex gap-3',
                        message.role === 'user' && 'flex-row-reverse'
                      )}
                    >
                      {/* Avatar */}
                      <Avatar className="h-8 w-8 shrink-0">
                        {message.role === 'assistant' ? (
                          <>
                            <AvatarFallback className={cn(messagePersona?.color, 'text-white')}>
                              <PersonaIcon className="h-4 w-4" />
                            </AvatarFallback>
                          </>
                        ) : (
                          <>
                            <AvatarImage src="/avatars/user.png" />
                            <AvatarFallback>ME</AvatarFallback>
                          </>
                        )}
                      </Avatar>

                      {/* Message Content */}
                      <div
                        className={cn(
                          'group relative max-w-[80%] space-y-1',
                          message.role === 'user' && 'text-right'
                        )}
                      >
                        <div
                          className={cn(
                            'rounded-lg px-4 py-2.5 text-sm',
                            message.role === 'assistant'
                              ? 'bg-muted'
                              : 'bg-primary text-primary-foreground'
                          )}
                        >
                          <div className="prose prose-sm dark:prose-invert max-w-none">
                            {renderContent(message.content)}
                          </div>
                        </div>

                        {/* Message Meta */}
                        <div
                          className={cn(
                            'flex items-center gap-2 text-xs text-muted-foreground',
                            message.role === 'user' && 'justify-end'
                          )}
                        >
                          <span>{formatTimestamp(message.timestamp)}</span>
                          {message.bookmarked && (
                            <Bookmark className="h-3 w-3 fill-amber-500 text-amber-500" />
                          )}
                        </div>

                        {/* Message Actions */}
                        {message.role === 'assistant' && (
                          <div className="mt-1 flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="h-7 w-7"
                              onClick={() => handleCopyMessage(message.id, message.content)}
                            >
                              {copiedId === message.id ? (
                                <Check className="h-3 w-3 text-emerald-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className={cn(
                                'h-7 w-7',
                                message.bookmarked && 'text-amber-500'
                              )}
                              onClick={() => handleBookmarkMessage(message.id)}
                            >
                              <Bookmark
                                className={cn(
                                  'h-3 w-3',
                                  message.bookmarked && 'fill-current'
                                )}
                              />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>
                                  <Share2 className="mr-2 h-3 w-3" />
                                  Share
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <ThumbsUp className="mr-2 h-3 w-3" />
                                  Helpful
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <ThumbsDown className="mr-2 h-3 w-3" />
                                  Not helpful
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive">
                                  <Flag className="mr-2 h-3 w-3" />
                                  Report issue
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Loading indicator */}
                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarFallback className={cn(currentPersona.color, 'text-white')}>
                        <currentPersona.icon className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="rounded-lg bg-muted px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50 [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </CardContent>

            {/* Input Area */}
            <div className="border-t p-4">
              {/* Quick Prompts */}
              <div className="mb-3 flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => {
                  const Icon = prompt.icon;
                  return (
                    <Button
                      key={prompt.id}
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => handleQuickPrompt(prompt.text)}
                    >
                      <Icon className="mr-1.5 h-3 w-3" />
                      {prompt.text}
                    </Button>
                  );
                })}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={getPlaceholder(roleKey)}
                  className="min-h-[44px] max-h-32 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                {speechSupported && (
                  <Button
                    variant={isListening ? 'destructive' : 'outline'}
                    onClick={toggleSpeechRecognition}
                    className="shrink-0"
                    title={isListening ? 'Stop listening' : 'Voice input'}
                  >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                )}
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="hidden space-y-4 lg:block">
          {/* Current Context */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <BookOpen className="h-4 w-4" />
                {sidebarContext.heading}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {sidebarContext.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  {i === 0 ? (
                    <Badge variant="secondary" className="text-xs">{item.value}</Badge>
                  ) : (
                    <span className="text-xs text-right max-w-[60%]">{item.value}</span>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Persona Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Sparkles className="h-4 w-4" />
                Active Persona
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className={cn('rounded-lg p-2', currentPersona.color)}>
                  <currentPersona.icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{currentPersona.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentPersona.description}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {currentPersona.style === 'formal' && 'Provides detailed, academic explanations with structured guidance.'}
                {currentPersona.style === 'casual' && 'Engages in friendly, conversational learning interactions.'}
                {currentPersona.style === 'motivational' && 'Focuses on encouragement, goal-setting, and celebrating progress.'}
                {currentPersona.style === 'supportive' && 'Offers thoughtful guidance on growth and long-term learning goals.'}
              </p>
            </CardContent>
          </Card>

          {/* Safety Info */}
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2">
                  <Shield className="h-4 w-4 text-emerald-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    Safe Learning Environment
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All conversations are filtered for age-appropriate content and aligned with educational guidelines.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bookmarked Messages */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Bookmark className="h-4 w-4" />
                Bookmarked
              </CardTitle>
            </CardHeader>
            <CardContent>
              {messages.filter((m) => m.bookmarked).length > 0 ? (
                <div className="space-y-2">
                  {messages
                    .filter((m) => m.bookmarked)
                    .map((msg) => (
                      <div
                        key={msg.id}
                        className="rounded-lg bg-muted/50 p-2 text-xs"
                      >
                        <p className="line-clamp-2">{msg.content}</p>
                        <p className="mt-1 text-muted-foreground">
                          {formatTimestamp(msg.timestamp)}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No bookmarked messages yet. Click the bookmark icon on any response to save it.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
