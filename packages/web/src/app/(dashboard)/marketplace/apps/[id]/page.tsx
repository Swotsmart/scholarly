'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Star,
  Download,
  ArrowLeft,
  CheckCircle2,
  Shield,
  Calendar,
  Users,
  GraduationCap,
  BookOpen,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  FileText,
  BarChart3,
  Eye,
  Lock,
} from 'lucide-react';

interface AppDetail {
  id: string;
  name: string;
  developer: string;
  developerVerified: boolean;
  description: string;
  fullDescription: string;
  rating: number;
  reviewCount: number;
  installs: number;
  pricing: string;
  priceAmount: string | null;
  color: string;
  letter: string;
  category: string;
  version: string;
  lastUpdated: string;
  size: string;
  features: string[];
  educationLevels: string[];
  platforms: { name: string; icon: string }[];
}

const APPS_DB: Record<string, AppDetail> = {
  'vocabmaster-pro': {
    id: 'vocabmaster-pro',
    name: 'VocabMaster Pro',
    developer: 'LangTech Solutions',
    developerVerified: true,
    description: 'AI-powered vocabulary acquisition with spaced repetition and Australian English dialect support.',
    fullDescription: `VocabMaster Pro is a comprehensive vocabulary learning platform designed specifically for Australian schools. Built on cutting-edge spaced repetition algorithms and natural language processing, it adapts to each student's learning pace and retention patterns.

The platform supports the Australian Curriculum English strand from Years 3 through 12, with content mapped to achievement standards and general capabilities. Students engage with contextual vocabulary through reading passages sourced from Australian literature, news articles, and academic texts.

Teachers receive detailed analytics on class-wide vocabulary growth, individual student progress, and areas requiring additional support. The built-in assessment tools generate NAPLAN-aligned vocabulary tasks that can be used for formative and summative assessment purposes.

Key pedagogical features include morphological analysis tools, etymology exploration, contextual sentence generation, and collaborative vocabulary challenges that encourage peer learning and healthy competition.`,
    rating: 4.8,
    reviewCount: 342,
    installs: 5420,
    pricing: 'Premium',
    priceAmount: '$4.99/mo',
    color: 'bg-blue-500',
    letter: 'V',
    category: 'Language Learning',
    version: '3.2.1',
    lastUpdated: '15 Jan 2026',
    size: '24 MB',
    features: [
      'AI-powered spaced repetition engine',
      'Australian Curriculum alignment (Years 3-12)',
      'Contextual vocabulary from Australian literature',
      'NAPLAN-aligned assessment generation',
      'Morphological analysis and etymology tools',
      'Class-wide analytics dashboard',
      'Collaborative vocabulary challenges',
      'Offline mode for rural and remote schools',
    ],
    educationLevels: ['Years 3-4', 'Years 5-6', 'Years 7-8', 'Years 9-10', 'Years 11-12'],
    platforms: [
      { name: 'Web Browser', icon: 'globe' },
      { name: 'iOS', icon: 'smartphone' },
      { name: 'Android', icon: 'smartphone' },
      { name: 'Chromebook', icon: 'monitor' },
    ],
  },
  'chemlab-vr': {
    id: 'chemlab-vr',
    name: 'ChemLab VR',
    developer: 'Immersive Edu Labs',
    developerVerified: true,
    description: 'Virtual reality chemistry laboratory aligned with the Australian Curriculum.',
    fullDescription: `ChemLab VR brings the chemistry laboratory to life through immersive virtual reality experiences. Students can conduct experiments that would be too dangerous, expensive, or impractical in a traditional school laboratory setting.

The platform covers the Australian Curriculum Science chemical sciences strand from Years 7 through 12, including organic chemistry, electrochemistry, and thermodynamics modules. Each experiment includes safety briefings, procedure guides, and post-lab analysis tools.

Teachers can monitor student progress in real-time, view experiment recordings, and access pre-built lesson plans with curriculum-aligned learning objectives. The platform also supports collaborative experiments where multiple students work together in shared virtual lab spaces.`,
    rating: 4.9,
    reviewCount: 189,
    installs: 3187,
    pricing: 'Premium',
    priceAmount: '$9.99/mo',
    color: 'bg-emerald-500',
    letter: 'C',
    category: 'VR/AR',
    version: '2.1.0',
    lastUpdated: '8 Jan 2026',
    size: '156 MB',
    features: [
      'Photo-realistic VR chemistry experiments',
      'Australian Curriculum Science alignment',
      'Real-time teacher monitoring',
      'Collaborative virtual lab spaces',
      'Built-in safety training modules',
      'Post-experiment analysis tools',
    ],
    educationLevels: ['Years 7-8', 'Years 9-10', 'Years 11-12'],
    platforms: [
      { name: 'Meta Quest', icon: 'monitor' },
      { name: 'Web Browser (3D)', icon: 'globe' },
      { name: 'iPad', icon: 'tablet' },
    ],
  },
};

const DEFAULT_APP: AppDetail = APPS_DB['vocabmaster-pro'];

