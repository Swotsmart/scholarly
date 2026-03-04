export interface HomeschoolChild {
  id: string;
  name: string;
  age: number;
  yearLevel: number;
  avatar: string;
  subjects: string[];
  overallProgress: number;
}

export interface HomeschoolSubject {
  id: string;
  name: string;
  hoursPerWeek: number;
  yearLevel: number;
  acaraAlignment: string;
  progress: number;
  units: string[];
  standardsCoverage: number;
  color: string;
}

export interface HomeschoolResource {
  id: string;
  title: string;
  type: 'Textbook' | 'Worksheet' | 'Video' | 'Interactive' | 'Game';
  subject: string;
  yearLevel: string;
  description: string;
  provider: string;
  bookmarked: boolean;
}

export interface WeeklyScheduleDay {
  day: string;
  subjects: string[];
}

export const children: HomeschoolChild[] = [
  {
    id: 'child_1',
    name: 'Liam Patterson',
    age: 10,
    yearLevel: 5,
    avatar: '\uD83D\uDC66',
    subjects: ['Mathematics', 'English', 'Science', 'HASS', 'Technologies', 'Arts'],
    overallProgress: 68,
  },
  {
    id: 'child_2',
    name: 'Ava Patterson',
    age: 12,
    yearLevel: 7,
    avatar: '\uD83D\uDC67',
    subjects: ['Mathematics', 'English', 'Science', 'HASS', 'Technologies', 'Arts'],
    overallProgress: 74,
  },
];

export const subjects: HomeschoolSubject[] = [
  {
    id: 'subj_1',
    name: 'Mathematics',
    hoursPerWeek: 5,
    yearLevel: 5,
    acaraAlignment: 'ACARA v9.0 - Year 5',
    progress: 72,
    units: ['Number and Algebra', 'Measurement and Geometry', 'Statistics and Probability', 'Computational Thinking'],
    standardsCoverage: 78,
    color: 'bg-blue-500',
  },
  {
    id: 'subj_2',
    name: 'English',
    hoursPerWeek: 5,
    yearLevel: 5,
    acaraAlignment: 'ACARA v9.0 - Year 5',
    progress: 65,
    units: ['Language', 'Literature', 'Literacy'],
    standardsCoverage: 70,
    color: 'bg-green-500',
  },
  {
    id: 'subj_3',
    name: 'Science',
    hoursPerWeek: 4,
    yearLevel: 5,
    acaraAlignment: 'ACARA v9.0 - Year 5',
    progress: 58,
    units: ['Biological Sciences', 'Chemical Sciences', 'Earth and Space Sciences', 'Physical Sciences'],
    standardsCoverage: 62,
    color: 'bg-purple-500',
  },
  {
    id: 'subj_4',
    name: 'HASS',
    hoursPerWeek: 4,
    yearLevel: 5,
    acaraAlignment: 'ACARA v9.0 - Year 5',
    progress: 70,
    units: ['History', 'Geography', 'Civics and Citizenship'],
    standardsCoverage: 75,
    color: 'bg-amber-500',
  },
  {
    id: 'subj_5',
    name: 'Technologies',
    hoursPerWeek: 3,
    yearLevel: 5,
    acaraAlignment: 'ACARA v9.0 - Year 5',
    progress: 80,
    units: ['Digital Technologies', 'Design and Technologies', 'Coding Fundamentals'],
    standardsCoverage: 85,
    color: 'bg-cyan-500',
  },
  {
    id: 'subj_6',
    name: 'Arts',
    hoursPerWeek: 4,
    yearLevel: 5,
    acaraAlignment: 'ACARA v9.0 - Year 5',
    progress: 90,
    units: ['Visual Arts', 'Music', 'Drama', 'Media Arts'],
    standardsCoverage: 88,
    color: 'bg-pink-500',
  },
];

