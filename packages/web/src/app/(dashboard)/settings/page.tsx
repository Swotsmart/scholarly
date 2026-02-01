'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Lock,
  CreditCard,
  Accessibility,
  Mail,
  Smartphone,
  MessageSquare,
  Calendar,
  FileText,
  Award,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Upload,
  Trash2,
  Monitor,
  Laptop,
  Tablet,
  MapPin,
  Clock,
  RefreshCw,
  Plus,
  Edit,
  Download,
  Star,
  Zap,
  Users,
  ChevronRight,
  Type,
  Contrast,
  MousePointer2,
  Volume2,
  Globe,
  Building2,
  GraduationCap,
  Briefcase,
  Home,
  BookOpen,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  BadgeCheck,
  XCircle,
  Loader2,
  ExternalLink as ExternalLinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { verificationApi, type VerificationStatus, type WWCCVerification } from '@/lib/verification-api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface NotificationSetting {
  id: string;
  label: string;
  description: string;
  email: boolean;
  push: boolean;
  sms: boolean;
}

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
  icon: typeof Monitor;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'bank';
  name: string;
  details: string;
  expiry?: string;
  isDefault: boolean;
}

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------
const NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    id: 'assignments',
    label: 'Assignment Updates',
    description: 'New assignments, due dates, and submission confirmations',
    email: true,
    push: true,
    sms: false,
  },
  {
    id: 'grades',
    label: 'Grade Notifications',
    description: 'When grades are posted or updated',
    email: true,
    push: true,
    sms: true,
  },
  {
    id: 'messages',
    label: 'Teacher Messages',
    description: 'Direct messages from teachers and staff',
    email: true,
    push: true,
    sms: true,
  },
  {
    id: 'events',
    label: 'School Events',
    description: 'Upcoming events, excursions, and meetings',
    email: true,
    push: false,
    sms: false,
  },
  {
    id: 'tutoring',
    label: 'Tutoring Sessions',
    description: 'Session reminders and schedule changes',
    email: true,
    push: true,
    sms: true,
  },
  {
    id: 'progress',
    label: 'Progress Reports',
    description: 'Weekly progress summaries and milestones',
    email: true,
    push: false,
    sms: false,
  },
  {
    id: 'achievements',
    label: 'Achievements & Badges',
    description: 'When your child earns awards or badges',
    email: false,
    push: true,
    sms: false,
  },
  {
    id: 'payments',
    label: 'Payment Reminders',
    description: 'Invoice due dates and payment confirmations',
    email: true,
    push: true,
    sms: true,
  },
];

const ACTIVE_SESSIONS: ActiveSession[] = [
  {
    id: 's1',
    device: 'MacBook Pro',
    browser: 'Chrome 121',
    location: 'Sydney, Australia',
    lastActive: 'Now',
    current: true,
    icon: Laptop,
  },
  {
    id: 's2',
    device: 'iPhone 15 Pro',
    browser: 'Safari Mobile',
    location: 'Sydney, Australia',
    lastActive: '2 hours ago',
    current: false,
    icon: Smartphone,
  },
  {
    id: 's3',
    device: 'iPad Air',
    browser: 'Safari',
    location: 'Sydney, Australia',
    lastActive: '1 day ago',
    current: false,
    icon: Tablet,
  },
  {
    id: 's4',
    device: 'Windows PC',
    browser: 'Edge 121',
    location: 'Melbourne, Australia',
    lastActive: '3 days ago',
    current: false,
    icon: Monitor,
  },
];

const PAYMENT_METHODS: PaymentMethod[] = [
  {
    id: 'pm1',
    type: 'card',
    name: 'Visa ending in 4242',
    details: '**** **** **** 4242',
    expiry: '12/28',
    isDefault: true,
  },
  {
    id: 'pm2',
    type: 'card',
    name: 'Mastercard ending in 8888',
    details: '**** **** **** 8888',
    expiry: '06/27',
    isDefault: false,
  },
  {
    id: 'pm3',
    type: 'bank',
    name: 'Commonwealth Bank',
    details: 'BSB: 062-000 Account: ****4567',
    isDefault: false,
  },
];

