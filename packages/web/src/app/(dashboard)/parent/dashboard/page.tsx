'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  Users,
  TrendingUp,
  Trophy,
  Star,
  Calendar,
  Clock,
  MessageSquare,
  CreditCard,
  FileText,
  Camera,
  ChevronRight,
  Bell,
  BookOpen,
  Award,
  Target,
  CheckCircle2,
  AlertCircle,
  Send,
  Globe,
  GraduationCap,
  Video,
  Download,
  Eye,
  Heart,
  ThumbsUp,
  MoreHorizontal,
  Image as ImageIcon,
  Play,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

// ---------------------------------------------------------------------------
// Language Options (20+ languages)
// ---------------------------------------------------------------------------
const LANGUAGES = [
  { code: 'en', name: 'English', flag: 'GB' },
  { code: 'es', name: 'Espanol', flag: 'ES' },
  { code: 'fr', name: 'Francais', flag: 'FR' },
  { code: 'de', name: 'Deutsch', flag: 'DE' },
  { code: 'it', name: 'Italiano', flag: 'IT' },
  { code: 'pt', name: 'Portugues', flag: 'PT' },
  { code: 'zh', name: 'Chinese', flag: 'CN' },
  { code: 'ja', name: 'Japanese', flag: 'JP' },
  { code: 'ko', name: 'Korean', flag: 'KR' },
  { code: 'ar', name: 'Arabic', flag: 'SA' },
  { code: 'hi', name: 'Hindi', flag: 'IN' },
  { code: 'ru', name: 'Russian', flag: 'RU' },
  { code: 'nl', name: 'Dutch', flag: 'NL' },
  { code: 'pl', name: 'Polish', flag: 'PL' },
  { code: 'tr', name: 'Turkish', flag: 'TR' },
  { code: 'vi', name: 'Vietnamese', flag: 'VN' },
  { code: 'th', name: 'Thai', flag: 'TH' },
  { code: 'id', name: 'Indonesian', flag: 'ID' },
  { code: 'ms', name: 'Malay', flag: 'MY' },
  { code: 'fil', name: 'Filipino', flag: 'PH' },
  { code: 'el', name: 'Greek', flag: 'GR' },
  { code: 'he', name: 'Hebrew', flag: 'IL' },
  { code: 'sv', name: 'Swedish', flag: 'SE' },
  { code: 'da', name: 'Danish', flag: 'DK' },
];

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const CHILDREN = [
  {
    id: 'child-1',
    firstName: 'Emma',
    lastName: 'Johnson',
    avatarUrl: '/avatars/emma.jpg',
    grade: 'Year 4',
    school: 'Sunshine Primary',
    overallProgress: 78,
    streak: 14,
    xp: 2450,
    level: 8,
  },
  {
    id: 'child-2',
    firstName: 'Oliver',
    lastName: 'Johnson',
    avatarUrl: '/avatars/oliver.jpg',
    grade: 'Year 2',
    school: 'Sunshine Primary',
    overallProgress: 65,
    streak: 7,
    xp: 1280,
    level: 5,
  },
  {
    id: 'child-3',
    firstName: 'Sophie',
    lastName: 'Johnson',
    avatarUrl: '/avatars/sophie.jpg',
    grade: 'Year 7',
    school: 'Riverside Secondary',
    overallProgress: 82,
    streak: 21,
    xp: 4100,
    level: 12,
  },
];

const ACHIEVEMENTS = [
  { id: 'a1', name: 'Math Whiz', icon: Star, date: '2 days ago', childId: 'child-1' },
  { id: 'a2', name: 'Reading Champion', icon: BookOpen, date: '3 days ago', childId: 'child-1' },
  { id: 'a3', name: '7 Day Streak', icon: Trophy, date: '5 days ago', childId: 'child-1' },
  { id: 'a4', name: 'Science Explorer', icon: Target, date: 'Today', childId: 'child-1' },
];

const PROGRESS_BY_SUBJECT = [
  { subject: 'Mathematics', progress: 82, trend: 'up', color: 'bg-blue-500' },
  { subject: 'English', progress: 75, trend: 'up', color: 'bg-purple-500' },
  { subject: 'Science', progress: 88, trend: 'stable', color: 'bg-green-500' },
  { subject: 'History', progress: 70, trend: 'up', color: 'bg-amber-500' },
  { subject: 'Art', progress: 92, trend: 'stable', color: 'bg-pink-500' },
];

