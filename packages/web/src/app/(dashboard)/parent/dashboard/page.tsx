'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ReorderablePanels } from '@/components/dashboard/draggable-panel';
import { useParentDashboardLayout, type ParentPanelId } from '@/stores/dashboard-layout-store';
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
  MoreHorizontal,
  Image as ImageIcon,
  Play,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { KycGate } from '@/components/verification/kyc-gate';
import { useAuthStore } from '@/stores/auth-store';
import { useParent } from '@/hooks/use-parent';
import type { FamilyChild } from '@/types/parent';

// ---------------------------------------------------------------------------
// Bridge: API FamilyChild → dashboard display format
// Converts real backend data to the shape existing panels expect.
// Falls back to hardcoded data when API returns null.
// ---------------------------------------------------------------------------
function bridgeChild(child: FamilyChild) {
  const pp = child.phonicsProgress;
  const np = child.numeracyProgress;
  const avgAccuracy = pp ? Math.round((pp.blendingAccuracy + pp.segmentingAccuracy) / 2 * 100) : 0;
  const numAccuracy = np ? Math.round((np.subitizingAccuracy + np.additionAccuracy) / 2 * 100) : 0;
  return {
    id: child.id,
    firstName: child.preferredName || child.firstName,
    lastName: '',
    avatarUrl: child.avatarId ? `/avatars/${child.avatarId}.jpg` : '/avatars/default.jpg',
    grade: pp ? `Phase ${pp.currentPhase}` : 'Phase 1',
    school: child.currentWorld.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    overallProgress: Math.max(avgAccuracy, numAccuracy, 10),
    streak: child.currentStreak,
    xp: child.totalStars,
    level: Math.floor(child.totalStars / 300) + 1,
  };
}

function bridgeAchievements(child: FamilyChild) {
  const items: Array<{ id: string; name: string; icon: typeof Star; date: string; childId: string }> = [];
  if (child.currentStreak >= 7) items.push({ id: `${child.id}-streak`, name: `${child.currentStreak} Day Streak`, icon: Trophy, date: 'Recent', childId: child.id });
  if (child.totalStars >= 500) items.push({ id: `${child.id}-stars`, name: `${child.totalStars.toLocaleString()} Stars`, icon: Star, date: 'Recent', childId: child.id });
  if (child.phonicsProgress && child.phonicsProgress.blendingAccuracy >= 0.8) items.push({ id: `${child.id}-blending`, name: 'Blending Pro', icon: BookOpen, date: 'Recent', childId: child.id });
  if (child.phonicsProgress && child.phonicsProgress.sightWordsMastered >= 10) items.push({ id: `${child.id}-sight`, name: 'Sight Word Star', icon: Target, date: 'Recent', childId: child.id });
  return items;
}

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
// ---------------------------------------------------------------------------
// Fallback Data — used ONLY when API returns null (DEMO_MODE or backend down)
// Real data comes from useParent() → family.children bridged via bridgeChild()
// ---------------------------------------------------------------------------
const CHILDREN_FALLBACK = [
  {
    id: 'child-emma-001',
    firstName: 'Emma',
    lastName: 'Patterson',
    avatarUrl: '/avatars/avatar-unicorn.jpg',
    grade: 'Phase 3',
    school: 'Enchanted Forest',
    overallProgress: 78,
    streak: 12,
    xp: 2450,
    level: 8,
  },
  {
    id: 'child-jack-002',
    firstName: 'Jack',
    lastName: 'Patterson',
    avatarUrl: '/avatars/avatar-dinosaur.jpg',
    grade: 'Phase 1',
    school: 'Jungle Adventure',
    overallProgress: 42,
    streak: 5,
    xp: 680,
    level: 3,
  },
];

const ACHIEVEMENTS_FALLBACK = [
  { id: 'a1', name: '12 Day Streak', icon: Trophy, date: 'Recent', childId: 'child-emma-001' },
  { id: 'a2', name: 'Blending Pro', icon: BookOpen, date: 'Recent', childId: 'child-emma-001' },
  { id: 'a3', name: '2,450 Stars', icon: Star, date: 'Recent', childId: 'child-emma-001' },
  { id: 'a4', name: 'Sight Word Star', icon: Target, date: 'Recent', childId: 'child-emma-001' },
];

