'use client';

/**
 * AI Studio Dashboard
 * Demonstrates AI-powered content generation, tutoring, and coaching
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  MessageSquare,
  FileText,
  Wand2,
  Send,
  Bot,
  User,
  Loader2,
  BookOpen,
  PenTool,
  Lightbulb,
  Target,
  RefreshCw,
  Copy,
  Check,
  Brain,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeneratedContent {
  title: string;
  content: string;
  type: string;
}

export default function AIStudioPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [chatMessages, setChatMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m your AI learning assistant. I can help you understand concepts, practice problems, or explain topics in different ways. What would you like to learn about today?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [contentPrompt, setContentPrompt] = useState('');
  const [copied, setCopied] = useState(false);

  // Simulated AI responses
  const aiResponses: Record<string, string> = {
    'photosynthesis': `Great question! **Photosynthesis** is the process by which plants convert sunlight into energy. Here's a simple breakdown:\n\n🌱 **The Equation:**\n6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂\n\n**Key Steps:**\n1. **Light Absorption** - Chlorophyll in leaves captures sunlight\n2. **Water Splitting** - Water molecules are split, releasing oxygen\n3. **Carbon Fixation** - CO₂ is converted into glucose\n\nWould you like me to explain any part in more detail?`,
    'quadratic': `The **quadratic formula** helps solve equations in the form ax² + bx + c = 0:\n\n📐 **Formula:**\nx = (-b ± √(b² - 4ac)) / 2a\n\n**Example:** Solve x² + 5x + 6 = 0\n- a = 1, b = 5, c = 6\n- x = (-5 ± √(25-24)) / 2\n- x = (-5 ± 1) / 2\n- x = -2 or x = -3\n\nWant to try a practice problem?`,
    'default': `That's an interesting topic! Let me help you understand it better.\n\nI can:\n- Break down complex concepts\n- Provide examples and analogies\n- Create practice questions\n- Explain in different ways\n\nWhat specific aspect would you like to explore?`,
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsGenerating(true);

    // Simulate AI thinking
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const lowerInput = inputMessage.toLowerCase();
    let response = aiResponses.default;
    if (lowerInput.includes('photosynthesis') || lowerInput.includes('plant')) {
      response = aiResponses.photosynthesis;
    } else if (lowerInput.includes('quadratic') || lowerInput.includes('equation')) {
      response = aiResponses.quadratic;
    }

    const assistantMessage: Message = {
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, assistantMessage]);
    setIsGenerating(false);
  };

  const handleGenerateContent = async (type: string) => {
    if (!contentPrompt.trim()) return;

    setIsGenerating(true);

    // Simulate content generation
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const contentTemplates: Record<string, GeneratedContent> = {
      lesson: {
        title: `Lesson Plan: ${contentPrompt}`,
        type: 'Lesson Plan',
        content: `# ${contentPrompt}\n\n## Learning Objectives\n- Students will understand the key concepts of ${contentPrompt}\n- Students will be able to apply knowledge in practical scenarios\n- Students will demonstrate critical thinking skills\n\n## Introduction (10 minutes)\nBegin with an engaging question or real-world example related to ${contentPrompt}.\n\n## Main Content (25 minutes)\n### Key Concept 1\nExplanation with examples and visual aids.\n\n### Key Concept 2\nInteractive demonstration and guided practice.\n\n### Key Concept 3\nConnection to prior learning and real-world applications.\n\n## Practice Activity (10 minutes)\nStudents work in pairs to solve problems or complete a hands-on task.\n\n## Assessment (5 minutes)\nQuick formative assessment to check understanding.\n\n## Homework\nAssign practice problems or reflection questions.`,
      },
      quiz: {
        title: `Quiz: ${contentPrompt}`,
        type: 'Assessment',
        content: `# Quiz: ${contentPrompt}\n\n## Multiple Choice (4 points each)\n\n**1.** What is the primary purpose of ${contentPrompt}?\n- A) Option A\n- B) Option B\n- C) Option C ✓\n- D) Option D\n\n**2.** Which of the following best describes...?\n- A) Description A\n- B) Description B ✓\n- C) Description C\n- D) Description D\n\n## Short Answer (10 points each)\n\n**3.** Explain the relationship between...\n\n**4.** Describe three examples of...\n\n## Essay Question (20 points)\n\n**5.** Analyze the impact of ${contentPrompt} on... Provide specific examples and evidence to support your argument.`,
      },
      summary: {
        title: `Summary: ${contentPrompt}`,
        type: 'Study Notes',
        content: `# ${contentPrompt} - Summary\n\n## Key Points\n\n✅ **Point 1:** Important concept explanation\n\n✅ **Point 2:** Supporting details and examples\n\n✅ **Point 3:** Connections to related topics\n\n## Important Terms\n\n| Term | Definition |\n|------|------------|\n| Term 1 | Clear, concise definition |\n| Term 2 | Another important definition |\n| Term 3 | Related concept explanation |\n\n## Quick Review Questions\n\n1. What is the main idea?\n2. How does this connect to...?\n3. Why is this important?\n\n## Remember!\n\n💡 Key takeaway: The most important thing to remember about ${contentPrompt} is...`,
      },
    };

    setGeneratedContent(contentTemplates[type] || contentTemplates.summary);
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    if (generatedContent) {
      navigator.clipboard.writeText(generatedContent.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-500" />
            AI Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered content generation, tutoring, and learning assistance
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Zap className="w-3 h-3 mr-1" />
          Powered by Claude
        </Badge>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">1,247</div>
              <div className="text-xs text-muted-foreground">AI Conversations</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">342</div>
              <div className="text-xs text-muted-foreground">Content Generated</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Brain className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">89%</div>
              <div className="text-xs text-muted-foreground">Helpful Rating</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">156</div>
              <div className="text-xs text-muted-foreground">Learning Goals Met</div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Content Tabs */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="chat" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Tutor
            </TabsTrigger>
            <TabsTrigger value="generate" className="flex items-center gap-2">
              <Wand2 className="w-4 h-4" />
              Content Generator
            </TabsTrigger>
            <TabsTrigger value="tools" className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              AI Tools
            </TabsTrigger>
          </TabsList>

          {/* AI Tutor Chat */}
          <TabsContent value="chat" className="mt-4">
            <Card>
              <CardContent className="p-0">
                {/* Chat Messages */}
                <div className="h-[400px] overflow-y-auto p-4 space-y-4">
                  {chatMessages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex gap-3',
                        message.role === 'user' && 'flex-row-reverse'
                      )}
                    >
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                          message.role === 'assistant'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-blue-100 text-blue-600'
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <Bot className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </div>
                      <div
                        className={cn(
                          'max-w-[80%] rounded-2xl px-4 py-2',
                          message.role === 'assistant'
                            ? 'bg-muted'
                            : 'bg-primary text-primary-foreground'
                        )}
                      >
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {isGenerating && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="bg-muted rounded-2xl px-4 py-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Input Area */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Ask me anything... Try 'Explain photosynthesis' or 'Help with quadratic equations'"
                      className="min-h-[60px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={isGenerating || !inputMessage.trim()}
                      className="px-4"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Generator */}
          <TabsContent value="generate" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {/* Input Panel */}
              <Card>
                <CardHeader>
                  <CardTitle>Generate Educational Content</CardTitle>
                  <CardDescription>
                    Enter a topic and select the type of content to generate
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    value={contentPrompt}
                    onChange={(e) => setContentPrompt(e.target.value)}
                    placeholder="Enter a topic (e.g., 'The French Revolution', 'Cellular Respiration', 'Pythagorean Theorem')"
                    className="min-h-[100px]"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateContent('lesson')}
                      disabled={isGenerating || !contentPrompt.trim()}
                      className="flex flex-col items-center py-4 h-auto"
                    >
                      <BookOpen className="w-5 h-5 mb-1" />
                      <span className="text-xs">Lesson Plan</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateContent('quiz')}
                      disabled={isGenerating || !contentPrompt.trim()}
                      className="flex flex-col items-center py-4 h-auto"
                    >
                      <PenTool className="w-5 h-5 mb-1" />
                      <span className="text-xs">Quiz</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleGenerateContent('summary')}
                      disabled={isGenerating || !contentPrompt.trim()}
                      className="flex flex-col items-center py-4 h-auto"
                    >
                      <FileText className="w-5 h-5 mb-1" />
                      <span className="text-xs">Summary</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Output Panel */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Generated Content</CardTitle>
                    {generatedContent && (
                      <Badge variant="secondary" className="mt-1">
                        {generatedContent.type}
                      </Badge>
                    )}
                  </div>
                  {generatedContent && (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleGenerateContent('lesson')}
                      >
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                        {copied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {isGenerating ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <p>Generating content...</p>
                    </div>
                  ) : generatedContent ? (
                    <div className="h-[300px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                        {generatedContent.content}
                      </pre>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                      <Wand2 className="w-8 h-8 mb-2" />
                      <p>Enter a topic and click a button to generate</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* AI Tools */}
          <TabsContent value="tools" className="mt-4">
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                    <PenTool className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Essay Feedback</h3>
                  <p className="text-sm text-muted-foreground">
                    Get AI-powered feedback on writing assignments
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
                    <Target className="w-6 h-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Learning Path</h3>
                  <p className="text-sm text-muted-foreground">
                    Generate personalized learning recommendations
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto mb-4">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Concept Mapper</h3>
                  <p className="text-sm text-muted-foreground">
                    Visualize relationships between concepts
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
