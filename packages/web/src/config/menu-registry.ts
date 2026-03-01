'use client';

// =============================================================================
// MENU REGISTRY
// =============================================================================
// The complete registry of all navigable tasks in the Scholarly platform,
// plus the anchor definitions for each role. This file is the executable
// form of the Task Taxonomy (Part 2 of the Self-Composing Interface spec).
//
// Every menu item that can appear in anyone's self-composing interface must
// be registered here. A task not in this registry cannot appear in a menu.
//
// The registry is intentionally static — it changes only when the platform
// adds or removes features, not at runtime. The composing menu store
// references tasks by their `ref` string, and the sidebar component looks
// up the full RegisteredTask from this registry when it needs to render.
// =============================================================================

import {
  LayoutDashboard, BookOpen, Calendar, Settings, GraduationCap,
  Sparkles, Target, Presentation, ClipboardCheck,
  School, FileText, TrendingUp, Languages, Bot,
  MessageSquare, Compass, Brain, Briefcase, Lightbulb,
  Users, Search, Clock, Mic,
  PenLine, ClipboardList,
  BookCheck, Library, PenTool, DoorOpen, Maximize,
  CreditCard, Eye, Kanban, FolderKanban, Building2,
  Trophy, FolderOpen, Crosshair, Rocket, Award,
  Network, Shield, Cpu,
  Building, Landmark, Store, BarChart3, Map,
  Swords, Coins, PenSquare, Palette, Workflow, Play,
  Home, Bell, HelpCircle, Fingerprint,
  Vote, Database,
} from 'lucide-react';

import type { RegisteredTask, RoleAnchors } from '@/types/composing-menu-types';

// =============================================================================
// TASK REGISTRY
// =============================================================================
// Organised by cluster, matching the taxonomy document.
// Each task has a unique ref (D1, T2, LF3, etc.) that the composing store
// uses as its primary identifier.
// =============================================================================

