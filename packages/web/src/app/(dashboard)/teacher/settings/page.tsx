'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTeacher } from '@/hooks/use-teacher';
import {
  User,
  Bell,
  Shield,
  Palette,
  Calendar,
  BookOpen,
  Mail,
  Smartphone,
  Globe,
  Clock,
  Save,
  Brain,
  Bot,
  Sparkles,
  AlertTriangle,
  Heart,
  Sliders,
  Zap,
} from 'lucide-react';

export default function TeacherSettingsPage() {
  // Fetch teacher data for contextual AI status display
  const { data } = useTeacher({ page: 'settings' });

  const [notifications, setNotifications] = useState({
    emailAssignments: true,
    emailAttendance: false,
    pushMessages: true,
    pushReminders: true,
    aiAlerts: true,
    aiWeeklyDigest: true,
  });

  const [preferences, setPreferences] = useState({
    theme: 'system',
    language: 'en-AU',
    timezone: 'Australia/Sydney',
    startOfWeek: 'monday',
  });

  const [aiPreferences, setAiPreferences] = useState({
    issyPersonality: 'supportive',
    riskAlertThreshold: 'medium',
    insightFrequency: 'balanced',
    aiGradingAssist: true,
    wellbeingMonitoring: true,
    autoRecommendations: true,
    masteryAlertThreshold: 60,
    showConfidenceScores: true,
    aiLessonSuggestions: true,
  });

  const atRiskCount = data?.insights?.filter(i => i.source === 'ml-at-risk').length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teacher Settings</h1>
        <p className="text-muted-foreground">
          Manage your teaching preferences, AI intelligence settings, and notifications
        </p>
      </div>

      {/* ─── AI Intelligence Preferences ────────────────────────────────────── */}
      {/* This section is placed FIRST because the LIS is central to the teaching
          experience — it's not a footnote, it's the primary configuration surface */}
      <Card className="border-purple-200/50 dark:border-purple-800/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-500" />
            AI Intelligence Settings
          </CardTitle>
          <CardDescription>
            Configure how the Learning Intelligence System assists your teaching.
            {atRiskCount > 0 && (
              <span className="ml-1 text-orange-600 dark:text-orange-400">
                Currently tracking {atRiskCount} at-risk student{atRiskCount > 1 ? 's' : ''}.
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Ask Issy Configuration */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bot className="h-4 w-4 text-purple-500" />
              <Label className="text-base font-semibold">Ask Issy — AI Teaching Assistant</Label>
            </div>
            <div className="space-y-4 ml-6">
              <div className="space-y-2">
                <Label>Conversation Style</Label>
                <Select
                  value={aiPreferences.issyPersonality}
                  onValueChange={(value) => setAiPreferences(prev => ({ ...prev, issyPersonality: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="concise">Concise — Brief, data-driven responses</SelectItem>
                    <SelectItem value="supportive">Supportive — Warm, encouraging with explanations</SelectItem>
                    <SelectItem value="detailed">Detailed — Comprehensive analysis with citations</SelectItem>
                    <SelectItem value="coaching">Coaching — Asks guiding questions to help you reflect</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This affects how Issy communicates with you across all pages
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* At-Risk Detection */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <Label className="text-base font-semibold">At-Risk Detection</Label>
            </div>
            <div className="space-y-4 ml-6">
              <div className="space-y-2">
                <Label>Alert Sensitivity</Label>
                <Select
                  value={aiPreferences.riskAlertThreshold}
                  onValueChange={(value) => setAiPreferences(prev => ({ ...prev, riskAlertThreshold: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low — Only high-confidence critical alerts</SelectItem>
                    <SelectItem value="medium">Medium — Balanced alerts for medium and high risk</SelectItem>
                    <SelectItem value="high">High — All detected risks including early signals</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Higher sensitivity means more alerts but earlier intervention opportunities
                </p>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Wellbeing Monitoring</Label>
                  <p className="text-sm text-muted-foreground">
                    Track session duration, engagement drops, and recommend breaks for students
                  </p>
                </div>
                <Switch
                  checked={aiPreferences.wellbeingMonitoring}
                  onCheckedChange={(checked) => setAiPreferences(prev => ({ ...prev, wellbeingMonitoring: checked }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Mastery & Insights */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <Label className="text-base font-semibold">Mastery Insights & Recommendations</Label>
            </div>
            <div className="space-y-4 ml-6">
              <div className="space-y-2">
                <Label>Insight Frequency</Label>
                <Select
                  value={aiPreferences.insightFrequency}
                  onValueChange={(value) => setAiPreferences(prev => ({ ...prev, insightFrequency: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minimal">Minimal — Only critical insights on dashboard</SelectItem>
                    <SelectItem value="balanced">Balanced — Key insights on each page</SelectItem>
                    <SelectItem value="comprehensive">Comprehensive — Rich AI context on every view</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mastery Alert Threshold</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    value={aiPreferences.masteryAlertThreshold}
                    onChange={(e) => setAiPreferences(prev => ({ ...prev, masteryAlertThreshold: parseInt(e.target.value) || 60 }))}
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">
                    Alert when student mastery drops below {aiPreferences.masteryAlertThreshold}% (BKT pKnown)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Auto-generate Recommendations</Label>
                  <p className="text-sm text-muted-foreground">
                    AI automatically suggests activities, storybooks, and interventions based on student mastery profiles
                  </p>
                </div>
                <Switch
                  checked={aiPreferences.autoRecommendations}
                  onCheckedChange={(checked) => setAiPreferences(prev => ({ ...prev, autoRecommendations: checked }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>Show Confidence Scores</Label>
                  <p className="text-sm text-muted-foreground">
                    Display AI confidence percentages alongside insights and predictions
                  </p>
                </div>
                <Switch
                  checked={aiPreferences.showConfidenceScores}
                  onCheckedChange={(checked) => setAiPreferences(prev => ({ ...prev, showConfidenceScores: checked }))}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* AI-Assisted Teaching Tools */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="h-4 w-4 text-yellow-500" />
              <Label className="text-base font-semibold">AI-Assisted Teaching</Label>
            </div>
            <div className="space-y-4 ml-6">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>AI Grading Assistance</Label>
                  <p className="text-sm text-muted-foreground">
                    AI suggests rubric scores and provides draft feedback for student work
                  </p>
                </div>
                <Switch
                  checked={aiPreferences.aiGradingAssist}
                  onCheckedChange={(checked) => setAiPreferences(prev => ({ ...prev, aiGradingAssist: checked }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label>AI Lesson Plan Suggestions</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive AI-generated lesson plan drafts based on curriculum standards and class mastery levels
                  </p>
                </div>
                <Switch
                  checked={aiPreferences.aiLessonSuggestions}
                  onCheckedChange={(checked) => setAiPreferences(prev => ({ ...prev, aiLessonSuggestions: checked }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Profile Settings ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>Update your teaching profile details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input id="displayName" defaultValue="Ms. Sarah Johnson" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title">Professional Title</Label>
              <Input id="title" defaultValue="Senior Teacher - Design & Technology" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Input
              id="bio"
              defaultValue="Passionate about project-based learning and helping students develop creative problem-solving skills."
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" defaultValue="s.johnson@scholarly.edu" disabled />
              <p className="text-xs text-muted-foreground">Contact admin to change email</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" defaultValue="+61 4XX XXX XXX" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Teaching Preferences ───────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Teaching Preferences
          </CardTitle>
          <CardDescription>Customize your teaching experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Default Class View</Label>
              <Select defaultValue="grid">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid View</SelectItem>
                  <SelectItem value="list">List View</SelectItem>
                  <SelectItem value="calendar">Calendar View</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Grading Scale</Label>
              <Select defaultValue="letter">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="letter">Letter Grades (A-F)</SelectItem>
                  <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                  <SelectItem value="points">Points Based</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Auto-save Lesson Plans</Label>
              <p className="text-sm text-muted-foreground">
                Automatically save drafts while editing
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Show Student Analytics</Label>
              <p className="text-sm text-muted-foreground">
                Display AI insights on student profiles
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </CardContent>
      </Card>

      {/* ─── Notification Settings ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-purple-500" />
              <Label className="text-base">AI Notifications</Label>
            </div>
            <div className="space-y-3 ml-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="aiAlerts" className="font-normal">
                  Real-time at-risk student alerts
                </Label>
                <Switch
                  id="aiAlerts"
                  checked={notifications.aiAlerts}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, aiAlerts: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="aiWeeklyDigest" className="font-normal">
                  Weekly AI insights digest
                </Label>
                <Switch
                  id="aiWeeklyDigest"
                  checked={notifications.aiWeeklyDigest}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, aiWeeklyDigest: checked }))}
                />
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base">Email Notifications</Label>
            </div>
            <div className="space-y-3 ml-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="emailAssignments" className="font-normal">
                  Assignment submissions
                </Label>
                <Switch
                  id="emailAssignments"
                  checked={notifications.emailAssignments}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailAssignments: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="emailAttendance" className="font-normal">
                  Daily attendance summary
                </Label>
                <Switch
                  id="emailAttendance"
                  checked={notifications.emailAttendance}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, emailAttendance: checked }))}
                />
              </div>
            </div>
          </div>
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <Label className="text-base">Push Notifications</Label>
            </div>
            <div className="space-y-3 ml-6">
              <div className="flex items-center justify-between">
                <Label htmlFor="pushMessages" className="font-normal">
                  New messages from students/parents
                </Label>
                <Switch
                  id="pushMessages"
                  checked={notifications.pushMessages}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushMessages: checked }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pushReminders" className="font-normal">
                  Class and meeting reminders
                </Label>
                <Switch
                  id="pushReminders"
                  checked={notifications.pushReminders}
                  onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, pushReminders: checked }))}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Display & Localization ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Display & Localization
          </CardTitle>
          <CardDescription>Customize appearance and regional settings</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Theme
              </Label>
              <Select
                value={preferences.theme}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, theme: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                Language
              </Label>
              <Select
                value={preferences.language}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, language: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en-AU">English (Australia)</SelectItem>
                  <SelectItem value="en-US">English (US)</SelectItem>
                  <SelectItem value="en-GB">English (UK)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timezone
              </Label>
              <Select
                value={preferences.timezone}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, timezone: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Australia/Sydney">Sydney (AEST/AEDT)</SelectItem>
                  <SelectItem value="Australia/Melbourne">Melbourne (AEST/AEDT)</SelectItem>
                  <SelectItem value="Australia/Brisbane">Brisbane (AEST)</SelectItem>
                  <SelectItem value="Australia/Perth">Perth (AWST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Start of Week
              </Label>
              <Select
                value={preferences.startOfWeek}
                onValueChange={(value) => setPreferences(prev => ({ ...prev, startOfWeek: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sunday">Sunday</SelectItem>
                  <SelectItem value="monday">Monday</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Privacy & Security ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security
          </CardTitle>
          <CardDescription>Manage your account security</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security to your account
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Not Enabled</Badge>
              <Button variant="outline" size="sm" onClick={() => alert('Two-factor authentication setup coming soon.')}>Enable</Button>
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>Profile Visibility</Label>
              <p className="text-sm text-muted-foreground">
                Who can see your profile information
              </p>
            </div>
            <Select defaultValue="school">
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="school">School Only</SelectItem>
                <SelectItem value="students">My Students</SelectItem>
                <SelectItem value="private">Private</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label>AI Data Usage</Label>
              <p className="text-sm text-muted-foreground">
                Control how AI processes your teaching data for insights
              </p>
            </div>
            <Select defaultValue="full">
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full">Full Analysis</SelectItem>
                <SelectItem value="anonymised">Anonymised Only</SelectItem>
                <SelectItem value="minimal">Minimal (core features only)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" onClick={() => alert('Password change is handled by your identity provider. Check your account settings.')}>Change Password</Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button size="lg">
          <Save className="mr-2 h-4 w-4" />
          Save All Changes
        </Button>
      </div>
    </div>
  );
}
