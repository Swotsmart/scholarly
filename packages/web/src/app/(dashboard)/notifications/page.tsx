'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bell, Check, CheckCheck, Trash2, Settings, MessageSquare, Calendar,
  BookOpen, AlertTriangle, Award, Users, Clock, Heart, CreditCard,
  Shield, Trophy, Sparkles, Send, ChevronDown, Lightbulb, Brain,
  GraduationCap, PenTool, Star, Vote,
} from 'lucide-react';
import { useNotifications } from '@/hooks/use-notifications';
import { getNotificationCategory } from '@/types/notification';
import type { Notification, NotificationInsight } from '@/types/notification';

// ---------------------------------------------------------------------------
// Icon + colour mapping by notification category
// ---------------------------------------------------------------------------

const categoryConfig: Record<string, { icon: React.ReactNode; colour: string }> = {
  learning: { icon: <GraduationCap className="h-5 w-5" />, colour: 'text-emerald-500' },
  communication: { icon: <MessageSquare className="h-5 w-5" />, colour: 'text-blue-500' },
  achievement: { icon: <Award className="h-5 w-5" />, colour: 'text-yellow-500' },
  system: { icon: <Shield className="h-5 w-5" />, colour: 'text-slate-500' },
  payment: { icon: <CreditCard className="h-5 w-5" />, colour: 'text-violet-500' },
  wellbeing: { icon: <Heart className="h-5 w-5" />, colour: 'text-rose-500' },
  content: { icon: <BookOpen className="h-5 w-5" />, colour: 'text-cyan-500' },
  governance: { icon: <Vote className="h-5 w-5" />, colour: 'text-amber-600' },
};

const priorityBadge: Record<string, string> = {
  urgent: 'bg-red-100 text-red-800 border-red-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  normal: 'bg-slate-100 text-slate-700 border-slate-200',
  low: 'bg-slate-50 text-slate-500 border-slate-100',
};

const digestIconMap: Record<string, React.ReactNode> = {
  'graduation-cap': <GraduationCap className="h-5 w-5" />,
  heart: <Heart className="h-5 w-5" />,
  'message-square': <MessageSquare className="h-5 w-5" />,
  'book-open': <BookOpen className="h-5 w-5" />,
  'credit-card': <CreditCard className="h-5 w-5" />,
  settings: <Settings className="h-5 w-5" />,
  shield: <Shield className="h-5 w-5" />,
  star: <Star className="h-5 w-5" />,
  trophy: <Trophy className="h-5 w-5" />,
  'pen-tool': <PenTool className="h-5 w-5" />,
  vote: <Vote className="h-5 w-5" />,
  bell: <Bell className="h-5 w-5" />,
};