export const taskRegistry: Record<string, RegisteredTask> = {
  // ── CLUSTER 1: DAILY OPERATIONS ──
  D1: { ref: 'D1', name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, type: 'atomic', cluster: 'daily', description: 'Your daily overview' },
  'D1-teacher': { ref: 'D1-teacher', name: 'Dashboard', href: '/teacher/dashboard', icon: LayoutDashboard, type: 'atomic', cluster: 'daily', description: 'Teacher dashboard' },
  'D1-parent': { ref: 'D1-parent', name: 'Dashboard', href: '/parent/dashboard', icon: LayoutDashboard, type: 'atomic', cluster: 'daily', description: 'Family overview' },
  'D1-admin': { ref: 'D1-admin', name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, type: 'atomic', cluster: 'daily', description: 'Administration overview' },
  D2: { ref: 'D2', name: 'Attendance', href: '/teacher/attendance', icon: ClipboardList, type: 'atomic', cluster: 'daily', description: 'Mark the roll' },
  D3: { ref: 'D3', name: 'Messages', href: '/messages', icon: MessageSquare, type: 'atomic', cluster: 'daily', description: 'Read and respond to messages' },
  'D3-parent': { ref: 'D3-parent', name: 'Messages', href: '/parent/messages', icon: MessageSquare, type: 'compound', cluster: 'daily', description: 'Messages with teachers and tutors', children: [
    { name: 'Teachers', href: '/parent/messages/teachers', icon: School },
    { name: 'Tutors', href: '/parent/messages/tutors', icon: GraduationCap },
  ]},
  D4: { ref: 'D4', name: 'Timetable', href: '/teacher/scheduling/timetable', icon: Calendar, type: 'atomic', cluster: 'daily', description: "Today's schedule" },
  'D4-admin': { ref: 'D4-admin', name: 'Timetable', href: '/admin/scheduling/timetable', icon: Calendar, type: 'atomic', cluster: 'daily', description: 'School timetable' },
  D5: { ref: 'D5', name: 'Student Alerts', href: '/teacher/students/at-risk', icon: Users, type: 'atomic', cluster: 'daily', description: 'At-risk and wellbeing flags' },
  D6: { ref: 'D6', name: 'Continue Learning', href: '/learning/courses', icon: BookOpen, type: 'atomic', cluster: 'daily', description: 'Resume your courses' },
  D7: { ref: 'D7', name: 'Relief', href: '/admin/scheduling/relief', icon: Clock, type: 'atomic', cluster: 'daily', description: 'Manage substitute coverage' },

  // ── CLUSTER 2: TEACHING & CURRICULUM ──
  T1: { ref: 'T1', name: 'Lesson Planner', href: '/teacher/lesson-planner', icon: BookOpen, type: 'atomic', cluster: 'teaching', description: 'Plan and manage lessons' },
  T2: { ref: 'T2', name: 'Gradebook', href: '/teacher/gradebook', icon: BookCheck, type: 'atomic', cluster: 'teaching', description: 'Grades and feedback' },
  T3T4: { ref: 'T3T4', name: 'Assessment', href: '/teacher/assessment', icon: ClipboardCheck, type: 'compound', cluster: 'teaching', description: 'Build and browse assessments', children: [
    { name: 'Library', href: '/teacher/assessment/library', icon: Library },
    { name: 'Builder', href: '/teacher/assessment/builder', icon: PenTool },
  ]},
  T5: { ref: 'T5', name: 'Grading', href: '/teacher/grading', icon: FileText, type: 'compound', cluster: 'teaching', description: 'Grade submissions', children: [
    { name: 'Pitches', href: '/teacher/grading/pitches', icon: Presentation },
    { name: 'Portfolios', href: '/teacher/grading/portfolios', icon: FolderOpen },
  ]},
  T6: { ref: 'T6', name: 'Challenges', href: '/teacher/challenges', icon: Sparkles, type: 'atomic', cluster: 'teaching', description: 'Create learning challenges' },
  T7: { ref: 'T7', name: 'Standards', href: '/teacher/standards', icon: Shield, type: 'atomic', cluster: 'teaching', description: 'Curriculum alignment' },
  'T7-admin': { ref: 'T7-admin', name: 'Standards', href: '/admin/standards', icon: Shield, type: 'atomic', cluster: 'teaching', description: 'Institutional standards compliance' },
  T8: { ref: 'T8', name: 'Reports', href: '/teacher/reports', icon: BarChart3, type: 'atomic', cluster: 'teaching', description: 'Academic progress reports' },
  'T8-admin': { ref: 'T8-admin', name: 'Reports', href: '/admin/reports', icon: BarChart3, type: 'atomic', cluster: 'teaching', description: 'Institutional reports' },

  // ── CLUSTER 3: LEARNING & GROWTH ──
  L1: { ref: 'L1', name: 'Courses', href: '/learning/courses', icon: BookOpen, type: 'atomic', cluster: 'learning', description: 'Browse and enrol in courses' },
  L3: { ref: 'L3', name: 'AI Buddy', href: '/ai-buddy', icon: Bot, type: 'atomic', cluster: 'learning', description: 'Your personal learning assistant' },
  L4L5: { ref: 'L4L5', name: 'Golden Path', href: '/golden-path', icon: Compass, type: 'compound', cluster: 'learning', description: 'Adaptive learning pathway', children: [
    { name: 'Adaptation', href: '/golden-path/adaptation', icon: Brain },
    { name: 'Curiosity', href: '/golden-path/curiosity', icon: Sparkles },
    { name: 'Optimizer', href: '/golden-path/optimizer', icon: Target },
  ]},
  L6L7: { ref: 'L6L7', name: 'Design & Pitch', href: '/design-pitch', icon: Lightbulb, type: 'compound', cluster: 'learning', description: 'Design challenges and pitch decks', children: [
    { name: 'Challenges', href: '/design-pitch/challenges', icon: Sparkles },
    { name: 'Journeys', href: '/design-pitch/journeys', icon: Map },
    { name: 'Pitch Decks', href: '/design-pitch/pitch-decks', icon: Presentation },
  ]},
  L8: { ref: 'L8', name: 'Portfolio', href: '/portfolio', icon: Briefcase, type: 'compound', cluster: 'learning', description: 'Your work showcase', children: [
    { name: 'Artifacts', href: '/portfolio/artifacts', icon: FolderOpen },
    { name: 'Goals', href: '/portfolio/goals', icon: Crosshair },
    { name: 'Showcase', href: '/portfolio/showcase', icon: Eye },
  ]},
  L9: { ref: 'L9', name: 'Achievements', href: '/achievements', icon: Trophy, type: 'atomic', cluster: 'learning', description: 'Badges, XP, and milestones' },
  PROGRESS: { ref: 'PROGRESS', name: 'Progress', href: '/learning/progress', icon: TrendingUp, type: 'atomic', cluster: 'learning', description: 'Track your learning journey' },

  // ── CLUSTER 4: LANGUAGE LEARNING ──
  LF: { ref: 'LF', name: 'LinguaFlow', href: '/linguaflow', icon: Languages, type: 'compound', cluster: 'language', description: 'Language learning', children: [
    { name: 'Voice', href: '/linguaflow/voice', icon: Mic },
    { name: 'Vocabulary', href: '/linguaflow/vocabulary', icon: FileText },
    { name: 'Grammar', href: '/linguaflow/grammar', icon: GraduationCap },
    { name: 'Conversation', href: '/linguaflow/conversation', icon: MessageSquare },
  ]},

  // ── CLUSTER 5: FAMILY & PARENTING ──
  F1: { ref: 'F1', name: 'My Children', href: '/parent/children', icon: Users, type: 'atomic', cluster: 'family', description: 'View and manage children' },
  F1_PROGRESS: { ref: 'F1_PROGRESS', name: 'Progress', href: '/parent/progress', icon: TrendingUp, type: 'compound', cluster: 'family', description: 'Learning, grades, and attendance', children: [
    { name: 'Learning', href: '/parent/progress/learning', icon: BookOpen },
    { name: 'Grades', href: '/parent/progress/grades', icon: FileText },
    { name: 'Attendance', href: '/parent/progress/attendance', icon: ClipboardCheck },
  ]},
  F4: { ref: 'F4', name: 'Calendar', href: '/parent/calendar', icon: Calendar, type: 'atomic', cluster: 'family', description: 'Events and deadlines' },
  F5: { ref: 'F5', name: 'Find Tutors', href: '/parent/tutoring/search', icon: Search, type: 'atomic', cluster: 'family', description: 'Search and book tutors' },
  'F5-learner': { ref: 'F5-learner', name: 'Find Tutors', href: '/tutoring/search', icon: Search, type: 'atomic', cluster: 'family', description: 'Find a tutor' },
  F6: { ref: 'F6', name: 'Payments', href: '/parent/payments', icon: CreditCard, type: 'compound', cluster: 'family', description: 'Billing and subscriptions', children: [
    { name: 'History', href: '/parent/payments/history', icon: FileText },
    { name: 'Subscriptions', href: '/parent/payments/subscriptions', icon: Clock },
  ]},
  F7: { ref: 'F7', name: 'Portfolio', href: '/parent/portfolio', icon: Briefcase, type: 'atomic', cluster: 'family', description: 'Child work samples' },
  F8: { ref: 'F8', name: 'Little Explorers', href: '/early-years', icon: Sparkles, type: 'atomic', cluster: 'family', description: 'Early childhood (ages 3-6)' },

  // ── CLUSTER 6: HOMESCHOOL ──
  H1: { ref: 'H1', name: 'Curriculum Planner', href: '/homeschool/curriculum', icon: BookOpen, type: 'atomic', cluster: 'homeschool', description: 'Scope and sequence per child' },
  H2: { ref: 'H2', name: 'Compliance', href: '/homeschool/standards', icon: Shield, type: 'atomic', cluster: 'homeschool', description: 'Registration requirements' },
  H3: { ref: 'H3', name: 'Compliance Reports', href: '/homeschool/reports', icon: BarChart3, type: 'atomic', cluster: 'homeschool', description: 'State registration docs' },
  H4: { ref: 'H4', name: 'Resources', href: '/homeschool/resources', icon: FolderOpen, type: 'atomic', cluster: 'homeschool', description: 'Educational materials' },
  H5: { ref: 'H5', name: 'Children', href: '/homeschool/children', icon: Users, type: 'atomic', cluster: 'homeschool', description: 'Manage children' },
  H6: { ref: 'H6', name: 'Co-op', href: '/homeschool/co-op', icon: Users, type: 'atomic', cluster: 'homeschool', description: 'Homeschool communities' },

  // ── CLUSTER 7: TUTORING ──
  TU1: { ref: 'TU1', name: 'Availability', href: '/tutoring/availability', icon: Calendar, type: 'atomic', cluster: 'tutoring', description: 'Set tutoring hours' },
  TU2: { ref: 'TU2', name: 'Sessions', href: '/tutoring/sessions', icon: Calendar, type: 'compound', cluster: 'tutoring', description: 'Manage sessions', children: [
    { name: 'Upcoming', href: '/tutoring/sessions/upcoming', icon: Clock },
    { name: 'History', href: '/tutoring/sessions/history', icon: FileText },
  ]},
  TU5: { ref: 'TU5', name: 'My Students', href: '/tutoring/students', icon: Users, type: 'atomic', cluster: 'tutoring', description: 'Student profiles and progress' },
  TU6: { ref: 'TU6', name: 'Resources', href: '/tutoring/resources/materials', icon: FolderOpen, type: 'compound', cluster: 'tutoring', description: 'Teaching materials', children: [
    { name: 'Materials', href: '/tutoring/resources/materials', icon: FolderOpen },
    { name: 'Shared', href: '/tutoring/resources/shared', icon: Library },
  ]},
  TU7: { ref: 'TU7', name: 'Earnings', href: '/tutoring/earnings/overview', icon: BarChart3, type: 'compound', cluster: 'tutoring', description: 'Revenue and payouts', children: [
    { name: 'Overview', href: '/tutoring/earnings/overview', icon: BarChart3 },
    { name: 'Payouts', href: '/tutoring/earnings/payouts', icon: CreditCard },
  ]},
  TU8: { ref: 'TU8', name: 'Profile & Reviews', href: '/tutoring/profile', icon: Award, type: 'compound', cluster: 'tutoring', description: 'Your public profile', children: [
    { name: 'Profile', href: '/tutoring/profile', icon: Briefcase },
    { name: 'Reviews', href: '/tutoring/reviews', icon: Award },
  ]},

  // ── CLUSTER 8: ADMINISTRATION ──
  A1: { ref: 'A1', name: 'Users', href: '/admin/users', icon: Users, type: 'atomic', cluster: 'admin', description: 'Manage user accounts' },
  A3: { ref: 'A3', name: 'Scheduling Config', href: '/admin/scheduling/constraints', icon: Settings, type: 'compound', cluster: 'admin', description: 'Scheduling rules and rooms', children: [
    { name: 'Constraints', href: '/admin/scheduling/constraints', icon: Settings },
    { name: 'Rooms', href: '/admin/scheduling/rooms', icon: DoorOpen },
  ]},
  A4: { ref: 'A4', name: 'Interoperability', href: '/admin/interoperability', icon: Network, type: 'compound', cluster: 'admin', description: 'LTI, OneRoster, Ed-Fi', children: [
    { name: 'LTI', href: '/admin/interoperability/lti', icon: Network },
    { name: 'OneRoster', href: '/admin/interoperability/oneroster', icon: Users },
    { name: 'Ed-Fi', href: '/admin/interoperability/edfi', icon: Database },
  ]},
  A6: { ref: 'A6', name: 'Payments & Billing', href: '/admin/payments', icon: CreditCard, type: 'atomic', cluster: 'admin', description: 'Institutional billing' },
  A7: { ref: 'A7', name: 'Marketplace Admin', href: '/admin/marketplace', icon: Store, type: 'atomic', cluster: 'admin', description: 'Approve marketplace submissions' },
  A8: { ref: 'A8', name: 'Micro-Schools', href: '/admin/micro-schools', icon: Building, type: 'atomic', cluster: 'admin', description: 'Manage micro-school tenants' },
  A9: { ref: 'A9', name: 'Governance', href: '/admin/governance', icon: Landmark, type: 'atomic', cluster: 'admin', description: 'DAO governance and treasury' },
  A10: { ref: 'A10', name: 'ML Pipeline', href: '/admin/ml', icon: Cpu, type: 'atomic', cluster: 'admin', description: 'Predictive models and AI' },

  // ── CLUSTER 9: ARENA ──
  AR: { ref: 'AR', name: 'Arena', href: '/arena', icon: Swords, type: 'compound', cluster: 'arena', description: 'Compete, earn, collaborate', children: [
    { name: 'Competitions', href: '/arena/competitions', icon: Trophy },
    { name: 'Teams', href: '/arena/teams', icon: Users },
    { name: 'Bounties', href: '/arena/bounties', icon: Target },
    { name: 'Tokens', href: '/arena/tokens', icon: Coins },
  ]},

  // ── CLUSTER 10: CONTENT CREATION ──
  CR1: { ref: 'CR1', name: 'AI Content Studio', href: '/ai-studio', icon: Palette, type: 'atomic', cluster: 'creator', description: 'Author content with AI tools' },
  CR4: { ref: 'CR4', name: 'Marketplace', href: '/marketplace', icon: Store, type: 'atomic', cluster: 'creator', description: 'Discover apps and content' },
  CR_DEV: { ref: 'CR_DEV', name: 'My Content', href: '/marketplace/developer', icon: PenSquare, type: 'atomic', cluster: 'creator', description: 'Manage your published content' },
  CR_EARNINGS: { ref: 'CR_EARNINGS', name: 'Earnings', href: '/marketplace/developer', icon: CreditCard, type: 'atomic', cluster: 'creator', description: 'Content revenue and analytics' },

  // ── CLUSTER 11: AUTOMATION ──
  SR1: {
    ref: 'SR1',
    name: 'S&R Canvas',
    href: '/dashboard/canvas',
    icon: Workflow,
    type: 'compound',
    children: [
      { name: 'Designer', href: '/dashboard/canvas', icon: Workflow },
      { name: 'Active Runs', href: '/dashboard/canvas/runs', icon: Play },
    ],
    description: 'Visual workflow designer for automation pipelines',
    cluster: 'automation',
    badge: 'Beta',
  },

  // ── CROSS-CLUSTER ──
  X1: { ref: 'X1', name: 'Settings', href: '/settings', icon: Settings, type: 'atomic', cluster: 'cross', description: 'Account and preferences' },
  X2: { ref: 'X2', name: 'Verification', href: '/verification/kyc', icon: Fingerprint, type: 'atomic', cluster: 'cross', description: 'Identity and credential verification' },
  X3: { ref: 'X3', name: 'Notifications', href: '/notifications', icon: Bell, type: 'atomic', cluster: 'cross', description: 'System alerts and updates' },
  X5: { ref: 'X5', name: 'SSI Wallet', href: '/ssi', icon: Fingerprint, type: 'atomic', cluster: 'cross', description: 'Decentralised identity and credentials' },
  X6: { ref: 'X6', name: 'Governance', href: '/governance', icon: Vote, type: 'atomic', cluster: 'cross', description: 'DAO proposals and voting' },
  X7: { ref: 'X7', name: 'Help', href: '/help', icon: HelpCircle, type: 'atomic', cluster: 'cross', description: 'Documentation and support' },
  X8: { ref: 'X8', name: 'Analytics', href: '/analytics', icon: BarChart3, type: 'atomic', cluster: 'cross', description: 'Data insights' },

  // ── TEACHER SCHEDULING (compound for growth menu) ──
  TEACHER_SCHED: { ref: 'TEACHER_SCHED', name: 'Scheduling', href: '/teacher/scheduling/timetable', icon: Calendar, type: 'compound', cluster: 'teaching', description: 'Timetable, relief, rooms', children: [
    { name: 'Timetable', href: '/teacher/scheduling/timetable', icon: Calendar },
    { name: 'Relief', href: '/teacher/scheduling/relief', icon: Clock },
    { name: 'Rooms', href: '/teacher/scheduling/rooms', icon: DoorOpen },
    { name: 'Capacity', href: '/teacher/scheduling/capacity', icon: Maximize },
  ]},

  // ── TEACHER STUDENTS (compound anchor) ──
  TEACHER_STUDENTS: { ref: 'TEACHER_STUDENTS', name: 'Students', href: '/teacher/students', icon: Users, type: 'atomic', cluster: 'teaching', description: 'Student profiles and wellbeing' },

  // ── TEACHER CLASSES ──
  TEACHER_CLASSES: { ref: 'TEACHER_CLASSES', name: 'My Classes', href: '/teacher/classes', icon: School, type: 'atomic', cluster: 'teaching', description: 'Current classes and rosters' },

  // ── ADVANCED LEARNING (learner compound) ──
  ADV_LEARNING: { ref: 'ADV_LEARNING', name: 'Advanced Learning', href: '/advanced-learning', icon: Rocket, type: 'compound', cluster: 'learning', description: 'EduScrum, PBL, work experience', children: [
    { name: 'EduScrum', href: '/advanced-learning/eduscrum', icon: Kanban },
    { name: 'PBL', href: '/advanced-learning/pbl', icon: FolderKanban },
    { name: 'Work Experience', href: '/advanced-learning/work-experience', icon: Building2 },
  ]},

  // ── LEARNER CALENDAR ──
  LEARNER_CAL: { ref: 'LEARNER_CAL', name: 'Calendar', href: '/calendar', icon: Calendar, type: 'atomic', cluster: 'daily', description: 'Events and deadlines' },

  // ── LEARNER BOOKINGS ──
  LEARNER_BOOK: { ref: 'LEARNER_BOOK', name: 'Bookings', href: '/tutoring/bookings', icon: Calendar, type: 'atomic', cluster: 'family', description: 'Tutoring sessions' },
};