const MOCK_REVIEWS = [
  {
    id: 'r1',
    author: 'Sarah Mitchell',
    role: 'Year 8 English Teacher',
    school: 'Westfield Grammar, Melbourne',
    rating: 5,
    date: '12 Jan 2026',
    text: 'Absolutely brilliant for building vocabulary across the curriculum. My students are genuinely excited about learning new words, and the spaced repetition has made a noticeable difference in retention. The Australian content is a massive plus.',
  },
  {
    id: 'r2',
    author: 'David Chen',
    role: 'Head of Languages',
    school: 'Brisbane State High',
    rating: 5,
    date: '3 Jan 2026',
    text: 'We rolled this out across our entire languages faculty and the results have been outstanding. The analytics dashboard gives us precise data on where students are struggling. Worth every cent of the subscription.',
  },
  {
    id: 'r3',
    author: 'Emma Kowalski',
    role: 'Year 5 Teacher',
    school: 'Banksia Primary, Perth',
    rating: 4,
    date: '28 Dec 2025',
    text: 'Great tool for primary-level vocabulary building. The only reason for 4 stars instead of 5 is that some of the morphology features are a bit advanced for my Year 5 students. Would love to see more scaffolding for younger learners.',
  },
  {
    id: 'r4',
    author: 'James Nguyen',
    role: 'Learning Support Coordinator',
    school: 'Sydney Academy',
    rating: 4,
    date: '15 Dec 2025',
    text: 'The adaptive difficulty is excellent for students with additional learning needs. The offline mode is a game-changer for our students in remote communities. Accessibility features are well thought out and genuinely inclusive.',
  },
];

const RATING_BREAKDOWN = [
  { stars: 5, count: 218, percentage: 64 },
  { stars: 4, count: 89, percentage: 26 },
  { stars: 3, count: 24, percentage: 7 },
  { stars: 2, count: 8, percentage: 2 },
  { stars: 1, count: 3, percentage: 1 },
];

const CHANGELOG = [
  {
    version: '3.2.1',
    date: '15 Jan 2026',
    changes: [
      'Fixed audio playback issue on Chromebook devices',
      'Improved spaced repetition algorithm accuracy by 12%',
      'Added 450 new vocabulary items for Years 11-12',
    ],
  },
  {
    version: '3.2.0',
    date: '2 Jan 2026',
    changes: [
      'New collaborative vocabulary challenges feature',
      'Added NAPLAN 2026 question format templates',
      'Performance improvements for offline mode',
      'Updated Australian Curriculum v9.0 alignment mappings',
    ],
  },
  {
    version: '3.1.0',
    date: '15 Nov 2025',
    changes: [
      'Introduced morphological analysis tool',
      'Added etymology exploration for 2,000+ root words',
      'New class-wide analytics dashboard for teachers',
      'Support for multiple class groups per teacher account',
    ],
  },
  {
    version: '3.0.0',
    date: '1 Oct 2025',
    changes: [
      'Major platform redesign with improved accessibility',
      'AI-powered contextual sentence generation',
      'New student progress tracking and goal setting',
      'Integration with Scholarly digital portfolio system',
      'Added offline mode for rural and remote schools',
    ],
  },
];

const PERMISSIONS = [
  { name: 'Student Profiles', description: 'Read student name, year level, and learning preferences', icon: Users, level: 'Read' },
  { name: 'Assessment Data', description: 'Write vocabulary assessment scores and progress data', icon: BarChart3, level: 'Read/Write' },
  { name: 'Grade Book', description: 'Submit vocabulary scores to the institutional grade book', icon: GraduationCap, level: 'Write' },
  { name: 'Calendar', description: 'Create vocabulary challenge reminders and due dates', icon: Calendar, level: 'Write' },
  { name: 'Learning Analytics', description: 'Share engagement metrics with institutional analytics', icon: Eye, level: 'Read/Write' },
  { name: 'Content Library', description: 'Access shared reading passages and vocabulary lists', icon: BookOpen, level: 'Read' },
];

