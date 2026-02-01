'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Phone,
  MonitorUp,
  MessageSquare,
  Users,
  FileText,
  Pencil,
  Send,
  Clock,
  AlertTriangle,
  Maximize2,
  Minimize2,
  Settings,
  MoreVertical,
  X,
  GraduationCap,
  Flag,
  Download,
  Share2,
  Eraser,
  Circle,
  Square,
  Type,
  Palette,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Hand,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Mock session data
const SESSION_DATA = {
  id: 'session_1',
  tutor: {
    id: 'tutor_1',
    name: 'Sarah Chen',
    avatar: null,
  },
  student: {
    id: 'student_1',
    name: 'Alex Thompson',
    avatar: null,
  },
  subject: 'Mathematics',
  topic: 'Quadratic Equations - Factoring',
  startTime: new Date(Date.now() - 25 * 60 * 1000), // Started 25 minutes ago
  duration: 60, // 60 minutes total
  status: 'in_progress',
};

// Mock chat messages
const INITIAL_MESSAGES = [
  {
    id: 'm1',
    sender: 'tutor',
    name: 'Sarah Chen',
    text: 'Hi Alex! Ready to work on quadratic equations today?',
    time: '3:00 PM',
  },
  {
    id: 'm2',
    sender: 'student',
    name: 'Alex Thompson',
    text: 'Yes! I\'ve been struggling with factoring especially.',
    time: '3:01 PM',
  },
  {
    id: 'm3',
    sender: 'tutor',
    name: 'Sarah Chen',
    text: 'No problem, let\'s break it down step by step. I\'ll share my screen to show you the process.',
    time: '3:02 PM',
  },
];

// Mock shared resources
const SHARED_RESOURCES = [
  {
    id: 'r1',
    name: 'Quadratic Factoring Worksheet.pdf',
    type: 'pdf',
    size: '245 KB',
    sharedBy: 'Sarah Chen',
    time: '3:05 PM',
  },
  {
    id: 'r2',
    name: 'Practice Problems Set 1.pdf',
    type: 'pdf',
    size: '128 KB',
    sharedBy: 'Sarah Chen',
    time: '3:15 PM',
  },
];

// Whiteboard tools
const WHITEBOARD_TOOLS = [
  { id: 'select', icon: Hand, label: 'Select' },
  { id: 'pen', icon: Pencil, label: 'Pen' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'rectangle', icon: Square, label: 'Rectangle' },
  { id: 'text', icon: Type, label: 'Text' },
];

