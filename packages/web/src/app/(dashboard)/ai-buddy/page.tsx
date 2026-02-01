'use client';

import { useState, useRef, useEffect } from 'react';
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
import { PageHeader } from '@/components/shared';
import {
  Send,
  Copy,
  Bookmark,
  Share2,
  Flag,
  MoreVertical,
  Bot,
  GraduationCap,
  Users,
  Trophy,
  Heart,
  Sparkles,
  Shield,
  BookOpen,
  MessageSquare,
  Lightbulb,
  HelpCircle,
  Code,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Persona definitions
const personas = [
  {
    id: 'tutor',
    name: 'Tutor',
    description: 'Expert guidance and explanations',
    icon: GraduationCap,
    color: 'bg-blue-500',
    greeting: "Hello! I'm your AI Tutor. I'm here to help you understand concepts deeply and guide you through challenging material. What would you like to learn about today?",
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
    content: "Hello! I'm your AI Tutor. I'm here to help you understand concepts deeply and guide you through challenging material. What would you like to learn about today?",
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

// Quick question prompts
const quickPrompts = [
  { id: 'qp-1', text: 'Explain the concept I just learned', icon: Lightbulb },
  { id: 'qp-2', text: 'Give me a practice problem', icon: BookOpen },
  { id: 'qp-3', text: 'Why is this important?', icon: HelpCircle },
  { id: 'qp-4', text: 'Show me an example', icon: Code },
];

// Current context
const currentContext = {
  course: 'Algebra II',
  lesson: 'Quadratic Functions',
  topic: 'Factoring Quadratic Expressions',
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

export default function AIBuddyPage() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('tutor');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentPersona = personas.find((p) => p.id === selectedPersona) || personas[0];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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

    // Simulate AI response
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const aiResponse: Message = {
      id: `msg-${Date.now() + 1}`,
      role: 'assistant',
      content: userMessage.content.toLowerCase().includes('code') || userMessage.content.toLowerCase().includes('factor')
        ? sampleCodeMessage
        : `Great question about "${userMessage.content.substring(0, 50)}..."! Let me help you understand this better.\n\nBased on your current topic of **${currentContext.topic}**, here's what you need to know:\n\n1. **Key Concept**: This is fundamental to understanding how quadratic expressions work.\n\n2. **Application**: You'll use this when solving real-world problems involving parabolic motion, optimization, and more.\n\n3. **Practice Tip**: Try working through several examples to build your intuition.\n\nWould you like me to provide some practice problems or explain any part in more detail?`,
      timestamp: new Date(),
      persona: selectedPersona,
    };

    setMessages((prev) => [...prev, aiResponse]);
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
    <div className="flex h-[calc(100vh-8rem)] flex-col space-y-4">
      <PageHeader
        title="AI Buddy"
        description="Your personalized learning companion"
        actions={
          <div className="flex items-center gap-3">
            {/* Safety Indicator */}
            <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600">
              <Shield className="mr-1 h-3 w-3" />
              Content Filtered
            </Badge>

            {/* Persona Selector */}
            <Select value={selectedPersona} onValueChange={handlePersonaChange}>
              <SelectTrigger className="w-[180px]">
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
        }
      />

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
                          <div className="absolute -right-2 top-0 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
                  placeholder="Ask me anything about your learning..."
                  className="min-h-[44px] max-h-32 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
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
                Current Context
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Course</span>
                <Badge variant="secondary" className="text-xs">
                  {currentContext.course}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Lesson</span>
                <span className="font-medium">{currentContext.lesson}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Topic</span>
                <span className="text-xs">{currentContext.topic}</span>
              </div>
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