export const resources: HomeschoolResource[] = [
  {
    id: 'res_1',
    title: 'Khan Academy: Fractions & Decimals',
    type: 'Video',
    subject: 'Mathematics',
    yearLevel: 'Year 5',
    description: 'Comprehensive video series covering fraction operations, decimal conversions, and real-world applications aligned to the Australian curriculum.',
    provider: 'Khan Academy',
    bookmarked: true,
  },
  {
    id: 'res_2',
    title: 'ACARA English Comprehension Pack',
    type: 'Worksheet',
    subject: 'English',
    yearLevel: 'Year 5',
    description: 'Printable reading comprehension worksheets aligned to ACARA Year 5 standards with Australian texts and themes.',
    provider: 'ACARA',
    bookmarked: false,
  },
  {
    id: 'res_3',
    title: 'ABC Education: Our Solar System',
    type: 'Interactive',
    subject: 'Science',
    yearLevel: 'Year 5-7',
    description: 'Interactive exploration of the solar system with guided activities, quizzes, and teacher notes from ABC Education.',
    provider: 'ABC Education',
    bookmarked: true,
  },
  {
    id: 'res_4',
    title: 'Mathletics Gold Challenge',
    type: 'Game',
    subject: 'Mathematics',
    yearLevel: 'Year 5',
    description: 'Gamified mathematics challenges covering multiplication, division, and problem-solving with adaptive difficulty levels.',
    provider: 'Mathletics',
    bookmarked: false,
  },
  {
    id: 'res_5',
    title: 'Oxford Australian History Textbook',
    type: 'Textbook',
    subject: 'HASS',
    yearLevel: 'Year 5',
    description: 'Comprehensive history textbook covering Australian colonial history, Indigenous perspectives, and Federation.',
    provider: 'Oxford University Press',
    bookmarked: true,
  },
  {
    id: 'res_6',
    title: 'ABC Splash: Creative Writing Prompts',
    type: 'Worksheet',
    subject: 'English',
    yearLevel: 'Year 5-7',
    description: 'Weekly creative writing prompt cards featuring Australian settings, animals, and cultural themes for imaginative writing practice.',
    provider: 'ABC Education',
    bookmarked: false,
  },
  {
    id: 'res_7',
    title: 'Scratch Coding Adventures',
    type: 'Interactive',
    subject: 'Technologies',
    yearLevel: 'Year 5',
    description: 'Step-by-step coding projects using Scratch, introducing algorithms, loops, and conditionals through fun game creation.',
    provider: 'Scratch Foundation',
    bookmarked: false,
  },
  {
    id: 'res_8',
    title: 'National Gallery Virtual Art Tour',
    type: 'Video',
    subject: 'Arts',
    yearLevel: 'Year 5-7',
    description: 'Virtual tours of the National Gallery of Australia featuring Aboriginal and Torres Strait Islander art with guided activities.',
    provider: 'National Gallery of Australia',
    bookmarked: true,
  },
];

export const weeklySchedule: WeeklyScheduleDay[] = [
  { day: 'Monday', subjects: ['Mathematics', 'English', 'Science', 'Arts'] },
  { day: 'Tuesday', subjects: ['English', 'HASS', 'Technologies'] },
  { day: 'Wednesday', subjects: ['Mathematics', 'Science', 'Arts', 'HASS'] },
  { day: 'Thursday', subjects: ['English', 'Mathematics', 'Technologies'] },
  { day: 'Friday', subjects: ['HASS', 'Arts', 'Science', 'English'] },
];

// ---------------------------------------------------------------------------
// API Client Bridge
// Wraps the demo data above in an API-shaped client that the useHomeschool
// hook can consume. When DEMO_MODE is off (backend available), replace these
// with real fetch calls to /api/v1/homeschool/*.
// ---------------------------------------------------------------------------

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

import type {
  HomeschoolFamily,
  HomeschoolCoop,
  Excursion,
  FamilyMatch,
  PaginationInfo,
} from '@/types/homeschool';

