/**
 * Digital Portfolio API Client
 * Handles all API interactions for portfolio management
 */

import type {
  Artifact,
  LearningGoal,
  LearningJourney,
} from '@/types/portfolio';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA
// =============================================================================

const demoArtifacts: Artifact[] = [
  {
    id: 'art-1',
    title: 'Climate Change Research Paper',
    type: 'document',
    description: 'A comprehensive analysis of climate change impacts on coastal ecosystems with data-driven conclusions.',
    createdAt: '2024-02-08T10:00:00Z',
    updatedAt: '2024-02-10T14:30:00Z',
    tags: ['science', 'research', 'environment'],
    fileSize: '2.4 MB',
  },
  {
    id: 'art-2',
    title: 'Geometric Art Composition',
    type: 'image',
    description: 'Digital artwork combining mathematical patterns with artistic expression using generative algorithms.',
    createdAt: '2024-02-05T09:00:00Z',
    updatedAt: '2024-02-05T09:00:00Z',
    tags: ['art', 'mathematics', 'digital'],
    fileSize: '8.1 MB',
  },
  {
    id: 'art-3',
    title: 'Physics Experiment Demo',
    type: 'video',
    description: 'Recording of a pendulum wave experiment demonstrating harmonic motion principles.',
    createdAt: '2024-02-01T14:00:00Z',
    updatedAt: '2024-02-02T16:00:00Z',
    tags: ['physics', 'experiment', 'video'],
    fileSize: '145 MB',
  },
  {
    id: 'art-4',
    title: 'Data Visualization Dashboard',
    type: 'code',
    description: 'Interactive dashboard built with Python and Plotly for visualizing student performance data.',
    createdAt: '2024-01-28T11:00:00Z',
    updatedAt: '2024-02-09T10:00:00Z',
    tags: ['coding', 'data-science', 'python'],
    fileSize: '340 KB',
  },
  {
    id: 'art-5',
    title: 'History of Innovation Presentation',
    type: 'presentation',
    description: 'Slide deck exploring key innovations from the Industrial Revolution to the Digital Age.',
    createdAt: '2024-01-25T08:30:00Z',
    updatedAt: '2024-01-26T12:00:00Z',
    tags: ['history', 'innovation', 'presentation'],
    fileSize: '15.2 MB',
  },
  {
    id: 'art-6',
    title: 'Mobile App UI Mockup',
    type: 'design',
    description: 'Complete UI/UX design mockup for a student wellness tracking mobile application.',
    createdAt: '2024-01-20T13:00:00Z',
    updatedAt: '2024-02-03T09:15:00Z',
    tags: ['design', 'ui-ux', 'mobile'],
    fileSize: '22.8 MB',
  },
  {
    id: 'art-7',
    title: 'Shakespearean Sonnet Analysis',
    type: 'document',
    description: 'Literary analysis exploring themes of time and mortality in Shakespeare Sonnet 18.',
    createdAt: '2024-01-18T10:00:00Z',
    updatedAt: '2024-01-19T16:30:00Z',
    tags: ['english', 'literature', 'analysis'],
    fileSize: '1.1 MB',
  },
  {
    id: 'art-8',
    title: 'Sorting Algorithm Visualizer',
    type: 'code',
    description: 'Interactive web app that visualizes bubble sort, merge sort, and quicksort algorithms.',
    createdAt: '2024-01-15T15:00:00Z',
    updatedAt: '2024-01-22T11:00:00Z',
    tags: ['coding', 'algorithms', 'javascript'],
    fileSize: '180 KB',
  },
];