const COLORS = [
  '#000000', // Black
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#22C55E', // Green
  '#F59E0B', // Orange
  '#8B5CF6', // Purple
];

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function SessionRoomPage() {
  const params = useParams();
  const sessionId = typeof params.id === 'string' ? params.id : 'session_1';

  // Video controls
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // UI state
  const [activePanel, setActivePanel] = useState<'chat' | 'resources' | 'whiteboard'>('chat');
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // Chat state
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [newMessage, setNewMessage] = useState('');

  // Whiteboard state
  const [activeTool, setActiveTool] = useState('pen');
  const [activeColor, setActiveColor] = useState('#000000');

  // Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(25 * 60); // 25 minutes elapsed
  const [remainingSeconds, setRemainingSeconds] = useState(35 * 60); // 35 minutes remaining

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      setRemainingSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    const msg = {
      id: `m${messages.length + 1}`,
      sender: 'student',
      name: 'Alex Thompson',
      text: newMessage,
      time: new Date().toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit' }),
    };
    setMessages([...messages, msg]);
    setNewMessage('');
  };

  const handleLeaveSession = () => {
    // In a real app, this would handle cleanup and redirect
    window.location.href = '/tutoring/bookings';
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm">{SESSION_DATA.tutor.name}</p>
              <p className="text-xs text-muted-foreground">{SESSION_DATA.subject}</p>
            </div>
          </div>
          <Badge variant="secondary">{SESSION_DATA.topic}</Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="flex items-center gap-6 px-4 py-2 rounded-lg bg-muted">
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Elapsed</p>
              <p className="font-mono font-medium">{formatTime(elapsedSeconds)}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">Remaining</p>
              <p
                className={`font-mono font-medium ${
                  remainingSeconds < 300 ? 'text-red-500' : ''
                }`}
              >
                {formatTime(remainingSeconds)}
              </p>
            </div>
          </div>

          {/* Session Controls */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setIsMuted(!isMuted)}>
              {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setIsVideoOn(!isVideoOn)}>
              {isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
            </Button>
            <Button
              variant={isScreenSharing ? 'default' : 'outline'}
              size="icon"
              onClick={() => setIsScreenSharing(!isScreenSharing)}
            >
              <MonitorUp className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Leave/Report */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm">
              <Flag className="h-4 w-4 mr-2" />
              Report
            </Button>
            <Button variant="destructive" size="sm" onClick={handleLeaveSession}>
              <Phone className="h-4 w-4 mr-2" />
              Leave
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 flex flex-col bg-gray-900 relative">
          {/* Main Video (Tutor) */}
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="w-full max-w-4xl aspect-video bg-gray-800 rounded-lg relative flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="h-32 w-32 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                  <GraduationCap className="h-16 w-16 text-primary" />
                </div>
                <div>
                  <p className="text-white text-lg font-medium">{SESSION_DATA.tutor.name}</p>
                  <p className="text-gray-400 text-sm">Tutor</p>
                </div>
                {isScreenSharing && (
                  <Badge className="bg-blue-500 text-white">
                    <MonitorUp className="h-3 w-3 mr-1" />
                    Screen Sharing
                  </Badge>
                )}
              </div>
              {/* Fullscreen toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20"
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Self Video (PiP) */}
          <div className="absolute bottom-4 right-4 w-48 aspect-video bg-gray-700 rounded-lg border-2 border-gray-600 overflow-hidden">
            {isVideoOn ? (
              <div className="w-full h-full flex items-center justify-center">
                <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <VideoOff className="h-6 w-6 text-gray-500" />
              </div>
            )}
            <div className="absolute bottom-1 left-1 right-1 flex justify-center">
              <Badge variant="secondary" className="text-xs">
                {SESSION_DATA.student.name}
              </Badge>
            </div>
          </div>

          {/* Low Time Warning */}
          {remainingSeconds < 300 && (
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-red-500 text-white animate-pulse">
                <Clock className="h-3 w-3 mr-1" />
                {Math.ceil(remainingSeconds / 60)} minutes remaining
              </Badge>
            </div>
          )}
        </div>

        {/* Side Panel */}
        {!isPanelCollapsed && (
          <div className="w-96 border-l flex flex-col bg-background">
            {/* Panel Tabs */}
            <Tabs value={activePanel} onValueChange={(v) => setActivePanel(v as typeof activePanel)} className="flex flex-col h-full">
              <div className="flex items-center justify-between p-2 border-b">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="chat" className="text-xs">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    Chat
                  </TabsTrigger>
                  <TabsTrigger value="whiteboard" className="text-xs">
                    <Pencil className="h-4 w-4 mr-1" />
                    Board
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="text-xs">
                    <FileText className="h-4 w-4 mr-1" />
                    Files
                  </TabsTrigger>
                </TabsList>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setIsPanelCollapsed(true)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Chat Panel */}
              <TabsContent value="chat" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${
                        msg.sender === 'student' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-3 ${
                          msg.sender === 'student'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {msg.sender === 'student' ? 'You' : msg.name}
                          </span>
                          <span className="text-xs opacity-70">{msg.time}</span>
                        </div>
                        <p className="text-sm">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <Button size="icon" onClick={handleSendMessage}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Whiteboard Panel */}
              <TabsContent value="whiteboard" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
                {/* Whiteboard Tools */}
                <div className="p-2 border-b flex items-center gap-1 flex-wrap">
                  {WHITEBOARD_TOOLS.map((tool) => {
                    const ToolIcon = tool.icon;
                    return (
                      <Button
                        key={tool.id}
                        variant={activeTool === tool.id ? 'default' : 'ghost'}
                        size="icon-sm"
                        onClick={() => setActiveTool(tool.id)}
                        title={tool.label}
                      >
                        <ToolIcon className="h-4 w-4" />
                      </Button>
                    );
                  })}
                  <div className="h-6 w-px bg-border mx-1" />
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setActiveColor(color)}
                      className={`w-6 h-6 rounded-full border-2 ${
                        activeColor === color ? 'border-primary' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <div className="h-6 w-px bg-border mx-1" />
                  <Button variant="ghost" size="icon-sm" title="Undo">
                    <Undo className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="Redo">
                    <Redo className="h-4 w-4" />
                  </Button>
                </div>

                {/* Whiteboard Canvas */}
                <div className="flex-1 bg-white m-4 rounded-lg border relative">
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center space-y-2">
                      <Pencil className="h-12 w-12 mx-auto opacity-50" />
                      <p className="text-sm">Collaborative Whiteboard</p>
                      <p className="text-xs">Draw and annotate together in real-time</p>
                    </div>
                  </div>
                  {/* Zoom controls */}
                  <div className="absolute bottom-2 right-2 flex gap-1">
                    <Button variant="secondary" size="icon-sm">
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon-sm">
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Clear button */}
                <div className="p-2 border-t">
                  <Button variant="outline" size="sm" className="w-full">
                    <Eraser className="h-4 w-4 mr-2" />
                    Clear Board
                  </Button>
                </div>
              </TabsContent>

              {/* Resources Panel */}
              <TabsContent value="resources" className="flex-1 flex flex-col m-0 data-[state=inactive]:hidden">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Shared Documents</h4>
                    <div className="space-y-2">
                      {SHARED_RESOURCES.map((resource) => (
                        <div
                          key={resource.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                        >
                          <div className="h-10 w-10 rounded bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{resource.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {resource.size} - Shared by {resource.sharedBy}
                            </p>
                          </div>
                          <Button variant="ghost" size="icon-sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="text-sm font-medium mb-2">Document Viewer</h4>
                    <div className="aspect-[4/3] rounded-lg border bg-muted flex items-center justify-center">
                      <div className="text-center space-y-2 p-4">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="text-sm text-muted-foreground">
                          Click a document to preview
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t">
                  <Button variant="outline" className="w-full">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share a Document
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Collapsed Panel Toggle */}
        {isPanelCollapsed && (
          <div className="border-l">
            <Button
              variant="ghost"
              size="icon"
              className="m-2"
              onClick={() => setIsPanelCollapsed(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