const CLASS_STORY_POSTS = [
  {
    id: 'post-1',
    type: 'photo',
    teacher: 'Ms. Thompson',
    teacherAvatar: '/teachers/thompson.jpg',
    content: 'Our class had an amazing time during the science fair! The students presented their projects brilliantly.',
    images: ['/class/science-fair-1.jpg', '/class/science-fair-2.jpg'],
    timestamp: '2 hours ago',
    likes: 24,
    comments: 8,
    childrenTagged: ['Emma'],
  },
  {
    id: 'post-2',
    type: 'video',
    teacher: 'Mr. Williams',
    teacherAvatar: '/teachers/williams.jpg',
    content: 'Check out our Year 4 students performing their drama piece! Such talented actors.',
    videoThumbnail: '/class/drama-thumbnail.jpg',
    timestamp: '1 day ago',
    likes: 45,
    comments: 12,
    childrenTagged: ['Emma'],
  },
  {
    id: 'post-3',
    type: 'update',
    teacher: 'Ms. Thompson',
    teacherAvatar: '/teachers/thompson.jpg',
    content: 'Reminder: Excursion permission slips are due by Friday. We are excited about our visit to the museum!',
    timestamp: '2 days ago',
    likes: 18,
    comments: 3,
    childrenTagged: [],
  },
];

const UPCOMING_ITEMS = [
  {
    id: 'u1',
    type: 'assignment',
    title: 'Math Homework - Fractions',
    dueDate: 'Tomorrow, 3:00 PM',
    subject: 'Mathematics',
    status: 'pending',
    childId: 'child-1',
  },
  {
    id: 'u2',
    type: 'event',
    title: 'Parent-Teacher Conference',
    dueDate: 'Feb 5, 2026, 4:30 PM',
    subject: 'School Event',
    status: 'upcoming',
    childId: 'child-1',
  },
  {
    id: 'u3',
    type: 'tutoring',
    title: 'Math Tutoring Session',
    dueDate: 'Feb 3, 2026, 5:00 PM',
    subject: 'Mathematics',
    status: 'confirmed',
    tutor: 'Dr. Sarah Chen',
    childId: 'child-1',
  },
  {
    id: 'u4',
    type: 'assignment',
    title: 'Book Report - Charlotte\'s Web',
    dueDate: 'Feb 8, 2026',
    subject: 'English',
    status: 'in_progress',
    childId: 'child-1',
  },
];

const MESSAGES = [
  {
    id: 'm1',
    from: 'Ms. Thompson',
    avatar: '/teachers/thompson.jpg',
    subject: 'Emma\'s Progress Update',
    preview: 'I wanted to share some wonderful news about Emma\'s improvement in...',
    timestamp: '10:30 AM',
    unread: true,
  },
  {
    id: 'm2',
    from: 'Admin Office',
    avatar: null,
    subject: 'School Newsletter - February 2026',
    preview: 'Welcome to our February newsletter! Here are the key updates...',
    timestamp: 'Yesterday',
    unread: true,
  },
  {
    id: 'm3',
    from: 'Mr. Williams',
    avatar: '/teachers/williams.jpg',
    subject: 'Re: Drama Performance',
    preview: 'Thank you for your kind words! Emma did a fantastic job...',
    timestamp: '2 days ago',
    unread: false,
  },
];

const PAYMENTS = [
  {
    id: 'p1',
    description: 'Term 1 Tuition Fee',
    amount: 2500,
    dueDate: 'Feb 15, 2026',
    status: 'pending',
  },
  {
    id: 'p2',
    description: 'Excursion Fee - Museum Visit',
    amount: 45,
    dueDate: 'Feb 5, 2026',
    status: 'pending',
  },
  {
    id: 'p3',
    description: 'Math Tutoring (January)',
    amount: 320,
    paidDate: 'Jan 25, 2026',
    status: 'paid',
  },
];

const REPORTS = [
  {
    id: 'r1',
    title: 'Term 4 2025 Report Card',
    type: 'report_card',
    date: 'Dec 15, 2025',
    childId: 'child-1',
  },
  {
    id: 'r2',
    title: 'Learning Portfolio - Semester 2',
    type: 'portfolio',
    date: 'Dec 10, 2025',
    childId: 'child-1',
  },
  {
    id: 'r3',
    title: 'Progress Report - November',
    type: 'progress',
    date: 'Nov 30, 2025',
    childId: 'child-1',
  },
];