// Bridge: convert API family data to subject progress display
function bridgeProgressBySubject(child: FamilyChild | undefined) {
  if (!child) return PROGRESS_BY_SUBJECT_FALLBACK;
  const subjects: Array<{ subject: string; progress: number; trend: string; color: string }> = [];
  if (child.phonicsProgress) {
    const pp = child.phonicsProgress;
    subjects.push({ subject: 'Blending', progress: Math.round(pp.blendingAccuracy * 100), trend: pp.blendingAccuracy >= 0.7 ? 'up' : 'stable', color: 'bg-blue-500' });
    subjects.push({ subject: 'Segmenting', progress: Math.round(pp.segmentingAccuracy * 100), trend: pp.segmentingAccuracy >= 0.7 ? 'up' : 'stable', color: 'bg-purple-500' });
    subjects.push({ subject: 'Sight Words', progress: Math.min(pp.sightWordsMastered * 5, 100), trend: 'up', color: 'bg-green-500' });
  }
  if (child.numeracyProgress) {
    const np = child.numeracyProgress;
    subjects.push({ subject: 'Subitizing', progress: Math.round(np.subitizingAccuracy * 100), trend: np.subitizingAccuracy >= 0.7 ? 'up' : 'stable', color: 'bg-amber-500' });
    subjects.push({ subject: 'Addition', progress: Math.round(np.additionAccuracy * 100), trend: 'stable', color: 'bg-pink-500' });
  }
  return subjects.length > 0 ? subjects : PROGRESS_BY_SUBJECT_FALLBACK;
}

const PROGRESS_BY_SUBJECT_FALLBACK = [
  { subject: 'Blending', progress: 82, trend: 'up', color: 'bg-blue-500' },
  { subject: 'Segmenting', progress: 76, trend: 'up', color: 'bg-purple-500' },
  { subject: 'Sight Words', progress: 90, trend: 'up', color: 'bg-green-500' },
  { subject: 'Subitizing', progress: 88, trend: 'stable', color: 'bg-amber-500' },
  { subject: 'Addition', progress: 72, trend: 'stable', color: 'bg-pink-500' },
];

// Class story posts — no dedicated backend endpoint yet; fallback data only.
// Future: wire to collaboration.ts or a class feed endpoint.
const CLASS_STORY_POSTS_FALLBACK = [
  {
    id: 'post-1',
    type: 'update',
    teacher: 'Learning Platform',
    teacherAvatar: undefined as string | undefined,
    content: 'Your family has been learning brilliantly this week! Keep up the great work.',
    timestamp: 'Today',
    likes: 0,
    comments: 0,
    childrenTagged: [] as string[],
  },
];

// Upcoming items — no dedicated backend endpoint yet; fallback only.
// Future: wire to sessions.ts or a calendar/schedule endpoint.
const UPCOMING_ITEMS_FALLBACK = [
  {
    id: 'u1',
    type: 'tutoring',
    title: 'Next Learning Session',
    dueDate: 'Today',
    subject: 'Phonics',
    status: 'upcoming',
    childId: 'child-emma-001',
  },
];

// Messages — no dedicated parent messaging endpoint yet; fallback only.
// Future: wire to messaging service or collaboration.ts
const MESSAGES_FALLBACK = [
  {
    id: 'm1',
    from: 'Scholarly Platform',
    avatar: null,
    subject: 'Welcome to Your Parent Dashboard',
    preview: 'Track your children\'s learning progress, view daily digests, and stay connected.',
    timestamp: 'Today',
    unread: false,
  },
];

// Payments — bridge from subscriptions API when available; fallback otherwise.
const PAYMENTS_FALLBACK = [
  {
    id: 'p1',
    description: 'Family Plan — Monthly',
    amount: 14.99,
    dueDate: 'Current Period',
    status: 'paid',
  },
];

