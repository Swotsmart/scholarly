export interface MicroSchool {
  id: string;
  name: string;
  location: string;
  state: string;
  studentCount: number;
  teacherCount: number;
  focusArea: string;
  focusAreas: string[];
  description: string;
  status: 'accepting' | 'waitlisted' | 'full';
  foundingYear: number;
  accreditation: string;
  satisfaction: number;
  fees: string;
  nextIntake: string;
  facilities: string[];
  teachers: MicroSchoolTeacher[];
  curriculum: MicroSchoolCurriculum[];
}

export interface MicroSchoolTeacher {
  id: string;
  name: string;
  specialization: string;
  yearsExperience: number;
  avatar: string;
}

export interface MicroSchoolCurriculum {
  area: string;
  description: string;
}

export interface MicroSchoolApplication {
  id: string;
  schoolId: string;
  schoolName: string;
  childName: string;
  status: 'accepted' | 'waitlisted' | 'under-review' | 'rejected';
  waitlistPosition?: number;
  appliedDate: string;
  responseDate?: string;
  timelineSteps: ApplicationStep[];
}

export interface ApplicationStep {
  label: string;
  completed: boolean;
  date?: string;
}

export const microSchools: MicroSchool[] = [
  {
    id: 'school_1',
    name: 'Harbour STEM Academy',
    location: 'Sydney',
    state: 'NSW',
    studentCount: 35,
    teacherCount: 6,
    focusArea: 'STEM',
    focusAreas: ['STEM', 'Robotics', 'Environmental Science'],
    description: 'A project-based learning community focused on science, technology, engineering, and mathematics. Students engage in real-world problem-solving with a strong emphasis on collaboration and innovation near the Sydney Harbour.',
    status: 'accepting',
    foundingYear: 2019,
    accreditation: 'NESA Registered',
    satisfaction: 4.8,
    fees: '$12,500 per annum',
    nextIntake: 'Term 1, 2026',
    facilities: ['Library', 'Science Lab', 'Maker Space', 'Outdoor Learning Area', 'Computer Lab', 'Garden'],
    teachers: [
      { id: 't1', name: 'Dr Sarah Chen', specialization: 'Physics & Robotics', yearsExperience: 12, avatar: '\uD83D\uDC69\u200D\uD83C\uDFEB' },
      { id: 't2', name: 'James Woolley', specialization: 'Mathematics & Data Science', yearsExperience: 8, avatar: '\uD83D\uDC68\u200D\uD83C\uDFEB' },
      { id: 't3', name: 'Priya Mehta', specialization: 'Environmental Science', yearsExperience: 10, avatar: '\uD83D\uDC69\u200D\uD83D\uDD2C' },
    ],
    curriculum: [
      { area: 'STEM Integration', description: 'Cross-disciplinary projects combining science, technology, engineering, and maths with real-world applications.' },
      { area: 'Robotics Program', description: 'Hands-on robotics from basic circuitry to advanced programming with Arduino and Raspberry Pi.' },
      { area: 'Environmental Science', description: 'Harbour ecology studies, sustainability projects, and citizen science participation.' },
    ],
  },
  {
    id: 'school_2',
    name: 'Yarra Valley Montessori',
    location: 'Melbourne',
    state: 'VIC',
    studentCount: 28,
    teacherCount: 5,
    focusArea: 'Montessori',
    focusAreas: ['Montessori', 'Self-Directed Learning', 'Nature Education'],
    description: 'An authentic Montessori learning environment nestled in the Yarra Valley, offering mixed-age classrooms, self-directed learning, and deep connection with the natural world.',
    status: 'waitlisted',
    foundingYear: 2017,
    accreditation: 'VRQA Registered',
    satisfaction: 4.9,
    fees: '$14,200 per annum',
    nextIntake: 'Term 2, 2026',
    facilities: ['Montessori Classroom', 'Art Studio', 'Music Room', 'Organic Garden', 'Bush Classroom', 'Library'],
    teachers: [
      { id: 't4', name: 'Elena Rossi', specialization: 'Montessori 6-12', yearsExperience: 15, avatar: '\uD83D\uDC69\u200D\uD83C\uDFEB' },
      { id: 't5', name: 'Tom Nguyen', specialization: 'Environmental Education', yearsExperience: 9, avatar: '\uD83D\uDC68\u200D\uD83C\uDF3E' },
      { id: 't6', name: 'Maria Santos', specialization: 'Arts & Music', yearsExperience: 11, avatar: '\uD83D\uDC69\u200D\uD83C\uDFA8' },
    ],
    curriculum: [
      { area: 'Montessori Method', description: 'Self-paced, hands-on learning with specially designed Montessori materials across all subject areas.' },
      { area: 'Nature Education', description: 'Weekly bush walks, seasonal gardening, and ecological studies in the Yarra Valley environment.' },
      { area: 'Creative Expression', description: 'Integrated arts program including visual arts, music, drama, and movement.' },
    ],
  },
  {
    id: 'school_3',
    name: 'Sunshine Coast Outdoor Learning',
    location: 'Brisbane',
    state: 'QLD',
    studentCount: 22,
    teacherCount: 4,
    focusArea: 'Outdoor',
    focusAreas: ['Outdoor Education', 'Sustainability', 'Indigenous Knowledge'],
    description: 'A nature-immersive micro-school on the Sunshine Coast hinterland where students learn through bushcraft, Indigenous ecological knowledge, and hands-on sustainability projects.',
    status: 'accepting',
    foundingYear: 2020,
    accreditation: 'NSSAB Registered',
    satisfaction: 4.7,
    fees: '$10,800 per annum',
    nextIntake: 'Term 1, 2026',
    facilities: ['Outdoor Classroom', 'Fire Circle', 'Tool Workshop', 'Bush Kitchen', 'Creek Study Area', 'Yurt'],
    teachers: [
      { id: 't7', name: 'Ben Walker', specialization: 'Outdoor Education & Bushcraft', yearsExperience: 14, avatar: '\uD83E\uDDD4' },
      { id: 't8', name: 'Aunty Karen Williams', specialization: 'Indigenous Knowledge', yearsExperience: 20, avatar: '\uD83D\uDC69\u200D\uD83C\uDFEB' },
      { id: 't9', name: 'Lily Chang', specialization: 'Sustainability & Science', yearsExperience: 7, avatar: '\uD83D\uDC69\u200D\uD83D\uDD2C' },
    ],
    curriculum: [
      { area: 'Outdoor Learning', description: 'Curriculum delivered primarily outdoors using the natural environment as the classroom and resource.' },
      { area: 'Indigenous Knowledge', description: 'Integration of Aboriginal and Torres Strait Islander perspectives on ecology, seasons, and land management.' },
      { area: 'Sustainability', description: 'Practical sustainability skills including permaculture, water management, and renewable energy basics.' },
    ],
  },
  {
    id: 'school_4',
    name: 'Perth Creative Arts School',
    location: 'Perth',
    state: 'WA',
    studentCount: 45,
    teacherCount: 8,
    focusArea: 'Arts',
    focusAreas: ['Visual Arts', 'Performing Arts', 'Digital Media'],
    description: 'A vibrant creative arts micro-school in Fremantle where students develop artistic mastery alongside strong academic foundations, preparing for careers in creative industries.',
    status: 'accepting',
    foundingYear: 2018,
    accreditation: 'SCSA Registered',
    satisfaction: 4.6,
    fees: '$13,000 per annum',
    nextIntake: 'Term 1, 2026',
    facilities: ['Art Studio', 'Theatre', 'Recording Studio', 'Dance Studio', 'Digital Media Lab', 'Gallery Space'],
    teachers: [
      { id: 't10', name: 'Zara Al-Rashid', specialization: 'Visual Arts & Sculpture', yearsExperience: 13, avatar: '\uD83D\uDC69\u200D\uD83C\uDFA8' },
      { id: 't11', name: 'Marcus Lee', specialization: 'Performing Arts & Theatre', yearsExperience: 16, avatar: '\uD83C\uDFAD' },
      { id: 't12', name: 'Sophie Brown', specialization: 'Digital Media & Film', yearsExperience: 6, avatar: '\uD83C\uDFA5' },
    ],
    curriculum: [
      { area: 'Visual Arts', description: 'Drawing, painting, sculpture, printmaking, and mixed media with gallery exhibitions each term.' },
      { area: 'Performing Arts', description: 'Theatre, dance, and music performance with an annual showcase production.' },
      { area: 'Digital Media', description: 'Film production, animation, graphic design, and digital storytelling using industry-standard tools.' },
    ],
  },
];

