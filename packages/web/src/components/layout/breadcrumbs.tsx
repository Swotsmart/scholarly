'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// ROUTE LABEL MAPPINGS
// ============================================================================

const segmentLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  teacher: 'Teaching',
  parent: 'Family',
  admin: 'Administration',
  learning: 'Learning',
  courses: 'Courses',
  progress: 'Progress',
  'golden-path': 'Golden Path',
  adaptation: 'Adaptation Engine',
  curiosity: 'Curiosity Map',
  optimizer: 'Path Optimizer',
  linguaflow: 'LinguaFlow',
  vocabulary: 'Vocabulary',
  grammar: 'Grammar',
  conversation: 'Conversation',
  'design-pitch': 'Design & Pitch',
  challenges: 'Challenges',
  journeys: 'Journeys',
  'pitch-decks': 'Pitch Decks',
  portfolio: 'Portfolio',
  artifacts: 'Artifacts',
  goals: 'Goals',
  showcase: 'Showcase',
  'ai-buddy': 'AI Buddy',
  'ai-studio': 'AI Studio',
  tutoring: 'Tutoring',
  search: 'Search',
  bookings: 'Bookings',
  sessions: 'Sessions',
  upcoming: 'Upcoming',
  history: 'History',
  availability: 'Availability',
  resources: 'Resources',
  materials: 'Materials',
  shared: 'Shared Library',
  earnings: 'Earnings',
  overview: 'Overview',
  payouts: 'Payouts',
  reviews: 'Reviews',
  profile: 'Profile',
  classes: 'Classes',
  students: 'Students',
  grading: 'Grading',
  pitches: 'Pitches',
  portfolios: 'Portfolios',
  gradebook: 'Gradebook',
  assessment: 'Assessment',
  library: 'Library',
  builder: 'Builder',
  scheduling: 'Scheduling',
  timetable: 'Timetable',
  relief: 'Relief Teaching',
  rooms: 'Rooms',
  capacity: 'Capacity',
  constraints: 'Constraints',
  'lesson-planner': 'Lesson Planner',
  standards: 'Standards',
  audits: 'Audits',
  ml: 'ML Pipeline',
  models: 'Models',
  predictions: 'Predictions',
  reports: 'Reports',
  children: 'My Children',
  messages: 'Messages',
  teachers: 'Teachers',
  tutors: 'Tutors',
  calendar: 'Calendar',
  payments: 'Payments',
  subscriptions: 'Subscriptions',
  attendance: 'Attendance',
  grades: 'Grades',
  achievements: 'Achievements',
  settings: 'Settings',
  'advanced-learning': 'Advanced Learning',
  eduscrum: 'EduScrum',
  pbl: 'Project-Based Learning',
  'work-experience': 'Work Experience',
  'video-coaching': 'Video Coaching',
  'peer-review': 'Peer Review',
  'pd-hub': 'PD Hub',
  industry: 'Industry',
  governance: 'Governance',
  proposals: 'Proposals',
  create: 'Create',
  tokens: 'Tokens',
  treasury: 'Treasury',
  delegates: 'Delegates',
  homeschool: 'Homeschool',
  'co-op': 'Co-op',
  curriculum: 'Curriculum',
  hosting: 'Hosting',
  setup: 'Setup',
  interoperability: 'Interoperability',
  lti: 'LTI',
  oneroster: 'OneRoster',
  case: 'CASE',
  badges: 'Badges',
  edfi: 'Ed-Fi',
  'micro-schools': 'Micro-Schools',
  marketplace: 'Marketplace',
  apps: 'Apps',
  community: 'Community',
  developer: 'Developer',
  ssi: 'SSI / Identity',
  credentials: 'Credentials',
  presentations: 'Presentations',
  wallet: 'Wallet',
  'data-lake': 'Data Lake',
  analytics: 'Analytics',
  demo: 'Demo',
  verification: 'Verification',
  kyc: 'KYC',
  wwcc: 'WWCC',
  'early-years': 'Little Explorers',
  enroll: 'Enroll',
  activity: 'Activity',
  phonics: 'Phonics',
  points: 'Explorer Points',
  session: 'Session',
  immersion: 'Immersion',
  exchange: 'Exchange',
  voice: 'Voice Practice',
};

// Segments that are route groups (Next.js convention) — skip these in breadcrumbs
const routeGroups = ['(dashboard)', '(auth)', '(early-years)'];

// ============================================================================
// BREADCRUMBS COMPONENT
// ============================================================================

export function Breadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();

  const crumbs = useMemo(() => {
    const segments = pathname
      .split('/')
      .filter(s => s && !routeGroups.includes(s));

    // Skip breadcrumbs for top-level pages
    if (segments.length <= 1) return [];

    return segments.map((segment, index) => {
      // Build the href for this crumb
      const href = '/' + segments.slice(0, index + 1).join('/');

      // Check if segment is a dynamic ID (UUID or numeric)
      const isDynamic = /^[0-9a-f-]{8,}$/.test(segment) || /^\d+$/.test(segment);

      // Resolve label
      const label = isDynamic
        ? 'Details'
        : segmentLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

      return { label, href, isLast: index === segments.length - 1 };
    });
  }, [pathname]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1 text-sm', className)}>
      <Link
        href="/dashboard"
        className="text-muted-foreground hover:text-foreground transition-colors"
        title="Dashboard"
      >
        <Home className="h-3.5 w-3.5" />
      </Link>

      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
