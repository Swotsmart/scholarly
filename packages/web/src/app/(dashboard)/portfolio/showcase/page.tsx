'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Palette,
  Layout,
  Eye,
  Users,
  Clock,
  TrendingUp,
  MessageSquare,
  Globe,
  ExternalLink,
  Copy,
  Settings,
  Edit,
  FileText,
  Image,
  Video,
  Code,
  Presentation,
  Mail,
  Linkedin,
  Twitter,
  GraduationCap,
  Star,
  Sparkles,
  Send,
  ThumbsUp,
  Calendar,
  BarChart3,
  Layers,
  User,
  Briefcase,
  Award,
  MapPin,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Theme options
const themeOptions = [
  { id: 'modern', name: 'Modern', primaryColor: '#6366f1', bgColor: '#f8fafc' },
  { id: 'classic', name: 'Classic', primaryColor: '#1e40af', bgColor: '#ffffff' },
  { id: 'creative', name: 'Creative', primaryColor: '#ec4899', bgColor: '#fdf2f8' },
  { id: 'minimal', name: 'Minimal', primaryColor: '#171717', bgColor: '#fafafa' },
  { id: 'nature', name: 'Nature', primaryColor: '#059669', bgColor: '#ecfdf5' },
];

// Layout options
const layoutOptions = [
  { id: 'grid', name: 'Grid', description: 'Work displayed in a grid layout' },
  { id: 'masonry', name: 'Masonry', description: 'Pinterest-style layout' },
  { id: 'timeline', name: 'Timeline', description: 'Chronological display' },
  { id: 'cards', name: 'Cards', description: 'Large card layout' },
];

// Mock showcase data
const showcaseData = {
  id: 'showcase-1',
  title: 'Alex Johnson - Digital Portfolio',
  headline: 'Passionate learner exploring STEM, creative writing, and design thinking',
  customSlug: 'alex-johnson-2024',
  status: 'published',
  theme: 'modern',
  layout: 'grid',
  isPublic: true,

  // About section
  about: {
    name: 'Alex Johnson',
    bio: 'High school junior with a passion for environmental science, creative writing, and technology. Currently exploring the intersection of data science and sustainability.',
    location: 'San Francisco, CA',
    school: 'Bay Area STEM Academy',
    grade: 'Grade 11',
    interests: ['Environmental Science', 'Data Visualization', 'Creative Writing', 'Design Thinking'],
    socialLinks: {
      email: 'alex@example.com',
      linkedin: 'alex-johnson',
      twitter: 'alexj_stem',
    },
  },

  // Work/Portfolio items
  work: [
    {
      id: 'art-1',
      title: 'Climate Change Research Paper',
      type: 'document',
      description: 'Comprehensive analysis of climate impacts on coastal ecosystems',
      featured: true,
      views: 45,
    },
    {
      id: 'art-2',
      title: 'Geometric Art Composition',
      type: 'image',
      description: 'Digital artwork combining math and artistic expression',
      featured: true,
      views: 32,
    },
    {
      id: 'art-3',
      title: 'Physics Experiment Demo',
      type: 'video',
      description: 'Pendulum wave experiment demonstration',
      featured: false,
      views: 28,
    },
    {
      id: 'art-4',
      title: 'Data Visualization Dashboard',
      type: 'code',
      description: 'Interactive climate data dashboard',
      featured: true,
      views: 56,
    },
  ],

  // Skills
  skills: [
    { name: 'Research & Analysis', level: 85, endorsements: 12 },
    { name: 'Data Visualization', level: 78, endorsements: 8 },
    { name: 'Creative Writing', level: 90, endorsements: 15 },
    { name: 'Public Speaking', level: 72, endorsements: 6 },
    { name: 'Design Thinking', level: 80, endorsements: 10 },
    { name: 'Python Programming', level: 65, endorsements: 5 },
  ],

  // Analytics
  analytics: {
    totalViews: 247,
    uniqueVisitors: 89,
    avgEngagementTime: '3m 42s',
    viewsThisWeek: 47,
    viewsChange: 12,
    topReferrer: 'LinkedIn',
    peakDay: 'Tuesday',
  },

  // Guestbook
  guestbook: [
    {
      id: 'guest-1',
      name: 'Ms. Thompson',
      role: 'Science Teacher',
      message: 'Incredible work on the climate research paper! Your data analysis skills are impressive.',
      date: 'Feb 12, 2024',
      verified: true,
    },
    {
      id: 'guest-2',
      name: 'Sarah M.',
      role: 'Peer',
      message: 'Love the art composition! The combination of math and art is so creative.',
      date: 'Feb 10, 2024',
      verified: false,
    },
    {
      id: 'guest-3',
      name: 'University Recruiter',
      role: 'Admissions',
      message: 'Very impressive portfolio. Would love to connect about our STEM program.',
      date: 'Feb 8, 2024',
      verified: true,
    },
  ],
};

