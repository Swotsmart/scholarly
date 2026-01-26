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