// =============================================================================
// ANCHOR DEFINITIONS
// =============================================================================
// These define the permanent menu items for each role.
// Anchors are the bedrock of each role's experience — they never decay,
// cannot be removed, and are always visible at the top of the menu.
//
// The anchor selections come directly from Part 1, Section 3 of the spec,
// where each role's persona, justification, and flow were defined.
// =============================================================================

export const roleAnchors: RoleAnchors[] = [
  {
    role: 'learner',
    aliases: ['student'],
    anchors: [
      { ref: 'D1', position: 0 },         // Home / Dashboard
      { ref: 'L1', position: 1 },         // Courses
      { ref: 'L3', position: 2 },         // AI Buddy
    ],
  },
  {
    role: 'teacher',
    aliases: ['educator'],
    anchors: [
      { ref: 'D1-teacher', position: 0 }, // Teacher Dashboard
      { ref: 'TEACHER_CLASSES', position: 1 }, // My Classes
      { ref: 'TEACHER_STUDENTS', position: 2 }, // Students
      { ref: 'T2', position: 3 },         // Gradebook
    ],
  },
  {
    role: 'parent',
    aliases: ['guardian'],
    anchors: [
      { ref: 'D1-parent', position: 0 },  // Parent Dashboard
      { ref: 'F1', position: 1 },         // My Children
      { ref: 'D3-parent', position: 2 },  // Messages
    ],
  },
  {
    role: 'tutor',
    aliases: ['tutor_professional'],
    anchors: [
      { ref: 'D1', position: 0 },         // Dashboard
      { ref: 'TU5', position: 1 },        // My Students
      { ref: 'TU2', position: 2 },        // Sessions
    ],
  },
  {
    role: 'admin',
    aliases: ['platform_admin'],
    anchors: [
      { ref: 'D1-admin', position: 0 },   // Admin Dashboard
      { ref: 'A1', position: 1 },         // Users
      { ref: 'T8-admin', position: 2 },   // Reports
      { ref: 'D4-admin', position: 3 },   // Timetable
    ],
  },
  {
    role: 'homeschool',
    aliases: ['homeschool_parent'],
    anchors: [
      { ref: 'D1', position: 0 },         // Dashboard
      { ref: 'H5', position: 1 },         // My Children
      { ref: 'H1', position: 2 },         // Curriculum Planner
      { ref: 'H2', position: 3 },         // Compliance
    ],
  },
  {
    role: 'creator',
    aliases: ['content_creator'],
    anchors: [
      { ref: 'D1', position: 0 },         // Dashboard
      { ref: 'CR_DEV', position: 1 },     // My Content
      { ref: 'CR_EARNINGS', position: 2 }, // Earnings
    ],
  },
];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