// ---------------------------------------------------------------------------
// Helper Components
// ---------------------------------------------------------------------------
function getUpcomingIcon(type: string) {
  switch (type) {
    case 'assignment':
      return <FileText className="h-4 w-4" />;
    case 'event':
      return <Calendar className="h-4 w-4" />;
    case 'tutoring':
      return <Video className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
}

function getUpcomingStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          Pending
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          In Progress
        </Badge>
      );
    case 'confirmed':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Confirmed
        </Badge>
      );
    case 'upcoming':
      return (
        <Badge variant="secondary">Upcoming</Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParentDashboardPage() {
  const { user } = useAuthStore();
  const [selectedChildId, setSelectedChildId] = useState(CHILDREN[0].id);
  const [language, setLanguage] = useState('en');
  const [quickReply, setQuickReply] = useState('');

  const selectedChild = useMemo(
    () => CHILDREN.find((c) => c.id === selectedChildId) || CHILDREN[0],
    [selectedChildId]
  );

  const childAchievements = ACHIEVEMENTS.filter((a) => a.childId === selectedChildId);
  const childUpcoming = UPCOMING_ITEMS.filter((u) => u.childId === selectedChildId);
  const unreadCount = MESSAGES.filter((m) => m.unread).length;
  const pendingPayments = PAYMENTS.filter((p) => p.status === 'pending');
  const pendingPaymentTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      {/* Header with Language Selector */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Parent Dashboard</h1>
          <p className="text-muted-foreground">
            Track your children&apos;s progress and stay connected with their education
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[180px]">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Little Explorers Launch Pad */}
      <Link href="/early-years">
        <Card className="overflow-hidden border-0 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 cursor-pointer">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">Little Explorers</h3>
              <p className="text-sm text-white/80">Launch the Early Years learning hub for ages 3-7</p>
            </div>
            <Button variant="secondary" size="sm" className="shrink-0 bg-white/20 text-white border-0 hover:bg-white/30">
              Open <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </Link>

      {/* Children Selector Tabs */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={selectedChildId} onValueChange={setSelectedChildId}>
            <TabsList className="w-full justify-start gap-2 bg-transparent h-auto flex-wrap">
              {CHILDREN.map((child) => (
                <TabsTrigger
                  key={child.id}
                  value={child.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-3 px-4 py-3 rounded-lg border data-[state=active]:border-primary"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={child.avatarUrl} alt={child.firstName} />
                    <AvatarFallback>
                      {child.firstName[0]}{child.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="font-medium">{child.firstName}</p>
                    <p className="text-xs opacity-70">{child.grade}</p>
                  </div>
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>

      {/* Progress Summary Section */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overall Progress Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  {selectedChild.firstName}&apos;s Progress
                </CardTitle>
                <CardDescription>{selectedChild.school} - {selectedChild.grade}</CardDescription>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="flex items-center gap-1 text-orange-500">
                    <Trophy className="h-4 w-4" />
                    <span className="text-lg font-bold">{selectedChild.streak}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4" />
                    <span className="text-lg font-bold">{selectedChild.xp.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">XP (Lvl {selectedChild.level})</p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-bold">{selectedChild.overallProgress}%</span>
              </div>
              <Progress value={selectedChild.overallProgress} className="h-3" />
            </div>

            {/* Subject Progress */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Progress by Subject</h4>
              <div className="grid gap-3 md:grid-cols-2">
                {PROGRESS_BY_SUBJECT.map((subject) => (
                  <div key={subject.subject} className="flex items-center gap-3">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{subject.subject}</span>
                        <div className="flex items-center gap-1">
                          {subject.trend === 'up' && (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          )}
                          <span className="text-sm font-medium">{subject.progress}%</span>
                        </div>
                      </div>
                      <Progress value={subject.progress} className="h-2" indicatorClassName={subject.color} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Achievements Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="h-5 w-5 text-yellow-500" />
              Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {childAchievements.slice(0, 4).map((achievement) => {
              const Icon = achievement.icon;
              return (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="rounded-full bg-yellow-500/10 p-2">
                    <Icon className="h-4 w-4 text-yellow-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{achievement.name}</p>
                    <p className="text-xs text-muted-foreground">{achievement.date}</p>
                  </div>
                </div>
              );
            })}
            <Button variant="ghost" className="w-full" asChild>
              <Link href="/achievements">
                View All Achievements <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Class Story Feed */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5 text-primary" />
              Class Story
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link href="/class-story">View All</Link>
            </Button>
          </div>
          <CardDescription>Latest updates and photos from {selectedChild.firstName}&apos;s teachers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {CLASS_STORY_POSTS.map((post) => (
              <div key={post.id} className="rounded-lg border p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.teacherAvatar} alt={post.teacher} />
                    <AvatarFallback>{post.teacher[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{post.teacher}</p>
                      <p className="text-xs text-muted-foreground">{post.timestamp}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{post.content}</p>

                    {/* Media Preview */}
                    {post.type === 'photo' && post.images && (
                      <div className="mt-3 flex gap-2">
                        {post.images.slice(0, 2).map((img, idx) => (
                          <div
                            key={idx}
                            className="relative h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden"
                          >
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        ))}
                        {post.images.length > 2 && (
                          <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center">
                            <span className="text-sm font-medium">+{post.images.length - 2}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {post.type === 'video' && (
                      <div className="mt-3 relative h-32 w-full max-w-xs rounded-lg bg-muted flex items-center justify-center">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-full bg-primary/90 p-3">
                            <Play className="h-6 w-6 text-primary-foreground" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tagged Children */}
                    {post.childrenTagged.length > 0 && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Tagged: {post.childrenTagged.join(', ')}
                        </Badge>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="mt-3 flex items-center gap-4 pt-2 border-t">
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                        <Heart className="h-4 w-4" />
                        {post.likes}
                      </button>
                      <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary">
                        <MessageSquare className="h-4 w-4" />
                        {post.comments}
                      </button>
                      <button className="ml-auto">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Three Column Layout: Upcoming, Messages, Payments */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5 text-blue-500" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {childUpcoming.slice(0, 4).map((item) => (
              <div key={item.id} className="flex items-start gap-3 rounded-lg border p-3">
                <div className={`rounded-lg p-2 ${
                  item.type === 'assignment' ? 'bg-amber-500/10 text-amber-500' :
                  item.type === 'event' ? 'bg-purple-500/10 text-purple-500' :
                  'bg-green-500/10 text-green-500'
                }`}>
                  {getUpcomingIcon(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.subject}</p>
                  <div className="mt-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">{item.dueDate}</p>
                    {getUpcomingStatusBadge(item.status)}
                  </div>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/calendar">View Calendar</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5 text-green-500" />
                Messages
              </CardTitle>
              {unreadCount > 0 && (
                <Badge className="bg-red-500 text-white">{unreadCount} new</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {MESSAGES.slice(0, 3).map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                  message.unread ? 'bg-primary/5 border-primary/20' : ''
                }`}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={message.avatar || undefined} alt={message.from} />
                  <AvatarFallback>{message.from[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${message.unread ? 'font-semibold' : 'font-medium'}`}>
                      {message.from}
                    </p>
                    <p className="text-xs text-muted-foreground">{message.timestamp}</p>
                  </div>
                  <p className={`text-sm ${message.unread ? 'font-medium' : ''} truncate`}>
                    {message.subject}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{message.preview}</p>
                </div>
              </div>
            ))}

            {/* Quick Reply */}
            <div className="pt-3 border-t">
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Quick reply to teacher..."
                  value={quickReply}
                  onChange={(e) => setQuickReply(e.target.value)}
                  className="flex-1"
                />
                <Button size="icon" disabled={!quickReply.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button variant="outline" className="w-full" asChild>
              <Link href="/messages">View All Messages</Link>
            </Button>
          </CardContent>
        </Card>

        {/* Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <CreditCard className="h-5 w-5 text-purple-500" />
                Payments
              </CardTitle>
              {pendingPayments.length > 0 && (
                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {pendingPayments.length} pending
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Outstanding Balance */}
            {pendingPaymentTotal > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Outstanding Balance</p>
                    <p className="text-2xl font-bold text-amber-600">${pendingPaymentTotal.toLocaleString()}</p>
                  </div>
                  <Button size="sm">Pay Now</Button>
                </div>
              </div>
            )}

            {/* Payment List */}
            {PAYMENTS.slice(0, 3).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{payment.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.status === 'paid' ? `Paid: ${payment.paidDate}` : `Due: ${payment.dueDate}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">${payment.amount.toLocaleString()}</p>
                  {payment.status === 'paid' ? (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Paid
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
              </div>
            ))}

            <Button variant="outline" className="w-full" asChild>
              <Link href="/payments">Payment History</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Reports Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Reports &amp; Portfolios
              </CardTitle>
              <CardDescription>
                Access {selectedChild.firstName}&apos;s academic reports and learning portfolios
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/reports">View All</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {REPORTS.filter((r) => r.childId === selectedChildId).map((report) => (
              <div key={report.id} className="rounded-lg border p-4 hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-primary/10 p-2">
                    {report.type === 'report_card' ? (
                      <FileText className="h-5 w-5 text-primary" />
                    ) : report.type === 'portfolio' ? (
                      <BookOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <TrendingUp className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3">
                  <p className="font-medium">{report.title}</p>
                  <p className="text-sm text-muted-foreground">{report.date}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