const demoGoals: LearningGoal[] = [
  {
    id: 'goal-1',
    title: 'Master Calculus Fundamentals',
    description: 'Complete all core calculus topics including limits, derivatives, and integrals with 85%+ mastery.',
    targetDate: '2024-04-30',
    progress: 68,
    status: 'on-track',
    milestones: [
      { name: 'Complete limits unit', completed: true },
      { name: 'Master derivative rules', completed: true },
      { name: 'Apply chain rule fluently', completed: true },
      { name: 'Integration techniques', completed: false },
      { name: 'Applications of integrals', completed: false },
    ],
  },
  {
    id: 'goal-2',
    title: 'Build Full-Stack Web Application',
    description: 'Design, develop, and deploy a complete web application with frontend, backend, and database.',
    targetDate: '2024-03-15',
    progress: 45,
    status: 'at-risk',
    milestones: [
      { name: 'Design system architecture', completed: true },
      { name: 'Build REST API', completed: true },
      { name: 'Create frontend components', completed: false },
      { name: 'Implement authentication', completed: false },
      { name: 'Deploy to production', completed: false },
    ],
  },
  {
    id: 'goal-3',
    title: 'IB Extended Essay Completion',
    description: 'Complete the 4,000-word extended essay on environmental science with proper research methodology.',
    targetDate: '2024-05-20',
    progress: 82,
    status: 'on-track',
    milestones: [
      { name: 'Topic selection and approval', completed: true },
      { name: 'Literature review', completed: true },
      { name: 'Data collection', completed: true },
      { name: 'First draft complete', completed: true },
      { name: 'Final revision and submission', completed: false },
    ],
  },
  {
    id: 'goal-4',
    title: 'Achieve B2 French Proficiency',
    description: 'Reach upper-intermediate French proficiency across all four language skills.',
    targetDate: '2024-06-30',
    progress: 55,
    status: 'on-track',
    milestones: [
      { name: 'B1 reading comprehension', completed: true },
      { name: 'B1 listening proficiency', completed: true },
      { name: 'B2 vocabulary threshold', completed: false },
      { name: 'B2 writing assessment', completed: false },
      { name: 'B2 speaking evaluation', completed: false },
    ],
  },
  {
    id: 'goal-5',
    title: 'Complete Biology IA Experiment',
    description: 'Design and execute an independent biology investigation on enzyme activity and pH levels.',
    targetDate: '2024-02-01',
    progress: 100,
    status: 'completed',
    milestones: [
      { name: 'Research question formulation', completed: true },
      { name: 'Experimental design', completed: true },
      { name: 'Data collection', completed: true },
      { name: 'Statistical analysis', completed: true },
      { name: 'Report submission', completed: true },
    ],
  },
];

const demoJourneys: LearningJourney[] = [
  {
    id: 'journey-1',
    title: 'STEM Research & Innovation',
    startDate: '2024-01-08',
    status: 'active',
    milestones: [
      {
        id: 'jm-1',
        title: 'Started STEM Research Program',
        date: '2024-02-10',
        description: 'Enrolled in the advanced STEM research track focusing on environmental data analysis.',
        type: 'achievement',
      },
      {
        id: 'jm-2',
        title: 'Completed Data Visualization Project',
        date: '2024-02-07',
        description: 'Built an interactive dashboard using Python and Plotly to visualize climate data trends.',
        type: 'artifact',
        artifactId: 'art-4',
      },
      {
        id: 'jm-3',
        title: 'Mid-term Assessment: Data Science',
        date: '2024-02-03',
        description: 'Scored 88% on the data science mid-term covering statistical methods and data wrangling.',
        type: 'assessment',
      },
      {
        id: 'jm-4',
        title: 'Research Methodology Reflection',
        date: '2024-01-28',
        description: 'Reflected on the challenges of designing reproducible experiments and data collection strategies.',
        type: 'reflection',
      },
      {
        id: 'jm-5',
        title: 'Physics Experiment Recording',
        date: '2024-01-22',
        description: 'Recorded and analyzed a pendulum wave experiment demonstrating harmonic motion.',
        type: 'artifact',
        artifactId: 'art-3',
      },
      {
        id: 'jm-6',
        title: 'Completed Introductory Statistics Module',
        date: '2024-01-18',
        description: 'Mastered core statistical concepts including hypothesis testing and confidence intervals.',
        type: 'achievement',
      },
      {
        id: 'jm-7',
        title: 'Baseline Assessment',
        date: '2024-01-12',
        description: 'Completed initial skills assessment to establish a baseline for the research program.',
        type: 'assessment',
      },
      {
        id: 'jm-8',
        title: 'Journey Kickoff Reflection',
        date: '2024-01-08',
        description: 'Set goals and expectations for the STEM research journey. Identified key areas of interest.',
        type: 'reflection',
      },
    ],
  },
  {
    id: 'journey-2',
    title: 'Creative Writing & Literature',
    startDate: '2024-01-15',
    status: 'active',
    milestones: [
      {
        id: 'jm-9',
        title: 'Poetry Workshop Achievement',
        date: '2024-02-05',
        description: 'Received commendation for original poetry submission in the creative writing workshop.',
        type: 'achievement',
      },
      {
        id: 'jm-10',
        title: 'Sonnet Analysis Published',
        date: '2024-01-19',
        description: 'Completed and published literary analysis of Shakespeare Sonnet 18.',
        type: 'artifact',
        artifactId: 'art-7',
      },
      {
        id: 'jm-11',
        title: 'Creative Writing Assessment',
        date: '2024-01-30',
        description: 'Submitted narrative fiction piece for assessment, exploring themes of identity.',
        type: 'assessment',
      },
      {
        id: 'jm-12',
        title: 'Reading Journey Reflection',
        date: '2024-01-15',
        description: 'Reflected on reading influences and established a personal literary canon for the term.',
        type: 'reflection',
      },
    ],
  },
];

