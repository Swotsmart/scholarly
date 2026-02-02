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
} from 'lucide-react';

export default function TeacherSettingsPage() {
  const [notifications, setNotifications] = useState({
    emailAssignments: true,
    emailAttendance: false,
    pushMessages: true,
    pushReminders: true,
  });

  const [preferences, setPreferences] = useState({
    theme: 'system',
    language: 'en-AU',
    timezone: 'Australia/Sydney',
    startOfWeek: 'monday',
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Teacher Settings</h1>
        <p className="text-muted-foreground">
          Manage your teaching preferences and notifications
        </p>
      </div>

      {/* Profile Settings */}
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

      {/* Teaching Preferences */}
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

      {/* Notification Settings */}
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

      {/* Display & Localization */}
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

      {/* Privacy & Security */}
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
              <Button variant="outline" size="sm">Enable</Button>
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
          <Button variant="outline">Change Password</Button>
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
