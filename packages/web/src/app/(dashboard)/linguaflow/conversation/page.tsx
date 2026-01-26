'use client';

/**
 * AI Conversation Practice Page
 * Interactive language practice with AI tutor
 */

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  Volume2,
  Sparkles,
  MessageSquare,
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  translation?: string;
  corrections?: { original: string; corrected: string; explanation: string }[];
  timestamp: Date;
};

type Scenario = {
  id: string;
  title: string;
  titleFr: string;
  description: string;
  aiRole: string;
  aiGreeting: string;
  targetVocabulary: string[];
  cefrLevel: string;
};

const scenarios: Scenario[] = [
  {
    id: 'cafe',
    title: 'At the Café',
    titleFr: 'Au Café',
    description: 'Practice ordering food and drinks',
    aiRole: 'Friendly café server named Marie',
    aiGreeting: 'Bonjour et bienvenue au Café de Paris! Qu\'est-ce que je peux vous servir aujourd\'hui?',
    targetVocabulary: ['commander', 'café', 'croissant', 'addition', 's\'il vous plaît'],
    cefrLevel: 'A2-B1',
  },
  {
    id: 'directions',
    title: 'Asking for Directions',
    titleFr: 'Demander son chemin',
    description: 'Learn to navigate in a French city',
    aiRole: 'Helpful local named Pierre',
    aiGreeting: 'Bonjour! Vous avez l\'air perdu. Est-ce que je peux vous aider à trouver votre chemin?',
    targetVocabulary: ['tourner', 'tout droit', 'à gauche', 'à droite', 'près de'],
    cefrLevel: 'A2-B1',
  },
  {
    id: 'shopping',
    title: 'Shopping for Clothes',
    titleFr: 'Faire du shopping',
    description: 'Practice buying clothes and discussing sizes',
    aiRole: 'Boutique assistant named Claire',
    aiGreeting: 'Bonjour et bienvenue dans notre boutique! Vous cherchez quelque chose de particulier aujourd\'hui?',
    targetVocabulary: ['taille', 'essayer', 'couleur', 'prix', 'ça me va'],
    cefrLevel: 'A2-B1',
  },
  {
    id: 'doctor',
    title: 'At the Doctor\'s Office',
    titleFr: 'Chez le médecin',
    description: 'Learn to describe symptoms and health',
    aiRole: 'Doctor named Dr. Dubois',
    aiGreeting: 'Bonjour, asseyez-vous. Alors, qu\'est-ce qui vous amène aujourd\'hui?',
    targetVocabulary: ['mal', 'douleur', 'fièvre', 'ordonnance', 'symptôme'],
    cefrLevel: 'B1',
  },
];