const SUBSCRIPTION = {
  plan: 'Premium Family',
  price: 49,
  interval: 'month',
  nextBilling: 'February 15, 2026',
  features: [
    'Unlimited children',
    'Priority tutoring access',
    'Advanced progress analytics',
    'Offline mode',
    '24/7 support',
  ],
};

const INVOICES = [
  { id: 'INV-2026-001', date: 'Jan 15, 2026', amount: 49, status: 'paid' },
  { id: 'INV-2025-012', date: 'Dec 15, 2025', amount: 49, status: 'paid' },
  { id: 'INV-2025-011', date: 'Nov 15, 2025', amount: 49, status: 'paid' },
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function SettingsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<NotificationSetting[]>(NOTIFICATION_SETTINGS);
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [fontSize, setFontSize] = useState('medium');
  const [contrast, setContrast] = useState('normal');
  const [reduceMotion, setReduceMotion] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [verificationLoading, setVerificationLoading] = useState(true);

  // Fetch verification status
  useEffect(() => {
    async function fetchVerificationStatus() {
      try {
        const status = await verificationApi.getStatus();
        setVerificationStatus(status);
      } catch (error) {
        console.error('Failed to fetch verification status:', error);
      } finally {
        setVerificationLoading(false);
      }
    }
    fetchVerificationStatus();
  }, []);

  const toggleNotification = (settingId: string, channel: 'email' | 'push' | 'sms') => {
    setNotifications((prev) =>
      prev.map((setting) =>
        setting.id === settingId
          ? { ...setting, [channel]: !setting[channel] }
          : setting
      )
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account, notifications, privacy, and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex-wrap h-auto gap-1 bg-transparent p-0">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="privacy" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Eye className="h-4 w-4" />
            Privacy
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="accessibility" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Accessibility className="h-4 w-4" />
            Accessibility
          </TabsTrigger>
          <TabsTrigger value="verification" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <ShieldCheck className="h-4 w-4" />
            Verification
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Globe className="h-4 w-4" />
            Services
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details and profile picture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Upload */}
                <div className="flex items-center gap-6">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={user?.avatarUrl} alt={user?.firstName} />
                    <AvatarFallback className="text-2xl">
                      {user?.firstName?.[0]}{user?.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Button variant="outline">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Photo
                      </Button>
                      <Button variant="ghost" className="text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      JPG, PNG, or GIF. Maximum file size 2MB.
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" defaultValue={user?.firstName || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue={user?.lastName || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" defaultValue={user?.email || ''} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" placeholder="+61 4XX XXX XXX" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select defaultValue="australia-sydney">
                      <SelectTrigger id="timezone">
                        <SelectValue placeholder="Select timezone" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="australia-sydney">Australia/Sydney (AEDT)</SelectItem>
                        <SelectItem value="australia-melbourne">Australia/Melbourne (AEDT)</SelectItem>
                        <SelectItem value="australia-brisbane">Australia/Brisbane (AEST)</SelectItem>
                        <SelectItem value="australia-perth">Australia/Perth (AWST)</SelectItem>
                        <SelectItem value="australia-adelaide">Australia/Adelaide (ACDT)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select defaultValue="en-au">
                      <SelectTrigger id="language">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en-au">English (Australia)</SelectItem>
                        <SelectItem value="en-us">English (US)</SelectItem>
                        <SelectItem value="en-gb">English (UK)</SelectItem>
                        <SelectItem value="zh">Chinese (Simplified)</SelectItem>
                        <SelectItem value="vi">Vietnamese</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <textarea
                    id="bio"
                    className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    placeholder="Tell us a bit about yourself..."
                  />
                </div>

                <div className="flex justify-end">
                  <Button>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications for different events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {/* Header Row */}
                <div className="grid grid-cols-[1fr,80px,80px,80px] gap-4 pb-4 border-b">
                  <div className="text-sm font-medium">Event Type</div>
                  <div className="text-sm font-medium text-center">
                    <Mail className="h-4 w-4 mx-auto mb-1" />
                    Email
                  </div>
                  <div className="text-sm font-medium text-center">
                    <Smartphone className="h-4 w-4 mx-auto mb-1" />
                    Push
                  </div>
                  <div className="text-sm font-medium text-center">
                    <MessageSquare className="h-4 w-4 mx-auto mb-1" />
                    SMS
                  </div>
                </div>

                {/* Notification Rows */}
                {notifications.map((setting) => (
                  <div
                    key={setting.id}
                    className="grid grid-cols-[1fr,80px,80px,80px] gap-4 py-4 border-b last:border-0 items-center"
                  >
                    <div>
                      <p className="font-medium">{setting.label}</p>
                      <p className="text-sm text-muted-foreground">{setting.description}</p>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        variant={setting.email ? 'default' : 'outline'}
                        size="sm"
                        className="w-14"
                        onClick={() => toggleNotification(setting.id, 'email')}
                      >
                        {setting.email ? 'On' : 'Off'}
                      </Button>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        variant={setting.push ? 'default' : 'outline'}
                        size="sm"
                        className="w-14"
                        onClick={() => toggleNotification(setting.id, 'push')}
                      >
                        {setting.push ? 'On' : 'Off'}
                      </Button>
                    </div>
                    <div className="flex justify-center">
                      <Button
                        variant={setting.sms ? 'default' : 'outline'}
                        size="sm"
                        className="w-14"
                        onClick={() => toggleNotification(setting.id, 'sms')}
                      >
                        {setting.sms ? 'On' : 'Off'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Quiet Hours</p>
                    <p className="text-sm text-muted-foreground">
                      Pause push notifications during specific times
                    </p>
                  </div>
                  <Button variant="outline">Configure</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Privacy Tab */}
        <TabsContent value="privacy">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Sharing Controls</CardTitle>
                <CardDescription>
                  Control how your data is shared and used across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="font-medium">Share Progress with Teachers</p>
                        <p className="text-sm text-muted-foreground">
                          Allow teachers to view detailed learning analytics
                        </p>
                      </div>
                    </div>
                    <Button variant="default" size="sm">Enabled</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-purple-500/10 p-2">
                        <Award className="h-5 w-5 text-purple-500" />
                      </div>
                      <div>
                        <p className="font-medium">Public Achievement Display</p>
                        <p className="text-sm text-muted-foreground">
                          Show achievements on public profiles and leaderboards
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Disabled</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-green-500/10 p-2">
                        <FileText className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">Anonymous Usage Analytics</p>
                        <p className="text-sm text-muted-foreground">
                          Help improve the platform with anonymous usage data
                        </p>
                      </div>
                    </div>
                    <Button variant="default" size="sm">Enabled</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-amber-500/10 p-2">
                        <Calendar className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="font-medium">Third-Party Calendar Sync</p>
                        <p className="text-sm text-muted-foreground">
                          Sync events with Google Calendar, Apple Calendar, etc.
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Disabled</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
                <CardDescription>
                  Download or delete your personal data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div>
                    <p className="font-medium">Download Your Data</p>
                    <p className="text-sm text-muted-foreground">
                      Get a copy of all your data in a portable format
                    </p>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Request Download
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/30 bg-destructive/5">
                  <div>
                    <p className="font-medium text-destructive">Delete Account</p>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all associated data
                    </p>
                  </div>
                  <Button variant="destructive">Delete Account</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Password</CardTitle>
                <CardDescription>
                  Update your password to keep your account secure
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter current password"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      placeholder="Enter new password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  Password must be at least 8 characters with uppercase, lowercase, number, and special character.
                </div>
                <Button>Update Password</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                <CardDescription>
                  Add an extra layer of security to your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className={`rounded-lg p-3 ${twoFactorEnabled ? 'bg-green-500/10' : 'bg-muted'}`}>
                      <Lock className={`h-6 w-6 ${twoFactorEnabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        {twoFactorEnabled
                          ? 'Your account is protected with 2FA'
                          : 'Protect your account with authenticator app'}
                      </p>
                    </div>
                  </div>
                  {twoFactorEnabled ? (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                      <Button variant="outline" onClick={() => setTwoFactorEnabled(false)}>
                        Disable
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={() => setTwoFactorEnabled(true)}>Enable 2FA</Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Sessions</CardTitle>
                <CardDescription>
                  Manage devices where you are currently logged in
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {ACTIVE_SESSIONS.map((session) => {
                  const Icon = session.icon;
                  return (
                    <div
                      key={session.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        session.current ? 'border-primary/30 bg-primary/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-muted p-3">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{session.device}</p>
                            {session.current && (
                              <Badge variant="secondary" className="text-xs">Current</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{session.browser}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {session.lastActive}
                            </span>
                          </div>
                        </div>
                      </div>
                      {!session.current && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                          Revoke
                        </Button>
                      )}
                    </div>
                  );
                })}
                <Button variant="outline" className="w-full">
                  Sign Out of All Other Sessions
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <div className="space-y-6">
            {/* Current Subscription */}
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Star className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{SUBSCRIPTION.plan}</CardTitle>
                      <CardDescription>Your current subscription plan</CardDescription>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold">${SUBSCRIPTION.price}</p>
                    <p className="text-sm text-muted-foreground">/{SUBSCRIPTION.interval}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2 mb-6">
                  {SUBSCRIPTION.features.map((feature) => (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RefreshCw className="h-4 w-4" />
                    Next billing: {SUBSCRIPTION.nextBilling}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Change Plan</Button>
                    <Button variant="ghost" className="text-destructive hover:text-destructive">
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment Methods</CardTitle>
                    <CardDescription>Manage your payment options</CardDescription>
                  </div>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Method
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {PAYMENT_METHODS.map((method) => (
                  <div
                    key={method.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      method.isDefault ? 'border-primary/30 bg-primary/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{method.name}</p>
                          {method.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{method.details}</p>
                        {method.expiry && (
                          <p className="text-xs text-muted-foreground">Expires: {method.expiry}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Edit className="h-4 w-4" />
                      </Button>
                      {!method.isDefault && (
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Invoices */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Billing History</CardTitle>
                    <CardDescription>View and download past invoices</CardDescription>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export All
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {INVOICES.map((invoice) => (
                    <div
                      key={invoice.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-muted p-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">{invoice.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">${invoice.amount}</span>
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Paid
                        </Badge>
                        <Button variant="ghost" size="icon">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Accessibility Tab */}
        <TabsContent value="accessibility">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Display Settings</CardTitle>
                <CardDescription>
                  Customize the visual appearance for better readability
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Font Size */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Type className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Font Size</Label>
                      <p className="text-sm text-muted-foreground">Adjust the text size across the application</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['small', 'medium', 'large', 'extra-large'].map((size) => (
                      <Button
                        key={size}
                        variant={fontSize === size ? 'default' : 'outline'}
                        onClick={() => setFontSize(size)}
                        className="capitalize"
                      >
                        {size === 'extra-large' ? 'XL' : size}
                      </Button>
                    ))}
                  </div>
                  <div className="p-4 rounded-lg bg-muted">
                    <p className={`${
                      fontSize === 'small' ? 'text-sm' :
                      fontSize === 'medium' ? 'text-base' :
                      fontSize === 'large' ? 'text-lg' :
                      'text-xl'
                    }`}>
                      This is a preview of how text will appear with your selected font size.
                    </p>
                  </div>
                </div>

                {/* Contrast */}
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-3">
                    <Contrast className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-base font-medium">Contrast</Label>
                      <p className="text-sm text-muted-foreground">Adjust color contrast for better visibility</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {['normal', 'high', 'highest'].map((level) => (
                      <Button
                        key={level}
                        variant={contrast === level ? 'default' : 'outline'}
                        onClick={() => setContrast(level)}
                        className="capitalize"
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Motion &amp; Animation</CardTitle>
                <CardDescription>
                  Control motion and animation preferences
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-3">
                      <MousePointer2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Reduce Motion</p>
                      <p className="text-sm text-muted-foreground">
                        Minimize animations and transitions
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={reduceMotion ? 'default' : 'outline'}
                    onClick={() => setReduceMotion(!reduceMotion)}
                  >
                    {reduceMotion ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-muted p-3">
                      <Volume2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">Screen Reader Optimization</p>
                      <p className="text-sm text-muted-foreground">
                        Enhance compatibility with screen readers
                      </p>
                    </div>
                  </div>
                  <Button
                    variant={screenReader ? 'default' : 'outline'}
                    onClick={() => setScreenReader(!screenReader)}
                  >
                    {screenReader ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Keyboard Navigation</CardTitle>
                <CardDescription>
                  Information about keyboard shortcuts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm">Navigate elements</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-background rounded border">Tab</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm">Activate element</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-background rounded border">Enter</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm">Close dialog</span>
                    <kbd className="px-2 py-1 text-xs font-mono bg-background rounded border">Esc</kbd>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <span className="text-sm">Navigate options</span>
                    <div className="flex gap-1">
                      <kbd className="px-2 py-1 text-xs font-mono bg-background rounded border">Arrow Keys</kbd>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Keyboard Shortcuts
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Verification Tab */}
        <TabsContent value="verification">
          <div className="space-y-6">
            {verificationLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Verification Status Overview */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`rounded-lg p-3 ${
                          verificationStatus?.overallStatus === 'complete'
                            ? 'bg-green-500/10'
                            : verificationStatus?.overallStatus === 'failed'
                            ? 'bg-red-500/10'
                            : 'bg-amber-500/10'
                        }`}>
                          {verificationStatus?.overallStatus === 'complete' ? (
                            <BadgeCheck className="h-6 w-6 text-green-600" />
                          ) : verificationStatus?.overallStatus === 'failed' ? (
                            <XCircle className="h-6 w-6 text-red-600" />
                          ) : (
                            <ShieldCheck className="h-6 w-6 text-amber-600" />
                          )}
                        </div>
                        <div>
                          <CardTitle>Verification Status</CardTitle>
                          <CardDescription>
                            {verificationStatus?.overallStatus === 'complete'
                              ? 'All required verifications are complete'
                              : verificationStatus?.overallStatus === 'failed'
                              ? 'One or more verifications have failed'
                              : 'Some verifications are pending or incomplete'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        className={
                          verificationStatus?.overallStatus === 'complete'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : verificationStatus?.overallStatus === 'failed'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        }
                      >
                        {verificationStatus?.overallStatus === 'complete' ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </>
                        ) : verificationStatus?.overallStatus === 'failed' ? (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Action Required
                          </>
                        ) : (
                          <>
                            <Clock className="h-3 w-3 mr-1" />
                            Incomplete
                          </>
                        )}
                      </Badge>
                    </div>
                  </CardHeader>
                  {verificationStatus?.requirements && verificationStatus.requirements.length > 0 && (
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        {verificationStatus.requirements.map((req, i) => (
                          <p key={i} className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            {req}
                          </p>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>

                {/* Identity Verification (KYC) */}
                {verificationStatus?.kyc.required && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-3 ${
                            verificationStatus.kyc.status === 'verified'
                              ? 'bg-green-500/10'
                              : verificationStatus.kyc.status === 'failed'
                              ? 'bg-red-500/10'
                              : 'bg-muted'
                          }`}>
                            <User className={`h-5 w-5 ${
                              verificationStatus.kyc.status === 'verified'
                                ? 'text-green-600'
                                : verificationStatus.kyc.status === 'failed'
                                ? 'text-red-600'
                                : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Identity Verification (KYC)</CardTitle>
                            <CardDescription>
                              Verify your identity with a government-issued ID
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant={verificationStatus.kyc.status === 'verified' ? 'default' : 'secondary'}
                          className={
                            verificationStatus.kyc.status === 'verified'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : verificationStatus.kyc.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : ''
                          }
                        >
                          {verificationStatus.kyc.status === 'verified' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {verificationStatus.kyc.status === 'failed' && <XCircle className="h-3 w-3 mr-1" />}
                          {verificationStatus.kyc.status === 'processing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {verificationStatus.kyc.status.charAt(0).toUpperCase() + verificationStatus.kyc.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {verificationStatus.kyc.verification ? (
                        <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Verified Name</p>
                              <p className="font-medium">
                                {verificationStatus.kyc.verification.firstName} {verificationStatus.kyc.verification.lastName}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Verified On</p>
                              <p className="font-medium">
                                {verificationStatus.kyc.verification.verifiedAt
                                  ? new Date(verificationStatus.kyc.verification.verifiedAt).toLocaleDateString()
                                  : '-'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Document Type</p>
                              <p className="font-medium capitalize">
                                {verificationStatus.kyc.verification.documentType?.replace('_', ' ') || '-'}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm text-muted-foreground">Expires</p>
                              <p className="font-medium">
                                {verificationStatus.kyc.verification.expiresAt
                                  ? new Date(verificationStatus.kyc.verification.expiresAt).toLocaleDateString()
                                  : 'No expiry'}
                              </p>
                            </div>
                          </div>
                          {verificationStatus.kyc.verification.status === 'failed' && (
                            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
                              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                Verification Failed
                              </p>
                              <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">
                                {verificationStatus.kyc.verification.failureMessage || 'Please try again or contact support.'}
                              </p>
                              <Button variant="outline" className="mt-3" asChild>
                                <Link href="/verification/kyc">Retry Verification</Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed">
                          <div>
                            <p className="font-medium">Identity verification required</p>
                            <p className="text-sm text-muted-foreground">
                              Complete identity verification to access all platform features
                            </p>
                          </div>
                          <Button asChild>
                            <Link href="/verification/kyc">
                              Start Verification
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* WWCC Verification */}
                {verificationStatus?.wwcc.required && (
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-3 ${
                            verificationStatus.wwcc.status === 'verified'
                              ? 'bg-green-500/10'
                              : verificationStatus.wwcc.status === 'failed' || verificationStatus.wwcc.status === 'revoked'
                              ? 'bg-red-500/10'
                              : verificationStatus.wwcc.status === 'expired'
                              ? 'bg-amber-500/10'
                              : 'bg-muted'
                          }`}>
                            <ShieldCheck className={`h-5 w-5 ${
                              verificationStatus.wwcc.status === 'verified'
                                ? 'text-green-600'
                                : verificationStatus.wwcc.status === 'failed' || verificationStatus.wwcc.status === 'revoked'
                                ? 'text-red-600'
                                : verificationStatus.wwcc.status === 'expired'
                                ? 'text-amber-600'
                                : 'text-muted-foreground'
                            }`} />
                          </div>
                          <div>
                            <CardTitle className="text-lg">Working With Children Check</CardTitle>
                            <CardDescription>
                              Required for tutors and teachers working with minors
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          className={
                            verificationStatus.wwcc.status === 'verified'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : verificationStatus.wwcc.status === 'failed' || verificationStatus.wwcc.status === 'revoked'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : verificationStatus.wwcc.status === 'expired'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : ''
                          }
                        >
                          {verificationStatus.wwcc.status === 'verified' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {(verificationStatus.wwcc.status === 'failed' || verificationStatus.wwcc.status === 'revoked') && <XCircle className="h-3 w-3 mr-1" />}
                          {verificationStatus.wwcc.status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                          {verificationStatus.wwcc.status === 'checking' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                          {verificationStatus.wwcc.status.charAt(0).toUpperCase() + verificationStatus.wwcc.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {verificationStatus.wwcc.verifications.length > 0 ? (
                        <div className="space-y-4">
                          {verificationStatus.wwcc.verifications.map((wwcc: WWCCVerification) => (
                            <div key={wwcc.id} className="p-4 rounded-lg border">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{wwcc.state}</Badge>
                                  <span className="text-sm text-muted-foreground">
                                    {wwcc.wwccNumber}
                                  </span>
                                </div>
                                <Badge
                                  className={
                                    wwcc.status === 'verified'
                                      ? 'bg-green-100 text-green-700'
                                      : wwcc.status === 'expired'
                                      ? 'bg-amber-100 text-amber-700'
                                      : ''
                                  }
                                >
                                  {wwcc.status}
                                </Badge>
                              </div>
                              <div className="grid gap-4 md:grid-cols-3">
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Card Holder</p>
                                  <p className="font-medium">{wwcc.firstName} {wwcc.lastName}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Last Checked</p>
                                  <p className="font-medium">
                                    {wwcc.registryLastChecked
                                      ? new Date(wwcc.registryLastChecked).toLocaleDateString()
                                      : '-'}
                                  </p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-sm text-muted-foreground">Expires</p>
                                  <p className={`font-medium ${
                                    wwcc.expiresAt && new Date(wwcc.expiresAt) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
                                      ? 'text-amber-600'
                                      : ''
                                  }`}>
                                    {wwcc.expiresAt
                                      ? new Date(wwcc.expiresAt).toLocaleDateString()
                                      : '-'}
                                  </p>
                                </div>
                              </div>
                              {wwcc.monitoringEnabled && (
                                <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                                  <RefreshCw className="h-4 w-4" />
                                  Automatic monitoring enabled
                                </div>
                              )}
                            </div>
                          ))}
                          <Button variant="outline" asChild>
                            <Link href="/verification/wwcc">
                              Manage WWCC Verifications
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed">
                          <div>
                            <p className="font-medium">WWCC verification required</p>
                            <p className="text-sm text-muted-foreground">
                              Submit your Working With Children Check details to work with students
                            </p>
                          </div>
                          <Button asChild>
                            <Link href="/verification/wwcc">
                              Add WWCC
                              <ChevronRight className="ml-2 h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* No Verification Required */}
                {!verificationStatus?.kyc.required && !verificationStatus?.wwcc.required && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="rounded-full bg-muted p-4 mb-4">
                        <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                      </div>
                      <h3 className="font-medium text-lg">No Verification Required</h3>
                      <p className="text-muted-foreground mt-1">
                        Based on your account type, no additional verification is needed at this time.
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Help Section */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Need Help?</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <a
                        href="https://support.scholarly.app/verification"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <FileText className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Verification Guide</p>
                          <p className="text-sm text-muted-foreground">Learn about our verification process</p>
                        </div>
                        <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
                      </a>
                      <a
                        href="mailto:support@scholarly.app"
                        className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <Mail className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Contact Support</p>
                          <p className="text-sm text-muted-foreground">Get help with verification issues</p>
                        </div>
                        <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services">
          <div className="space-y-6">
            {/* Web Hosting Service */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-gradient-to-br from-blue-500/10 to-purple-500/10 p-3">
                      <Globe className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle>Scholarly Web Hosting</CardTitle>
                      <CardDescription>Create your professional web presence</CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                    Optional
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-muted-foreground">
                  Launch your own professional website for your school, tutoring business, or educational service.
                  Get discovered by parents and students through AI-powered search.
                </p>

                {/* Provider Types */}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="rounded-lg bg-green-500/10 p-2">
                      <Building2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Schools & Micro-Schools</p>
                      <p className="text-xs text-muted-foreground">Full school websites with enrollment</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="rounded-lg bg-amber-500/10 p-2">
                      <Briefcase className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Tutoring Centres</p>
                      <p className="text-xs text-muted-foreground">Showcase services & book sessions</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="rounded-lg bg-purple-500/10 p-2">
                      <GraduationCap className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Solo Tutors</p>
                      <p className="text-xs text-muted-foreground">Personal brand & availability</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="rounded-lg bg-rose-500/10 p-2">
                      <Home className="h-4 w-4 text-rose-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Homeschool Co-ops</p>
                      <p className="text-xs text-muted-foreground">Community hubs & resources</p>
                    </div>
                  </div>
                </div>

                {/* Features */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    What&apos;s Included
                  </h4>
                  <div className="grid gap-2 md:grid-cols-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Free subdomain (yourname.scholar.ly)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Custom domain support</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>AI-powered discovery</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Enquiry & tour booking</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Reviews & testimonials</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Quality verification badges</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>SEO & structured data</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Analytics dashboard</span>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <div className="flex items-center justify-between p-4 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
                  <div>
                    <p className="font-medium">Ready to create your web presence?</p>
                    <p className="text-sm text-muted-foreground">
                      Set up takes less than 5 minutes
                    </p>
                  </div>
                  <Button asChild className="gap-2">
                    <Link href="/hosting/setup">
                      <Plus className="h-4 w-4" />
                      Enable Web Hosting
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Other Services Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">More Services</CardTitle>
                <CardDescription>Additional features available for your account</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-3">
                        <BookOpen className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Content Marketplace</p>
                        <p className="text-sm text-muted-foreground">
                          Sell curriculum and learning resources
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-3">
                        <Users className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">Relief Teacher Network</p>
                        <p className="text-sm text-muted-foreground">
                          Connect with qualified relief teachers
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">Coming Soon</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