/**
 * Get a registered task by its ref string.
 * Returns undefined if the ref doesn't exist in the registry.
 */
export function getTask(ref: string): RegisteredTask | undefined {
  return taskRegistry[ref];
}

/**
 * Get all registered tasks. Used by the analytics dashboard for
 * populating task filter dropdowns.
 */
export function getAllTasks(): RegisteredTask[] {
  return Object.values(taskRegistry);
}

/**
 * Get the anchor definitions for a given role.
 * Checks both the primary role name and aliases.
 */
export function getAnchorsForRole(role: string | undefined): RoleAnchors | undefined {
  if (!role) return roleAnchors.find(r => r.role === 'learner');
  return roleAnchors.find(
    r => r.role === role || r.aliases.includes(role)
  );
}

/**
 * Get all tasks matching a set of refs.
 * Useful for resolving a list of refs from the store into renderable tasks.
 */
export function getTasksByRefs(refs: string[]): RegisteredTask[] {
  return refs
    .map(ref => taskRegistry[ref])
    .filter((task): task is RegisteredTask => task !== undefined);
}

/**
 * Check if a given pathname matches a registered task's href.
 * Used by the usage tracking system to determine which task a user is engaging with.
 */
export function findTaskByPath(pathname: string): RegisteredTask | undefined {
  // Exact match first
  const exact = Object.values(taskRegistry).find(t => t.href === pathname);
  if (exact) return exact;

  // Prefix match — find the most specific task whose href is a prefix of the pathname
  const prefixMatches = Object.values(taskRegistry)
    .filter(t => pathname.startsWith(t.href + '/'))
    .sort((a, b) => b.href.length - a.href.length); // Most specific first

  if (prefixMatches.length > 0) return prefixMatches[0];

  // Check children of compound items
  for (const task of Object.values(taskRegistry)) {
    if (task.children) {
      const childMatch = task.children.find(
        c => c.href === pathname || pathname.startsWith(c.href + '/')
      );
      if (childMatch) return task;
    }
  }

  return undefined;
}