function getIcon(notification: Notification) {
  const cat = getNotificationCategory(notification.type);
  const config = categoryConfig[cat] || categoryConfig.system;
  return <span className={config.colour}>{config.icon}</span>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Insight card component
// ---------------------------------------------------------------------------

function InsightCard({ insight }: { insight: NotificationInsight }) {
  const typeConfig = {
    pattern: { icon: <Brain className="h-4 w-4" />, label: 'Pattern', colour: 'text-purple-600 bg-purple-50' },
    anomaly: { icon: <AlertTriangle className="h-4 w-4" />, label: 'Anomaly', colour: 'text-amber-600 bg-amber-50' },
    recommendation: { icon: <Lightbulb className="h-4 w-4" />, label: 'Tip', colour: 'text-emerald-600 bg-emerald-50' },
  };
  const config = typeConfig[insight.type] || typeConfig.recommendation;

  return (
    <div className="flex gap-3 p-3 rounded-lg border bg-card">
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${config.colour}`}>
        {config.icon}
        {config.label}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{insight.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{insight.description}</p>
        {insight.actionLabel && (
          <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs">
            {insight.actionLabel} &rarr;
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ask Issy panel
// ---------------------------------------------------------------------------

function AskIssyPanel({ askIssy, issyAnswer, isAskingIssy }: {
  askIssy: (q: string) => Promise<string>;
  issyAnswer: string | null;
  isAskingIssy: boolean;
}) {
  const [question, setQuestion] = useState('');

  const handleAsk = async () => {
    if (!question.trim()) return;
    await askIssy(question);
    setQuestion('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Ask Issy About Your Notifications
        </CardTitle>
        <CardDescription>
          Ask anything about your recent activity, patterns, or what needs attention.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAsk()}
            placeholder="e.g. What needs my attention this week?"
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            disabled={isAskingIssy}
          />
          <Button size="sm" onClick={handleAsk} disabled={isAskingIssy || !question.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isAskingIssy && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 animate-pulse text-amber-500" />
            Thinking...
          </div>
        )}
        {issyAnswer && !isAskingIssy && (
          <div className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-100 text-sm">
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p>{issyAnswer}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const {
    notifications, unreadCount, isLoading, error,
    refresh, markAsRead, markAllAsRead, deleteNotification, loadMore, hasMore,
    digest, insights, isDigestLoading,
    askIssy, issyAnswer, isAskingIssy,
  } = useNotifications({ fetchDigest: true, fetchInsights: true });

  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => n.inAppStatus === 'unread')
    : notifications;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notifications
          </h1>
          <p className="text-muted-foreground">
            Stay updated with your learning journey
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Badge variant="secondary">{unreadCount} unread</Badge>
          )}
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Refresh'}
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* AI Digest */}
      {digest && (
        <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-500" />
              Weekly Summary
            </CardTitle>
            <CardDescription className="text-foreground/80">
              {digest.summary}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2">
              {digest.sections.map((section, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg bg-white/60 border border-amber-100">
                  <span className="text-amber-600 mt-0.5">
                    {digestIconMap[section.icon] || <Bell className="h-5 w-5" />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{section.title}</p>
                    {section.items.map((item, j) => (
                      <p key={j} className="text-xs text-muted-foreground">{item.summary}</p>
                    ))}
                    {section.suggestedAction && (
                      <p className="text-xs text-amber-700 mt-1 font-medium">
                        Suggested: {section.suggestedAction}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
            <Lightbulb className="h-4 w-4" />
            AI Insights
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {insights.map(insight => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {/* Ask Issy */}
      <AskIssyPanel askIssy={askIssy} issyAnswer={issyAnswer} isAskingIssy={isAskingIssy} />

      {/* Notification List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle>All Notifications</CardTitle>
            <CardDescription>
              {notifications.length} total, {unreadCount} unread
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
              <CheckCheck className="mr-2 h-4 w-4" />
              Mark All Read
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
              {error}
              <Button variant="link" size="sm" className="ml-2" onClick={() => refresh()}>
                Retry
              </Button>
            </div>
          )}

          <Tabs value={filter} onValueChange={v => setFilter(v as 'all' | 'unread')}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{unreadCount}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value={filter} className="mt-0">
              {isLoading && notifications.length === 0 ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />
                  ))}
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No notifications to show</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNotifications.map(notification => (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
                        notification.inAppStatus === 'unread' ? 'bg-muted/50' : 'bg-background'
                      }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        {getIcon(notification)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className={`font-medium ${notification.inAppStatus === 'unread' ? 'text-foreground' : 'text-muted-foreground'}`}>
                                {notification.title}
                              </p>
                              {(notification.priority === 'high' || notification.priority === 'urgent') && (
                                <span className={`text-xs px-1.5 py-0.5 rounded border ${priorityBadge[notification.priority]}`}>
                                  {notification.priority}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {notification.body}
                            </p>
                          </div>
                          {notification.inAppStatus === 'unread' && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(notification.createdAt)}
                          </span>
                          <div className="flex gap-1">
                            {notification.inAppStatus === 'unread' && (
                              <Button variant="ghost" size="sm" onClick={() => markAsRead(notification.id)}>
                                <Check className="h-4 w-4 mr-1" /> Read
                              </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => deleteNotification(notification.id)}>
                              <Trash2 className="h-4 w-4 mr-1" /> Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {hasMore && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm" onClick={loadMore}>
                        <ChevronDown className="h-4 w-4 mr-1" /> Load More
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