// Reports — no dedicated reports endpoint yet; fallback only.
const REPORTS_FALLBACK = [
  {
    id: 'r1',
    title: 'Daily Learning Digest',
    type: 'progress',
    date: new Date().toISOString().split('T')[0],
    childId: 'child-emma-001',
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
  const { family, digest, isLoading } = useParent();

  // Bridge API data → display format, fall back to hardcoded when API is unavailable
  const CHILDREN_DISPLAY = family
    ? family.children.map(bridgeChild)
    : CHILDREN_FALLBACK;

  const [selectedChildId, setSelectedChildId] = useState(CHILDREN_DISPLAY[0]?.id || 'child-emma-001');
  const [language, setLanguage] = useState('en');
  const [quickReply, setQuickReply] = useState('');

  const selectedChild = useMemo(
    () => CHILDREN_DISPLAY.find((c) => c.id === selectedChildId) || CHILDREN_DISPLAY[0],
    [selectedChildId, CHILDREN_DISPLAY]
  );

  // Bridge achievements from API family data
  const selectedApiChild = family?.children.find(c => c.id === selectedChildId);
  const childAchievements = selectedApiChild
    ? bridgeAchievements(selectedApiChild)
    : ACHIEVEMENTS_FALLBACK.filter((a) => a.childId === selectedChildId);

  // Bridge progress-by-subject from API child data
  const PROGRESS_BY_SUBJECT = bridgeProgressBySubject(selectedApiChild);

  // These panels use fallback data — no dedicated endpoints yet
  const CLASS_STORY_POSTS = digest
    ? digest.children.map(c => ({
        id: `digest-${c.childId}`,
        type: 'update' as const,
        teacher: 'Daily Digest',
        teacherAvatar: undefined as string | undefined,
        content: c.highlights.join('. ') || `${c.firstName} is making great progress!`,
        timestamp: 'Today',
        likes: 0,
        comments: 0,
        childrenTagged: [c.firstName],
      }))
    : CLASS_STORY_POSTS_FALLBACK;

  const childUpcoming = UPCOMING_ITEMS_FALLBACK.filter((u) => u.childId === selectedChildId || true);
  const MESSAGES = MESSAGES_FALLBACK;
  const unreadCount = MESSAGES.filter((m) => m.unread).length;
  const PAYMENTS = PAYMENTS_FALLBACK;
  const pendingPayments = PAYMENTS.filter((p) => p.status === 'pending');
  const pendingPaymentTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
  const REPORTS = REPORTS_FALLBACK;

  // Daily digest highlights (woven into the UI)
  const dailyHighlights = digest?.highlights || [];
  const digestRecommendations = digest?.recommendations || [];

  const { panelOrder, setPanelOrder } = useParentDashboardLayout();

  // Panel map uses closures to access component state
  const panelMap = useMemo<Record<ParentPanelId, () => JSX.Element>>(() => ({
    'progress-summary': () => (
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Daily digest AI insights — woven into the top of the progress panel */}
        {dailyHighlights.length > 0 && (
          <div className="lg:col-span-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-4 mb-2">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span className="font-medium text-blue-800 dark:text-blue-300 text-sm">Today&apos;s Learning Digest</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {dailyHighlights.map((h, i) => (
                <Badge key={i} variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                  {h}
                </Badge>
              ))}
            </div>
            {digestRecommendations.length > 0 && (
              <div className="mt-2 space-y-1">
                {digestRecommendations.map((r, i) => (
                  <p key={i} className="text-xs text-blue-600 dark:text-blue-400 flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                    {r}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
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
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Overall Progress</span>
                <span className="text-sm font-bold">{selectedChild.overallProgress}%</span>
              </div>
              <Progress value={selectedChild.overallProgress} className="h-3" />
            </div>
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
                <div key={achievement.id} className="flex items-center gap-3 rounded-lg border p-3">
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
    ),
    'class-story': () => (
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
                    {post.type === 'photo' && 'images' in post && Array.isArray((post as { images?: string[] }).images) && (
                      <div className="mt-3 flex gap-2">
                        {((post as { images: string[] }).images).slice(0, 2).map((img: string, idx: number) => (
                          <div key={idx} className="relative h-24 w-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          </div>
                        ))}
                        {(post as { images: string[] }).images.length > 2 && (
                          <div className="h-24 w-24 rounded-lg bg-muted flex items-center justify-center">
                            <span className="text-sm font-medium">+{(post as { images: string[] }).images.length - 2}</span>
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
                    {post.childrenTagged.length > 0 && (
                      <div className="mt-2">
                        <Badge variant="secondary" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          Tagged: {post.childrenTagged.join(', ')}
                        </Badge>
                      </div>
                    )}
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
    ),
    'upcoming-messages-payments': () => (
      <div className="grid gap-6 lg:grid-cols-3">
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
            {PAYMENTS.slice(0, 3).map((payment) => (
              <div key={payment.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{payment.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.status === 'paid' ? `Paid: ${payment.dueDate}` : `Due: ${payment.dueDate}`}
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
    ),
    'reports': () => (
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
    ),
  }), [selectedChild, childAchievements, childUpcoming, unreadCount, pendingPayments, pendingPaymentTotal, quickReply, selectedChildId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <KycGate feature="Parent dashboard access">
    <div className="space-y-6">
      {/* Header with Language Selector (fixed) */}
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

      {/* Little Explorers Launch Pad (fixed) */}
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

      {/* Children Selector Tabs (fixed) */}
      <Card>
        <CardContent className="p-4">
          <Tabs value={selectedChildId} onValueChange={setSelectedChildId}>
            <TabsList className="w-full justify-start gap-2 bg-transparent h-auto flex-wrap">
              {CHILDREN_DISPLAY.map((child) => (
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

      {/* Reorderable panels */}
      <ReorderablePanels
        panelOrder={panelOrder}
        onReorder={setPanelOrder}
        panelMap={panelMap}
      />
    </div>
    </KycGate>
  );
}