// Demo family conforming to HomeschoolFamily interface
const demoFamily: HomeschoolFamily = {
  id: 'fam-patterson-1',
  tenantId: 'demo-tenant',
  primaryContactUserId: 'user-patterson',
  primaryContactName: 'Sarah Patterson',
  primaryContactEmail: 'sarah@patterson.family',
  primaryContactPhone: '0412 345 678',
  additionalContacts: [],
  educationalPhilosophy: 'Eclectic approach blending Charlotte Mason with project-based learning',
  curriculumApproach: 'eclectic',
  teachingCapabilities: [],
  coopPreferences: {
    interestedInCoops: true, maxCoopsToJoin: 3, willingToHost: true,
    willingToTeach: true, willingToOrganize: false,
    availableDays: ['Monday', 'Wednesday', 'Friday'],
    preferredTimes: ['morning'], preferredCoopSize: 'small',
    ageRangeTolerance: 3,
  },
  compliance: {
    jurisdiction: 'Western Australia',
    registrationStatus: 'registered',
    registrationNumber: 'WA-HS-2024-1234',
    registrationExpiry: '2026-12-31',
    documents: [
      { type: 'Registration Certificate', name: 'WA Home Education Registration', status: 'current', expiryDate: '2026-12-31' },
    ],
    lastReportSubmitted: '2025-12-01',
    nextReportDue: '2026-06-01',
    reportingFrequency: 'biannual',
    complianceScore: 92,
    complianceAlerts: [],
    suggestedActions: ['Submit mid-year progress report by June'],
  },
  aiProfile: {
    compatibilityVector: [0.85, 0.72, 0.68, 0.9],
    predictedChallenges: ['Science lab access', 'Peer socialisation'],
    predictedStrengths: ['Strong literacy foundation', 'Self-directed learning'],
    engagementScore: 88,
    engagementTrend: 'increasing',
    recommendedCoops: ['coop-1'],
    recommendedResources: ['res_1', 'res_3'],
    recommendedConnections: ['fam-1'],
    supportNeedsScore: 25,
    suggestedSupport: [],
    lastAnalyzed: '2026-03-01T08:00:00Z',
  },
  status: 'active',
  lastActiveAt: '2026-03-04T09:00:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2026-03-04T09:00:00Z',
  children: children.map(c => ({
    id: c.id,
    familyId: 'fam-patterson-1',
    name: c.name,
    dateOfBirth: c.age === 10 ? '2016-05-12' : '2014-03-08',
    currentYearLevel: `Year ${c.yearLevel}`,
    interests: ['Science', 'Art'],
    strengths: ['Mathematics'],
    challengeAreas: [],
    specialNeeds: [],
    curriculumFramework: 'ACARA v9.0',
    subjectProgress: [],
  })),
  location: { suburb: 'South Perth', state: 'WA', postcode: '6151', country: 'Australia' },
};

const demoCoops: HomeschoolCoop[] = [
  {
    id: 'coop-1', tenantId: 'demo-tenant', name: 'South Perth STEM Co-op',
    description: 'Weekly science and maths activities for ages 5-12',
    philosophy: 'Hands-on STEM learning through collaborative projects',
    meetingLocations: [], maxFamilies: 15, membershipFee: 50,
    meetingSchedule: { frequency: 'weekly', dayOfWeek: 3, startTime: '09:00', endTime: '12:00', timezone: 'Australia/Perth' },
    subjects: ['Mathematics', 'Science', 'Technologies'], ageRange: { min: 5, max: 12 },
    educationalApproaches: ['project_based', 'eclectic'],
    structure: { type: 'rotating_parent' }, roles: [],
    status: 'active', createdAt: '2024-06-01', updatedAt: '2026-03-01',
    _count: { members: 12 },
  },
  {
    id: 'coop-2', tenantId: 'demo-tenant', name: 'Fremantle Nature School',
    description: 'Outdoor education and nature journaling',
    philosophy: 'Nature-based learning inspired by forest school principles',
    meetingLocations: [], maxFamilies: 10,
    meetingSchedule: { frequency: 'weekly', dayOfWeek: 5, startTime: '09:30', endTime: '13:00', timezone: 'Australia/Perth' },
    subjects: ['Science', 'Arts', 'HASS'], ageRange: { min: 4, max: 10 },
    educationalApproaches: ['charlotte_mason', 'unschooling'],
    structure: { type: 'rotating_parent' }, roles: [],
    status: 'active', createdAt: '2024-08-15', updatedAt: '2026-02-20',
    _count: { members: 8 },
  },
];

const demoExcursions: Excursion[] = [
  {
    id: 'exc-1', tenantId: 'demo-tenant', organizerId: 'user-patterson',
    title: 'Perth Zoo Educational Visit', description: 'Guided educational tour focusing on Australian wildlife and conservation',
    venue: { name: 'Perth Zoo', address: '20 Labouchere Rd, South Perth WA 6151' },
    curriculumConnections: [{ curriculumCode: 'ACSSU043', subject: 'Science', description: 'Living things and their environments' }],
    learningObjectives: ['Identify Australian native species', 'Understand conservation efforts'],
    date: '2026-03-15', startTime: '09:30', endTime: '14:00',
    meetingPoint: 'Main entrance', transportation: 'Self-drive',
    minParticipants: 5, maxParticipants: 20, status: 'confirmed',
    createdAt: '2026-02-01',
    _count: { registrations: 12 },
  },
  {
    id: 'exc-2', tenantId: 'demo-tenant', organizerId: 'user-nguyen',
    title: 'Scitech Discovery Centre', description: 'Interactive science and technology exhibits',
    venue: { name: 'Scitech', address: 'City West Centre, Sutherland St, West Perth WA 6005' },
    curriculumConnections: [{ curriculumCode: 'ACSSU077', subject: 'Science', description: 'Physical sciences and energy' }],
    learningObjectives: ['Explore physics concepts', 'Understand renewable energy'],
    date: '2026-03-22', startTime: '10:00', endTime: '14:30',
    meetingPoint: 'Front foyer', transportation: 'Self-drive',
    minParticipants: 4, maxParticipants: 15, status: 'open',
    createdAt: '2026-02-15',
    _count: { registrations: 6 },
  },
];