export const applications: MicroSchoolApplication[] = [
  {
    id: 'app_1',
    schoolId: 'school_1',
    schoolName: 'Harbour STEM Academy',
    childName: 'Liam Patterson',
    status: 'accepted',
    appliedDate: '15 Jan 2026',
    responseDate: '22 Jan 2026',
    timelineSteps: [
      { label: 'Application Submitted', completed: true, date: '15 Jan 2026' },
      { label: 'Documents Verified', completed: true, date: '17 Jan 2026' },
      { label: 'Interview Scheduled', completed: true, date: '19 Jan 2026' },
      { label: 'Decision Made', completed: true, date: '22 Jan 2026' },
      { label: 'Enrolment Confirmed', completed: false },
    ],
  },
  {
    id: 'app_2',
    schoolId: 'school_2',
    schoolName: 'Yarra Valley Montessori',
    childName: 'Ava Patterson',
    status: 'waitlisted',
    waitlistPosition: 4,
    appliedDate: '10 Dec 2025',
    timelineSteps: [
      { label: 'Application Submitted', completed: true, date: '10 Dec 2025' },
      { label: 'Documents Verified', completed: true, date: '12 Dec 2025' },
      { label: 'Interview Completed', completed: true, date: '18 Dec 2025' },
      { label: 'Waitlisted', completed: true, date: '22 Dec 2025' },
      { label: 'Offer Pending', completed: false },
    ],
  },
  {
    id: 'app_3',
    schoolId: 'school_4',
    schoolName: 'Perth Creative Arts School',
    childName: 'Liam Patterson',
    status: 'under-review',
    appliedDate: '20 Jan 2026',
    timelineSteps: [
      { label: 'Application Submitted', completed: true, date: '20 Jan 2026' },
      { label: 'Documents Verified', completed: true, date: '23 Jan 2026' },
      { label: 'Under Review', completed: false },
      { label: 'Decision Pending', completed: false },
      { label: 'Enrolment', completed: false },
    ],
  },
];