// Type icons
const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  image: Image,
  video: Video,
  code: Code,
  presentation: Presentation,
};

const typeColor: Record<string, string> = {
  document: 'blue',
  image: 'pink',
  video: 'red',
  code: 'emerald',
  presentation: 'amber',
};

export default function ShowcasePage() {
  const [activeTab, setActiveTab] = useState('preview');
  const [selectedTheme, setSelectedTheme] = useState(showcaseData.theme);
  const [selectedLayout, setSelectedLayout] = useState(showcaseData.layout);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newGuestbookEntry, setNewGuestbookEntry] = useState('');

  const currentTheme = themeOptions.find((t) => t.id === selectedTheme) || themeOptions[0];

  const copyShareLink = () => {
    navigator.clipboard.writeText(`https://portfolio.scholarly.ai/u/${showcaseData.customSlug}`);
    toast({
      title: 'Link copied!',
      description: 'Showcase link has been copied to clipboard.',
    });
  };

  const submitGuestbookEntry = () => {
    if (newGuestbookEntry.trim()) {
      toast({
        title: 'Message submitted!',
        description: 'Your encouragement has been added to the guestbook.',
      });
      setNewGuestbookEntry('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portfolio">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="heading-2">Public Showcase</h1>
              <Badge variant="success" className="gap-1">
                <Globe className="h-3 w-3" />
                Published
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Customize and manage your public portfolio showcase
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyShareLink}>
            <Copy className="mr-2 h-4 w-4" />
            Copy Link
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://portfolio.scholarly.ai/u/${showcaseData.customSlug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Live
            </a>
          </Button>
          <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Showcase Settings</DialogTitle>
                <DialogDescription>
                  Customize your public portfolio appearance and SEO settings.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Theme Selection */}
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {themeOptions.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          selectedTheme === theme.id
                            ? 'border-primary'
                            : 'border-transparent hover:border-muted'
                        }`}
                      >
                        <div
                          className="h-8 rounded mb-1"
                          style={{ backgroundColor: theme.primaryColor }}
                        />
                        <p className="text-xs text-center">{theme.name}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Selection */}
                <div className="space-y-2">
                  <Label>Layout</Label>
                  <Select value={selectedLayout} onValueChange={setSelectedLayout}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {layoutOptions.map((layout) => (
                        <SelectItem key={layout.id} value={layout.id}>
                          <div>
                            <p className="font-medium">{layout.name}</p>
                            <p className="text-xs text-muted-foreground">{layout.description}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom URL */}
                <div className="space-y-2">
                  <Label>Custom URL</Label>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm text-muted-foreground">portfolio.scholarly.ai/u/</span>
                    <Input defaultValue={showcaseData.customSlug} className="flex-1" />
                  </div>
                </div>

                {/* SEO Settings */}
                <div className="space-y-2">
                  <Label>SEO Title</Label>
                  <Input defaultValue={showcaseData.title} />
                </div>
                <div className="space-y-2">
                  <Label>SEO Description</Label>
                  <Textarea defaultValue={showcaseData.headline} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => {
                  setIsSettingsOpen(false);
                  toast({ title: 'Settings saved!', description: 'Your showcase has been updated.' });
                }}>
                  Save Changes
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Eye className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{showcaseData.analytics.totalViews}</p>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-emerald-500/10 p-3">
              <Users className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{showcaseData.analytics.uniqueVisitors}</p>
              <p className="text-sm text-muted-foreground">Unique Visitors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-violet-500/10 p-3">
              <Clock className="h-6 w-6 text-violet-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{showcaseData.analytics.avgEngagementTime}</p>
              <p className="text-sm text-muted-foreground">Avg. Engagement</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <TrendingUp className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <p className="text-2xl font-bold">{showcaseData.analytics.viewsThisWeek}</p>
                <Badge variant="success" className="text-xs">+{showcaseData.analytics.viewsChange}%</Badge>
              </div>
              <p className="text-sm text-muted-foreground">This Week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="work">Work</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
          <TabsTrigger value="guestbook">Guestbook</TabsTrigger>
        </TabsList>

        {/* Preview Tab */}
        <TabsContent value="preview" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Live Preview</CardTitle>
                  <CardDescription>See how your showcase looks to visitors</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="gap-1"
                    style={{ borderColor: currentTheme.primaryColor, color: currentTheme.primaryColor }}
                  >
                    <Palette className="h-3 w-3" />
                    {currentTheme.name}
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <Layout className="h-3 w-3" />
                    {layoutOptions.find((l) => l.id === selectedLayout)?.name}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Preview Container */}
              <div
                className="rounded-lg border overflow-hidden"
                style={{ backgroundColor: currentTheme.bgColor }}
              >
                {/* Header Preview */}
                <div
                  className="p-8 text-center text-white"
                  style={{ backgroundColor: currentTheme.primaryColor }}
                >
                  <div className="h-20 w-20 rounded-full bg-white/20 mx-auto mb-4 flex items-center justify-center">
                    <User className="h-10 w-10 text-white/80" />
                  </div>
                  <h2 className="text-2xl font-bold">{showcaseData.about.name}</h2>
                  <p className="text-white/80 mt-1">{showcaseData.headline}</p>
                  <div className="flex items-center justify-center gap-4 mt-4">
                    <Badge className="bg-white/20 text-white border-0">
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {showcaseData.about.grade}
                    </Badge>
                    <Badge className="bg-white/20 text-white border-0">
                      <MapPin className="h-3 w-3 mr-1" />
                      {showcaseData.about.location}
                    </Badge>
                  </div>
                </div>

                {/* Work Preview */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Featured Work</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {showcaseData.work.filter((w) => w.featured).slice(0, 3).map((item) => {
                      const Icon = typeIcon[item.type] || FileText;
                      const color = typeColor[item.type] || 'blue';
                      return (
                        <div key={item.id} className="p-4 rounded-lg border bg-white">
                          <div className={`rounded-lg bg-${color}-500/10 p-2 w-fit mb-3`}>
                            <Icon className={`h-5 w-5 text-${color}-500`} />
                          </div>
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">About Section</CardTitle>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Name</Label>
                    <p className="font-medium">{showcaseData.about.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Bio</Label>
                    <p className="text-sm">{showcaseData.about.bio}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">School</Label>
                    <p className="font-medium">{showcaseData.about.school}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-muted-foreground text-xs">Interests</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {showcaseData.about.interests.map((interest) => (
                        <Badge key={interest} variant="secondary">{interest}</Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-xs">Contact</Label>
                    <div className="flex gap-2 mt-1">
                      <Button variant="outline" size="sm">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Linkedin className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Twitter className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Work Tab */}
        <TabsContent value="work" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Portfolio Items</CardTitle>
                <Button variant="outline" size="sm">
                  <Layers className="mr-2 h-4 w-4" />
                  Manage Order
                </Button>
              </div>
              <CardDescription>Select which artifacts to display in your showcase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {showcaseData.work.map((item) => {
                  const Icon = typeIcon[item.type] || FileText;
                  const color = typeColor[item.type] || 'blue';
                  return (
                    <div key={item.id} className="flex items-center gap-4 p-4 rounded-lg border">
                      <div className={`rounded-lg bg-${color}-500/10 p-2`}>
                        <Icon className={`h-5 w-5 text-${color}-500`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          {item.featured && (
                            <Badge variant="default" className="text-xs">Featured</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        {item.views}
                      </div>
                      <Button variant="ghost" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skills Tab */}
        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Skills & Competencies</CardTitle>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Skills
                </Button>
              </div>
              <CardDescription>Showcase your skills and endorsements from teachers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {showcaseData.skills.map((skill) => (
                  <div key={skill.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{skill.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {skill.endorsements}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{skill.level}%</span>
                    </div>
                    <Progress value={skill.level} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Guestbook Tab */}
        <TabsContent value="guestbook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Guestbook
              </CardTitle>
              <CardDescription>
                Visitor comments and encouragement ({showcaseData.guestbook.length} entries)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Guestbook Entries */}
              {showcaseData.guestbook.map((entry) => (
                <div key={entry.id} className="p-4 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{entry.name}</span>
                        {entry.verified && (
                          <Badge variant="default" className="text-xs">Verified</Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">{entry.role}</Badge>
                        <span className="text-xs text-muted-foreground">{entry.date}</span>
                      </div>
                      <p className="text-sm mt-2">{entry.message}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Entry */}
              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="mb-2 block">Leave encouragement</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write a message of encouragement..."
                    value={newGuestbookEntry}
                    onChange={(e) => setNewGuestbookEntry(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={submitGuestbookEntry} className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Engagement Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{showcaseData.analytics.topReferrer}</p>
                  <p className="text-xs text-muted-foreground">Top Referrer</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{showcaseData.analytics.peakDay}</p>
                  <p className="text-xs text-muted-foreground">Peak Day</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{showcaseData.analytics.avgEngagementTime}</p>
                  <p className="text-xs text-muted-foreground">Avg. Time on Page</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