export default function ConversationPage() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [sessionStats, setSessionStats] = useState({ messageCount: 0, xpEarned: 0, vocabulary: new Set<string>() });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speakText = (text: string, lang: string = 'fr-FR') => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      utterance.rate = 0.85;
      window.speechSynthesis.speak(utterance);
    }
  };

  const startScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setMessages([
      {
        id: '1',
        role: 'system',
        content: `Scenario: ${scenario.title} - ${scenario.description}`,
        timestamp: new Date(),
      },
      {
        id: '2',
        role: 'assistant',
        content: scenario.aiGreeting,
        translation: getTranslation(scenario.aiGreeting),
        timestamp: new Date(),
      },
    ]);
    setSessionStats({ messageCount: 0, xpEarned: 0, vocabulary: new Set() });

    // Auto-speak the greeting
    setTimeout(() => speakText(scenario.aiGreeting), 500);
  };

  const getTranslation = (text: string): string => {
    // Demo translations
    const translations: Record<string, string> = {
      'Bonjour et bienvenue au Café de Paris! Qu\'est-ce que je peux vous servir aujourd\'hui?':
        'Hello and welcome to Café de Paris! What can I serve you today?',
      'Bonjour! Vous avez l\'air perdu. Est-ce que je peux vous aider à trouver votre chemin?':
        'Hello! You look lost. Can I help you find your way?',
      'Bonjour et bienvenue dans notre boutique! Vous cherchez quelque chose de particulier aujourd\'hui?':
        'Hello and welcome to our boutique! Are you looking for something specific today?',
      'Bonjour, asseyez-vous. Alors, qu\'est-ce qui vous amène aujourd\'hui?':
        'Hello, have a seat. So, what brings you here today?',
    };
    return translations[text] || 'Translation not available';
  };

  const generateResponse = (userMessage: string): Message => {
    // Demo AI responses based on scenario
    const responses: Record<string, { content: string; translation: string }[]> = {
      cafe: [
        { content: 'Très bien! Un café crème, c\'est parfait. Et avec cela, vous désirez autre chose? Nous avons des croissants frais ce matin.', translation: 'Very good! A café crème, perfect. And with that, would you like anything else? We have fresh croissants this morning.' },
        { content: 'Excellent choix! Je vous apporte ça tout de suite. Ce sera 8 euros, s\'il vous plaît.', translation: 'Excellent choice! I\'ll bring that right away. That will be 8 euros, please.' },
        { content: 'Voici votre commande! Bon appétit! Si vous avez besoin de quelque chose d\'autre, n\'hésitez pas.', translation: 'Here\'s your order! Enjoy! If you need anything else, don\'t hesitate.' },
      ],
      directions: [
        { content: 'Ah, la Tour Eiffel! C\'est facile. Vous allez tout droit pendant 200 mètres, puis vous tournez à gauche.', translation: 'Ah, the Eiffel Tower! That\'s easy. You go straight for 200 meters, then you turn left.' },
        { content: 'Continuez tout droit jusqu\'au grand carrefour, puis prenez la deuxième rue à droite.', translation: 'Continue straight until the big intersection, then take the second street on the right.' },
        { content: 'C\'est à environ 15 minutes à pied. Vous ne pouvez pas la manquer!', translation: 'It\'s about 15 minutes on foot. You can\'t miss it!' },
      ],
      shopping: [
        { content: 'Bien sûr! Cette robe existe en plusieurs couleurs: bleu, rouge, et noir. Quelle taille faites-vous?', translation: 'Of course! This dress comes in several colors: blue, red, and black. What size are you?' },
        { content: 'Parfait! Les cabines d\'essayage sont au fond à gauche. Je vous apporte la taille medium.', translation: 'Perfect! The fitting rooms are at the back on the left. I\'ll bring you the medium size.' },
        { content: 'Ça vous va très bien! Le prix est de 45 euros. Nous avons aussi une promotion: -20% sur le deuxième article!', translation: 'It looks great on you! The price is 45 euros. We also have a promotion: 20% off the second item!' },
      ],
      doctor: [
        { content: 'Je comprends. Depuis combien de temps avez-vous ces symptômes? Est-ce que vous avez de la fièvre?', translation: 'I understand. How long have you had these symptoms? Do you have a fever?' },
        { content: 'Je vais vous examiner. Pouvez-vous me montrer où vous avez mal exactement?', translation: 'I\'m going to examine you. Can you show me exactly where it hurts?' },
        { content: 'Ce n\'est pas grave. Je vais vous prescrire des médicaments. Prenez-les deux fois par jour pendant une semaine.', translation: 'It\'s not serious. I\'m going to prescribe you some medication. Take it twice a day for a week.' },
      ],
    };

    const scenarioResponses = responses[selectedScenario?.id || 'cafe'] || responses.cafe;
    const responseIndex = Math.min(sessionStats.messageCount, scenarioResponses.length - 1);
    const response = scenarioResponses[responseIndex];

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: response.content,
      translation: response.translation,
      timestamp: new Date(),
    };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response delay
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const aiResponse = generateResponse(input);
    setMessages((prev) => [...prev, aiResponse]);
    setSessionStats((prev) => ({
      messageCount: prev.messageCount + 1,
      xpEarned: prev.xpEarned + 15,
      vocabulary: prev.vocabulary,
    }));

    speakText(aiResponse.content);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const endSession = () => {
    setSelectedScenario(null);
    setMessages([]);
  };

  // Scenario Selection
  if (!selectedScenario) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link
            href="/linguaflow"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold">AI Conversation Practice</h1>
            <p className="text-muted-foreground">Choose a scenario to practice your French</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {scenarios.map((scenario) => (
            <motion.div
              key={scenario.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Card
                className="cursor-pointer hover:shadow-lg transition-shadow h-full"
                onClick={() => startScenario(scenario)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{scenario.title}</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {scenario.cefrLevel}
                    </span>
                  </CardTitle>
                  <p className="text-lg text-primary font-medium">{scenario.titleFr}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4">{scenario.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {scenario.targetVocabulary.slice(0, 3).map((word) => (
                      <span
                        key={word}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        {word}
                      </span>
                    ))}
                    {scenario.targetVocabulary.length > 3 && (
                      <span className="px-2 py-1 bg-muted text-muted-foreground rounded-full text-xs">
                        +{scenario.targetVocabulary.length - 3} more
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  // Conversation View
  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={endSession}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            End Session
          </Button>
          <div>
            <h2 className="font-semibold">{selectedScenario.titleFr}</h2>
            <p className="text-sm text-muted-foreground">{selectedScenario.aiRole}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-primary/10 px-3 py-1 rounded-full">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="font-medium text-primary">+{sessionStats.xpEarned} XP</span>
        </div>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          <AnimatePresence>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={cn(
                  'flex',
                  message.role === 'user' ? 'justify-end' : 'justify-start',
                  message.role === 'system' && 'justify-center'
                )}
              >
                {message.role === 'system' ? (
                  <div className="text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full">
                    {message.content}
                  </div>
                ) : (
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl p-4',
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    )}
                  >
                    <p className="text-base">{message.content}</p>
                    {message.translation && message.role === 'assistant' && (
                      <p className="text-sm opacity-70 mt-2 pt-2 border-t border-current/20">
                        {message.translation}
                      </p>
                    )}
                    {message.role === 'assistant' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 h-8 px-2"
                        onClick={() => speakText(message.content)}
                      >
                        <Volume2 className="w-4 h-4 mr-1" />
                        Listen
                      </Button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start"
            >
              <div className="bg-muted rounded-2xl p-4">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input */}
        <div className="p-4 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsListening(!isListening)}
              className={cn(isListening && 'bg-red-100 border-red-300 text-red-600')}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response in French..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={!input.trim() || isLoading}>
              <Send className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Press Enter to send · Click the speaker icon to hear messages
          </p>
        </div>
      </Card>
    </div>
  );
}