const platformIcons: Record<string, React.ElementType> = {
  globe: Globe,
  smartphone: Smartphone,
  monitor: Monitor,
  tablet: Tablet,
};

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-3.5 w-3.5';
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i < Math.floor(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : i < rating
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

export default function AppDetailPage() {
  const params = useParams();
  const appId = typeof params.id === 'string' ? params.id : 'vocabmaster-pro';
  const app = APPS_DB[appId] || DEFAULT_APP;
  const [activeTab, setActiveTab] = useState('overview');
  const [installed, setInstalled] = useState(false);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/marketplace/apps">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Apps
        </Link>
      </Button>

      {/* App Header */}
      <div className="flex flex-col md:flex-row md:items-start gap-6">
        <div className={`${app.color} h-24 w-24 rounded-2xl flex items-center justify-center text-white text-4xl font-bold shrink-0`}>
          {app.letter}
        </div>
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="heading-2">{app.name}</h1>
              {app.developerVerified && (
                <CheckCircle2 className="h-5 w-5 text-blue-500" />
              )}
            </div>
            <p className="text-muted-foreground">{app.developer}</p>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <StarRating rating={app.rating} size="lg" />
              <span className="font-semibold text-lg">{app.rating}</span>
              <span className="text-sm text-muted-foreground">({app.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Download className="h-4 w-4" />
              {app.installs.toLocaleString()} installs
            </div>
            <Badge variant="outline">{app.category}</Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="lg"
              variant={installed ? 'outline' : 'default'}
              onClick={() => setInstalled(!installed)}
            >
              {installed ? 'Uninstall' : 'Install'}
            </Button>
            {app.priceAmount && (
              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-base px-3 py-1">
                {app.priceAmount}
              </Badge>
            )}
            {!app.priceAmount && (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-base px-3 py-1">
                Free
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* App Info Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Updated:</span>
          <span className="font-medium">{app.lastUpdated}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Version:</span>
          <span className="font-medium">{app.version}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Download className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Size:</span>
          <span className="font-medium">{app.size}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">Privacy:</span>
          <span className="font-medium">Verified</span>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="changelog">Changelog</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {app.fullDescription.split('\n\n').map((para, i) => (
                  <p key={i} className="text-sm text-muted-foreground mb-3 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Screenshots Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Screenshots</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {['bg-blue-500/20', 'bg-emerald-500/20', 'bg-purple-500/20', 'bg-amber-500/20'].map((bg, i) => (
                  <div
                    key={i}
                    className={`${bg} min-w-[280px] h-[180px] rounded-lg flex items-center justify-center border`}
                  >
                    <div className="text-center space-y-2">
                      <Monitor className="h-8 w-8 mx-auto text-muted-foreground/50" />
                      <p className="text-xs text-muted-foreground/50 font-medium">
                        {['Dashboard View', 'Student Interface', 'Analytics Panel', 'Assessment Builder'][i]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Features */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 md:grid-cols-2">
                {app.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Education Levels & Platforms */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Supported Education Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {app.educationLevels.map((level) => (
                    <Badge key={level} variant="secondary" className="text-sm">
                      <GraduationCap className="mr-1.5 h-3.5 w-3.5" />
                      {level}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Compatible Platforms</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {app.platforms.map((platform) => {
                    const PIcon = platformIcons[platform.icon] || Globe;
                    return (
                      <Badge key={platform.name} variant="outline" className="text-sm">
                        <PIcon className="mr-1.5 h-3.5 w-3.5" />
                        {platform.name}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews" className="space-y-6">
          {/* Rating Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="text-center space-y-2">
                  <p className="text-5xl font-bold">{app.rating}</p>
                  <StarRating rating={app.rating} size="lg" />
                  <p className="text-sm text-muted-foreground">{app.reviewCount} reviews</p>
                </div>
                <div className="flex-1 space-y-2">
                  {RATING_BREAKDOWN.map((item) => (
                    <div key={item.stars} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">{item.stars} star</span>
                      <Progress
                        value={item.percentage}
                        className="h-2 flex-1"
                      />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          <div className="space-y-4">
            {MOCK_REVIEWS.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{review.author}</p>
                      <p className="text-sm text-muted-foreground">
                        {review.role} &middot; {review.school}
                      </p>
                    </div>
                    <span className="text-sm text-muted-foreground">{review.date}</span>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-sm text-muted-foreground">{review.text}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Changelog */}
        <TabsContent value="changelog" className="space-y-4">
          {CHANGELOG.map((release) => (
            <Card key={release.version}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">
                      v{release.version}
                    </Badge>
                    {release.version === app.version && (
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Latest
                      </Badge>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">{release.date}</span>
                </div>
                <ul className="space-y-2">
                  {release.changes.map((change, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground mt-1.5 shrink-0">&#8226;</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Permissions */}
        <TabsContent value="permissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Required Permissions
              </CardTitle>
              <CardDescription>
                This app requires access to the following data and capabilities within your Scholarly instance.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {PERMISSIONS.map((perm) => {
                  const PIcon = perm.icon;
                  return (
                    <div
                      key={perm.name}
                      className="flex items-start gap-4 rounded-lg border p-4"
                    >
                      <div className="rounded-lg bg-muted p-2.5">
                        <PIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="font-medium">{perm.name}</p>
                          <Badge
                            variant="outline"
                            className={
                              perm.level === 'Read'
                                ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400'
                                : perm.level === 'Write'
                                ? 'border-amber-200 text-amber-700 dark:border-amber-800 dark:text-amber-400'
                                : 'border-blue-200 text-blue-700 dark:border-blue-800 dark:text-blue-400'
                            }
                          >
                            {perm.level}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{perm.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Privacy Verified</p>
                  <p className="text-sm text-muted-foreground">
                    This app has been reviewed by the Scholarly security team. Student data is encrypted in transit and at rest.
                    The developer complies with the Australian Privacy Principles (APPs) and the Privacy Act 1988.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
