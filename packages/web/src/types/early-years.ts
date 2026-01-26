/**
 * Early Years (Little Explorers) Type Definitions
 * For ages 3-7 education module
 */

// =============================================================================
// FAMILY & CHILD TYPES
// =============================================================================

export interface Family {
  id: string;
  tenantId: string;
  familyName: string;
  primaryLanguage: string;
  homeLanguages: string[];
  timezone: string;
  dataProcessingConsent: boolean;
  createdAt: string;
  updatedAt: string;
  children: Child[];
  members: FamilyMember[];
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: 'primary_guardian' | 'guardian' | 'caregiver';
  relationship: string;
  canManageChildren: boolean;
  canViewProgress: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface Child {
  id: string;
  familyId: string;
  firstName: string;
  preferredName?: string;
  dateOfBirth: string;
  avatarId: string;
  currentWorld?: LearningWorld;
  currentMentor?: Mentor;
  hasPicturePassword: boolean;
  totalStars: number;
  currentStreak: number;
  longestStreak: number;
  level: number;
  xp: number;
  createdAt: string;
}

// =============================================================================
// LEARNING WORLD TYPES
// =============================================================================

export type LearningWorld =
  | 'phonics_forest'
  | 'number_land'
  | 'story_garden'
  | 'creative_cove';

export type Mentor =
  | 'ollie_owl'
  | 'penny_penguin'
  | 'leo_lion'
  | 'bella_butterfly';

export type SessionType =
  | 'learning'
  | 'practice'
  | 'assessment'
  | 'free_play';

export interface WorldInfo {
  id: LearningWorld;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgGradient: string;
  subjects: string[];
  unlockedAt: number; // level required
}

export interface MentorInfo {
  id: Mentor;
  name: string;
  personality: string;
  catchphrase: string;
  avatar: string;
  color: string;
  speciality: string;
}

// =============================================================================
// SESSION & ACTIVITY TYPES
// =============================================================================

export interface LearningSession {
  id: string;
  childId: string;
  world: LearningWorld;
  mentor: Mentor;
  sessionType: SessionType;
  startedAt: string;
  endedAt?: string;
  activitiesCompleted: number;
  starsEarned: number;
  xpEarned: number;
  status: 'active' | 'completed' | 'abandoned';
}

export interface Activity {
  id: string;
  sessionId: string;
  activityType: string;
  targetContent: string[];
  difficulty: number;
  score: number;
  durationSeconds: number;
  attempts: number;
  hintsUsed: number;
  errorsCommitted: number;
  starsEarned: number;
  completedAt: string;
}

// =============================================================================
// PROGRESS & GAMIFICATION TYPES
// =============================================================================

export interface ChildDashboard {
  child: Child;
  recentSessions: LearningSession[];
  phonicsProgress: PhonicsProgress;
  numeracyProgress: NumeracyProgress;
  achievements: Achievement[];
  weeklyGoal: WeeklyGoal;
  recommendedActivities: RecommendedActivity[];
}

export interface PhonicsProgress {
  currentPhase: number;
  phaseName: string;
  graphemesLearned: string[];
  graphemesInProgress: string[];
  totalGraphemes: number;
  accuracy: number;
  readyToAdvance: boolean;
}

export interface NumeracyProgress {
  currentStage: string;
  conceptsMastered: string[];
  conceptsInProgress: string[];
  accuracy: number;
  numberRecognition: number;
  counting: number;
  operations: number;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
  category: 'phonics' | 'numeracy' | 'creativity' | 'consistency' | 'social';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export interface WeeklyGoal {
  targetSessions: number;
  completedSessions: number;
  targetMinutes: number;
  completedMinutes: number;
  targetStars: number;
  earnedStars: number;
  streakDays: number;
}

export interface RecommendedActivity {
  world: LearningWorld;
  activityType: string;
  reason: string;
  difficulty: number;
  estimatedMinutes: number;
}

// =============================================================================
// PICTURE PASSWORD TYPES
// =============================================================================

export interface PicturePasswordImage {
  id: string;
  category: string;
  name: string;
  src: string;
  alt: string;
}

export interface PicturePasswordSetup {
  minImages: number;
  maxImages: number;
  categories: PicturePasswordCategory[];
}

export interface PicturePasswordCategory {
  id: string;
  name: string;
  icon: string;
  images: PicturePasswordImage[];
}

export interface PicturePasswordAttempt {
  success: boolean;
  remainingAttempts?: number;
  lockedUntil?: string;
  childToken?: string;
}

// =============================================================================
// PARENT DASHBOARD TYPES
// =============================================================================

export interface ParentDashboard {
  family: Family;
  childrenSummary: ChildSummary[];
  weeklyReport: WeeklyReport;
  recommendations: ParentRecommendation[];
  upcomingMilestones: Milestone[];
}

export interface ChildSummary {
  child: Child;
  thisWeekMinutes: number;
  thisWeekSessions: number;
  phonicsPhase: number;
  numeracyStage: string;
  recentAchievements: Achievement[];
  mood: 'happy' | 'neutral' | 'struggling';
  engagementTrend: 'up' | 'stable' | 'down';
}

export interface WeeklyReport {
  totalMinutes: number;
  totalSessions: number;
  totalStarsEarned: number;
  phonicsProgress: number; // percentage
  numeracyProgress: number; // percentage
  strongAreas: string[];
  areasForGrowth: string[];
  comparedToLastWeek: {
    minutesChange: number;
    sessionsChange: number;
    progressChange: number;
  };
}

export interface ParentRecommendation {
  type: 'activity' | 'screen_time' | 'offline_activity' | 'celebration';
  title: string;
  description: string;
  actionUrl?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface Milestone {
  id: string;
  childId: string;
  childName: string;
  title: string;
  description: string;
  expectedDate: string;
  category: 'phonics' | 'numeracy' | 'social' | 'motor';
  progress: number; // 0-100
}

// =============================================================================
// SSP PHONICS CURRICULUM
// =============================================================================

export interface PhonicsPhase {
  phase: number;
  name: string;
  description: string;
  graphemes: string[];
  skills: string[];
  activities: string[];
}

export const PHONICS_PHASES: PhonicsPhase[] = [
  {
    phase: 1,
    name: 'Environmental Sounds',
    description: 'General sound discrimination, rhyme, rhythm, and alliteration',
    graphemes: [],
    skills: ['Listening', 'Rhyming', 'Rhythm', 'Alliteration'],
    activities: ['Sound hunts', 'Rhyme games', 'Music activities'],
  },
  {
    phase: 2,
    name: 'Initial Letter Sounds',
    description: 'Learn 19 letters with their most common sounds',
    graphemes: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f'],
    skills: ['Letter recognition', 'Initial sounds', 'Blending CVC words'],
    activities: ['Letter tracing', 'Sound matching', 'Word building'],
  },
  {
    phase: 3,
    name: 'Remaining Letters & Digraphs',
    description: 'Complete alphabet plus digraphs and trigraphs',
    graphemes: ['j', 'v', 'w', 'x', 'y', 'z', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er'],
    skills: ['Digraph recognition', 'Vowel sounds', 'Reading simple sentences'],
    activities: ['Digraph hunts', 'Sentence building', 'Story reading'],
  },
  {
    phase: 4,
    name: 'Consonant Blends',
    description: 'Adjacent consonants with no new graphemes',
    graphemes: ['CVCC', 'CCVC', 'CCVCC', 'CCCVC'],
    skills: ['Consonant clusters', 'Polysyllabic words', 'Fluent reading'],
    activities: ['Blend games', 'Speed reading', 'Dictation'],
  },
  {
    phase: 5,
    name: 'Alternative Spellings',
    description: 'New graphemes and alternative pronunciations',
    graphemes: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au', 'a-e', 'e-e', 'i-e', 'o-e', 'u-e'],
    skills: ['Spelling choices', 'Reading fluency', 'Comprehension'],
    activities: ['Spelling investigations', 'Comprehension questions', 'Creative writing'],
  },
  {
    phase: 6,
    name: 'Spelling Patterns',
    description: 'Prefixes, suffixes, and spelling conventions',
    graphemes: ['-ed', '-ing', '-er', '-est', '-ful', '-ly', '-ment', '-ness', 'un-', 'dis-', 're-', 'pre-'],
    skills: ['Morphology', 'Spelling rules', 'Independent reading'],
    activities: ['Word building', 'Dictionary skills', 'Independent reading'],
  },
];

// =============================================================================
// CONSTANTS
// =============================================================================

export const LEARNING_WORLDS: WorldInfo[] = [
  {
    id: 'phonics_forest',
    name: 'Phonics Forest',
    description: 'Learn letters and sounds with woodland friends',
    icon: '🌲',
    color: 'emerald',
    bgGradient: 'from-emerald-400 to-green-600',
    subjects: ['Phonics', 'Reading', 'Spelling'],
    unlockedAt: 1,
  },
  {
    id: 'number_land',
    name: 'Number Land',
    description: 'Explore counting and maths with number buddies',
    icon: '🔢',
    color: 'blue',
    bgGradient: 'from-blue-400 to-indigo-600',
    subjects: ['Counting', 'Addition', 'Subtraction', 'Shapes'],
    unlockedAt: 1,
  },
  {
    id: 'story_garden',
    name: 'Story Garden',
    description: 'Grow your imagination with magical stories',
    icon: '📚',
    color: 'purple',
    bgGradient: 'from-purple-400 to-pink-600',
    subjects: ['Stories', 'Comprehension', 'Vocabulary'],
    unlockedAt: 3,
  },
  {
    id: 'creative_cove',
    name: 'Creative Cove',
    description: 'Express yourself through art and music',
    icon: '🎨',
    color: 'orange',
    bgGradient: 'from-orange-400 to-red-500',
    subjects: ['Art', 'Music', 'Creative Writing'],
    unlockedAt: 5,
  },
];

export const MENTORS: MentorInfo[] = [
  {
    id: 'ollie_owl',
    name: 'Ollie Owl',
    personality: 'Wise and patient',
    catchphrase: 'Whoo-hoo! Let\'s learn together!',
    avatar: '/mentors/ollie-owl.png',
    color: 'amber',
    speciality: 'Phonics and Reading',
  },
  {
    id: 'penny_penguin',
    name: 'Penny Penguin',
    personality: 'Playful and encouraging',
    catchphrase: 'Waddle we learn today?',
    avatar: '/mentors/penny-penguin.png',
    color: 'sky',
    speciality: 'Numbers and Counting',
  },
  {
    id: 'leo_lion',
    name: 'Leo Lion',
    personality: 'Brave and motivating',
    catchphrase: 'You\'re ROAR-some!',
    avatar: '/mentors/leo-lion.png',
    color: 'orange',
    speciality: 'Problem Solving',
  },
  {
    id: 'bella_butterfly',
    name: 'Bella Butterfly',
    personality: 'Creative and gentle',
    catchphrase: 'Let your imagination fly!',
    avatar: '/mentors/bella-butterfly.png',
    color: 'pink',
    speciality: 'Art and Creativity',
  },
];

// Picture password image categories
export const PICTURE_PASSWORD_CATEGORIES: PicturePasswordCategory[] = [
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐾',
    images: [
      { id: 'dog', category: 'animals', name: 'Dog', src: '/pictures/animals/dog.svg', alt: 'A friendly dog' },
      { id: 'cat', category: 'animals', name: 'Cat', src: '/pictures/animals/cat.svg', alt: 'A cute cat' },
      { id: 'bird', category: 'animals', name: 'Bird', src: '/pictures/animals/bird.svg', alt: 'A colorful bird' },
      { id: 'fish', category: 'animals', name: 'Fish', src: '/pictures/animals/fish.svg', alt: 'A swimming fish' },
      { id: 'rabbit', category: 'animals', name: 'Rabbit', src: '/pictures/animals/rabbit.svg', alt: 'A fluffy rabbit' },
      { id: 'elephant', category: 'animals', name: 'Elephant', src: '/pictures/animals/elephant.svg', alt: 'A big elephant' },
    ],
  },
  {
    id: 'food',
    name: 'Food',
    icon: '🍎',
    images: [
      { id: 'apple', category: 'food', name: 'Apple', src: '/pictures/food/apple.svg', alt: 'A red apple' },
      { id: 'banana', category: 'food', name: 'Banana', src: '/pictures/food/banana.svg', alt: 'A yellow banana' },
      { id: 'pizza', category: 'food', name: 'Pizza', src: '/pictures/food/pizza.svg', alt: 'A yummy pizza' },
      { id: 'icecream', category: 'food', name: 'Ice Cream', src: '/pictures/food/icecream.svg', alt: 'Delicious ice cream' },
      { id: 'cookie', category: 'food', name: 'Cookie', src: '/pictures/food/cookie.svg', alt: 'A chocolate chip cookie' },
      { id: 'cake', category: 'food', name: 'Cake', src: '/pictures/food/cake.svg', alt: 'A birthday cake' },
    ],
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: '🚗',
    images: [
      { id: 'car', category: 'transport', name: 'Car', src: '/pictures/transport/car.svg', alt: 'A red car' },
      { id: 'bus', category: 'transport', name: 'Bus', src: '/pictures/transport/bus.svg', alt: 'A yellow bus' },
      { id: 'train', category: 'transport', name: 'Train', src: '/pictures/transport/train.svg', alt: 'A fast train' },
      { id: 'plane', category: 'transport', name: 'Plane', src: '/pictures/transport/plane.svg', alt: 'An airplane' },
      { id: 'boat', category: 'transport', name: 'Boat', src: '/pictures/transport/boat.svg', alt: 'A sailing boat' },
      { id: 'rocket', category: 'transport', name: 'Rocket', src: '/pictures/transport/rocket.svg', alt: 'A space rocket' },
    ],
  },
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌸',
    images: [
      { id: 'sun', category: 'nature', name: 'Sun', src: '/pictures/nature/sun.svg', alt: 'A bright sun' },
      { id: 'moon', category: 'nature', name: 'Moon', src: '/pictures/nature/moon.svg', alt: 'A crescent moon' },
      { id: 'star', category: 'nature', name: 'Star', src: '/pictures/nature/star.svg', alt: 'A shining star' },
      { id: 'flower', category: 'nature', name: 'Flower', src: '/pictures/nature/flower.svg', alt: 'A pretty flower' },
      { id: 'tree', category: 'nature', name: 'Tree', src: '/pictures/nature/tree.svg', alt: 'A green tree' },
      { id: 'rainbow', category: 'nature', name: 'Rainbow', src: '/pictures/nature/rainbow.svg', alt: 'A colorful rainbow' },
    ],
  },
  {
    id: 'toys',
    name: 'Toys',
    icon: '🧸',
    images: [
      { id: 'ball', category: 'toys', name: 'Ball', src: '/pictures/toys/ball.svg', alt: 'A bouncy ball' },
      { id: 'teddy', category: 'toys', name: 'Teddy', src: '/pictures/toys/teddy.svg', alt: 'A teddy bear' },
      { id: 'blocks', category: 'toys', name: 'Blocks', src: '/pictures/toys/blocks.svg', alt: 'Building blocks' },
      { id: 'doll', category: 'toys', name: 'Doll', src: '/pictures/toys/doll.svg', alt: 'A toy doll' },
      { id: 'robot', category: 'toys', name: 'Robot', src: '/pictures/toys/robot.svg', alt: 'A toy robot' },
      { id: 'kite', category: 'toys', name: 'Kite', src: '/pictures/toys/kite.svg', alt: 'A flying kite' },
    ],
  },
  {
    id: 'shapes',
    name: 'Shapes',
    icon: '⭐',
    images: [
      { id: 'circle', category: 'shapes', name: 'Circle', src: '/pictures/shapes/circle.svg', alt: 'A circle' },
      { id: 'square', category: 'shapes', name: 'Square', src: '/pictures/shapes/square.svg', alt: 'A square' },
      { id: 'triangle', category: 'shapes', name: 'Triangle', src: '/pictures/shapes/triangle.svg', alt: 'A triangle' },
      { id: 'heart', category: 'shapes', name: 'Heart', src: '/pictures/shapes/heart.svg', alt: 'A heart shape' },
      { id: 'diamond', category: 'shapes', name: 'Diamond', src: '/pictures/shapes/diamond.svg', alt: 'A diamond shape' },
      { id: 'oval', category: 'shapes', name: 'Oval', src: '/pictures/shapes/oval.svg', alt: 'An oval shape' },
    ],
  },
];