const demoFamilyMatches: FamilyMatch[] = [
  { familyId: 'fam-1', familyName: 'The Nguyen Family', location: 'Applecross', educationalApproach: 'eclectic', childrenAges: [8, 10, 13], childrenCount: 3, compatibilityScore: 92, matchReasons: ['Similar ages', 'Shared STEM interest', 'Nearby location'] },
  { familyId: 'fam-2', familyName: 'The Smith Family', location: 'Fremantle', educationalApproach: 'charlotte_mason', childrenAges: [9, 11], childrenCount: 2, compatibilityScore: 78, matchReasons: ['Nature-based learning', 'Compatible ages'] },
];

export const homeschoolApi = {
  async getFamily(): Promise<{ family: HomeschoolFamily }> {
    if (DEMO_MODE) { await delay(200); return { family: demoFamily }; }
    const res = await fetch('/api/v1/homeschool/family', { credentials: 'include' });
    return res.json();
  },

  async getSubjects(): Promise<HomeschoolSubject[]> {
    if (DEMO_MODE) { await delay(150); return subjects; }
    const res = await fetch('/api/v1/homeschool/subjects', { credentials: 'include' });
    return res.json();
  },

  async getResources(): Promise<HomeschoolResource[]> {
    if (DEMO_MODE) { await delay(150); return resources; }
    const res = await fetch('/api/v1/homeschool/resources', { credentials: 'include' });
    return res.json();
  },

  async getCoops(options?: { status?: string; pageSize?: number }): Promise<{ coops: HomeschoolCoop[]; pagination: PaginationInfo }> {
    if (DEMO_MODE) {
      await delay(200);
      const filtered = options?.status ? demoCoops.filter(c => c.status === options.status) : demoCoops;
      return {
        coops: filtered.slice(0, options?.pageSize ?? 20),
        pagination: { page: 1, pageSize: options?.pageSize ?? 20, total: filtered.length, totalPages: 1 },
      };
    }
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.pageSize) params.set('pageSize', String(options.pageSize));
    const qs = params.toString() ? `?${params}` : '';
    const res = await fetch(`/api/v1/homeschool/coops${qs}`, { credentials: 'include' });
    return res.json();
  },

  async getExcursions(options?: { upcoming?: boolean; pageSize?: number }): Promise<{ excursions: Excursion[]; pagination: PaginationInfo }> {
    if (DEMO_MODE) {
      await delay(150);
      const filtered = options?.upcoming
        ? demoExcursions.filter(e => new Date(e.date) >= new Date())
        : demoExcursions;
      return {
        excursions: filtered.slice(0, options?.pageSize ?? 20),
        pagination: { page: 1, pageSize: options?.pageSize ?? 20, total: filtered.length, totalPages: 1 },
      };
    }
    const params = new URLSearchParams();
    if (options?.upcoming) params.set('upcoming', 'true');
    if (options?.pageSize) params.set('pageSize', String(options.pageSize));
    const qs = params.toString() ? `?${params}` : '';
    const res = await fetch(`/api/v1/homeschool/excursions${qs}`, { credentials: 'include' });
    return res.json();
  },

  async searchFamilies(query?: string): Promise<{ matches: FamilyMatch[] }> {
    if (DEMO_MODE) {
      await delay(200);
      const matches = query
        ? demoFamilyMatches.filter(f => f.familyName.toLowerCase().includes(query.toLowerCase()))
        : demoFamilyMatches;
      return { matches };
    }
    const qs = query ? `?q=${encodeURIComponent(query)}` : '';
    const res = await fetch(`/api/v1/homeschool/families/search${qs}`, { credentials: 'include' });
    return res.json();
  },
};