// =============================================================================
// API CLIENT
// =============================================================================

class PortfolioApiClient {
  private baseUrl: string;
  private demoMode: boolean;

  constructor() {
    this.baseUrl = `${API_BASE}/portfolio`;
    this.demoMode = DEMO_MODE;
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Artifacts
  async getArtifacts(): Promise<{ artifacts: Artifact[] }> {
    if (this.demoMode) return { artifacts: demoArtifacts };
    return this.request('GET', '/artifacts');
  }

  async getArtifact(id: string): Promise<{ artifact: Artifact }> {
    if (this.demoMode) {
      const artifact = demoArtifacts.find((a) => a.id === id);
      if (!artifact) throw new Error('Artifact not found');
      return { artifact };
    }
    return this.request('GET', `/artifacts/${id}`);
  }

  async searchArtifacts(query: string, type?: string): Promise<{ artifacts: Artifact[] }> {
    if (this.demoMode) {
      let filtered = demoArtifacts;
      if (query) {
        filtered = filtered.filter(
          (a) =>
            a.title.toLowerCase().includes(query.toLowerCase()) ||
            a.description.toLowerCase().includes(query.toLowerCase()) ||
            a.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        );
      }
      if (type && type !== 'all') {
        filtered = filtered.filter((a) => a.type === type);
      }
      return { artifacts: filtered };
    }
    return this.request('GET', `/artifacts/search?q=${encodeURIComponent(query)}&type=${type || 'all'}`);
  }

  // Goals
  async getGoals(): Promise<{ goals: LearningGoal[] }> {
    if (this.demoMode) return { goals: demoGoals };
    return this.request('GET', '/goals');
  }

  async getGoal(id: string): Promise<{ goal: LearningGoal }> {
    if (this.demoMode) {
      const goal = demoGoals.find((g) => g.id === id);
      if (!goal) throw new Error('Goal not found');
      return { goal };
    }
    return this.request('GET', `/goals/${id}`);
  }

  // Journeys
  async getJourneys(): Promise<{ journeys: LearningJourney[] }> {
    if (this.demoMode) return { journeys: demoJourneys };
    return this.request('GET', '/journeys');
  }

  async getJourney(id: string): Promise<{ journey: LearningJourney }> {
    if (this.demoMode) {
      const journey = demoJourneys.find((j) => j.id === id);
      if (!journey) throw new Error('Journey not found');
      return { journey };
    }
    return this.request('GET', `/journeys/${id}`);
  }
}

export const portfolioApi = new PortfolioApiClient();
