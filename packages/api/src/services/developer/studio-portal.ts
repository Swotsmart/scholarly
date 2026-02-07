// =============================================================================
// SCHOLARLY PLATFORM — Storybook Studio & Developer Portal
// Sprint 4 | DT-004 + DT-005 | studio-portal.ts
// =============================================================================
// @scholarly/storybook-studio — React component library providing a
// drag-and-drop visual editor for non-technical contributors. The "no-code"
// path to creating curriculum-aligned storybooks.
//
// Developer Portal — Interactive API explorer, storybook playground,
// template gallery, and SDK tutorials. The front door to the platform
// for every developer and creator.
//
// Think of the Studio as Canva for educational storybooks — visual,
// intuitive, and accessible to anyone. The Portal is the developer
// documentation site that makes the SDK approachable.
//
// =============================================================================

// =============================================================================
// Section 1: Storybook Studio Types (DT-004)
// =============================================================================

/** Studio editor state — the complete state of the visual editor */
export interface StudioEditorState {
  project: StudioProject;
  currentPageIndex: number;
  selectedElement: string | null;
  undoStack: StudioAction[];
  redoStack: StudioAction[];
  isDirty: boolean;
  validationResults: StudioValidationResult | null;
  previewMode: 'edit' | 'preview' | 'split';
  zoom: number;
  showGrid: boolean;
  showSafeZone: boolean;
}

/** A storybook project in the Studio */
export interface StudioProject {
  id: string;
  title: string;
  phonicsPhase: number;
  targetGPCs: string[];
  taughtGPCSet: string[];
  ageRange: { min: number; max: number };
  artStyle: string;
  voicePersona: string;
  comprehensionStrand: string;
  vocabularyTier: 'Tier1' | 'Tier2' | 'Mixed';
  pages: StudioPage[];
  characters: StudioCharacter[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/** A page in the visual editor */
export interface StudioPage {
  id: string;
  pageNumber: number;
  text: string;
  textFormatting: TextFormatting;
  illustration: PageIllustration | null;
  layout: PageLayout;
  narrationOverride?: { voicePersona: string; speed: number };
}

export interface TextFormatting {
  fontSize: number;
  fontFamily: string;
  textColor: string;
  highlightColor?: string;
  alignment: 'left' | 'center' | 'right';
  lineSpacing: number;
  position: { x: number; y: number; width: number; height: number };
}

export interface PageIllustration {
  imageUrl: string;
  altText: string;
  prompt: string;
  artStyle: string;
  position: { x: number; y: number; width: number; height: number };
  layers?: Array<{ id: string; name: string; zIndex: number; opacity: number }>;
  generatedAt: Date;
}

export type PageLayout =
  | 'full_illustration_text_bottom'
  | 'full_illustration_text_top'
  | 'illustration_left_text_right'
  | 'illustration_right_text_left'
  | 'text_only'
  | 'illustration_only'
  | 'split_horizontal'
  | 'custom';

export interface StudioCharacter {
  id: string;
  name: string;
  species: string;
  description: string;
  personalityTraits: string[];
  visualDetails: string;
  styleSheetUrl?: string;
  thumbnailUrl?: string;
}

/** An undoable action in the editor */
export interface StudioAction {
  id: string;
  type: StudioActionType;
  timestamp: Date;
  pageId?: string;
  before: unknown;
  after: unknown;
}

export enum StudioActionType {
  TEXT_EDIT = 'TEXT_EDIT',
  LAYOUT_CHANGE = 'LAYOUT_CHANGE',
  ILLUSTRATION_GENERATE = 'ILLUSTRATION_GENERATE',
  ILLUSTRATION_REMOVE = 'ILLUSTRATION_REMOVE',
  CHARACTER_ADD = 'CHARACTER_ADD',
  CHARACTER_EDIT = 'CHARACTER_EDIT',
  PAGE_ADD = 'PAGE_ADD',
  PAGE_REMOVE = 'PAGE_REMOVE',
  PAGE_REORDER = 'PAGE_REORDER',
  METADATA_CHANGE = 'METADATA_CHANGE',
  FORMATTING_CHANGE = 'FORMATTING_CHANGE',
}

export interface StudioValidationResult {
  decodabilityScore: number;
  passed: boolean;
  perPageScores: Array<{ pageNumber: number; score: number; issues: string[] }>;
  overallFindings: Array<{ severity: string; message: string }>;
  validatedAt: Date;
}

// =============================================================================
// Section 2: Studio State Machine
// =============================================================================

/** All possible studio actions */
export type StudioReducerAction =
  | { type: 'SET_PAGE'; pageIndex: number }
  | { type: 'SELECT_ELEMENT'; elementId: string | null }
  | { type: 'EDIT_TEXT'; pageId: string; text: string }
  | { type: 'CHANGE_LAYOUT'; pageId: string; layout: PageLayout }
  | { type: 'SET_ILLUSTRATION'; pageId: string; illustration: PageIllustration }
  | { type: 'REMOVE_ILLUSTRATION'; pageId: string }
  | { type: 'ADD_PAGE'; afterIndex: number }
  | { type: 'REMOVE_PAGE'; pageId: string }
  | { type: 'REORDER_PAGES'; fromIndex: number; toIndex: number }
  | { type: 'ADD_CHARACTER'; character: StudioCharacter }
  | { type: 'EDIT_CHARACTER'; characterId: string; updates: Partial<StudioCharacter> }
  | { type: 'UPDATE_METADATA'; updates: Partial<StudioProject> }
  | { type: 'UPDATE_FORMATTING'; pageId: string; formatting: Partial<TextFormatting> }
  | { type: 'SET_PREVIEW_MODE'; mode: 'edit' | 'preview' | 'split' }
  | { type: 'SET_ZOOM'; zoom: number }
  | { type: 'TOGGLE_GRID' }
  | { type: 'TOGGLE_SAFE_ZONE' }
  | { type: 'SET_VALIDATION'; results: StudioValidationResult }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'MARK_SAVED' };

/**
 * Pure reducer for the Studio editor state machine.
 * Every state transition is explicit, testable, and undoable.
 */
export function studioReducer(
  state: StudioEditorState,
  action: StudioReducerAction
): StudioEditorState {
  switch (action.type) {
    case 'SET_PAGE':
      return { ...state, currentPageIndex: Math.max(0, Math.min(action.pageIndex, state.project.pages.length - 1)) };

    case 'SELECT_ELEMENT':
      return { ...state, selectedElement: action.elementId };

    case 'EDIT_TEXT': {
      const pages = state.project.pages.map(p =>
        p.id === action.pageId ? { ...p, text: action.text } : p
      );
      const before = state.project.pages.find(p => p.id === action.pageId)?.text;
      const undoAction: StudioAction = {
        id: `action-${Date.now()}`, type: StudioActionType.TEXT_EDIT,
        timestamp: new Date(), pageId: action.pageId, before, after: action.text,
      };
      return {
        ...state,
        project: { ...state.project, pages, updatedAt: new Date() },
        undoStack: [...state.undoStack, undoAction],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'CHANGE_LAYOUT': {
      const pages = state.project.pages.map(p =>
        p.id === action.pageId ? { ...p, layout: action.layout } : p
      );
      const before = state.project.pages.find(p => p.id === action.pageId)?.layout;
      const undoAction: StudioAction = {
        id: `action-${Date.now()}`, type: StudioActionType.LAYOUT_CHANGE,
        timestamp: new Date(), pageId: action.pageId, before, after: action.layout,
      };
      return {
        ...state,
        project: { ...state.project, pages, updatedAt: new Date() },
        undoStack: [...state.undoStack, undoAction],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'SET_ILLUSTRATION': {
      const pages = state.project.pages.map(p =>
        p.id === action.pageId ? { ...p, illustration: action.illustration } : p
      );
      return {
        ...state,
        project: { ...state.project, pages, updatedAt: new Date() },
        undoStack: [...state.undoStack, {
          id: `action-${Date.now()}`, type: StudioActionType.ILLUSTRATION_GENERATE,
          timestamp: new Date(), pageId: action.pageId,
          before: state.project.pages.find(p => p.id === action.pageId)?.illustration,
          after: action.illustration,
        }],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'REMOVE_ILLUSTRATION': {
      const pages = state.project.pages.map(p =>
        p.id === action.pageId ? { ...p, illustration: null } : p
      );
      return {
        ...state,
        project: { ...state.project, pages, updatedAt: new Date() },
        undoStack: [...state.undoStack, {
          id: `action-${Date.now()}`, type: StudioActionType.ILLUSTRATION_REMOVE,
          timestamp: new Date(), pageId: action.pageId,
          before: state.project.pages.find(p => p.id === action.pageId)?.illustration,
          after: null,
        }],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'ADD_PAGE': {
      const newPage: StudioPage = {
        id: `page-${Date.now()}`,
        pageNumber: action.afterIndex + 2,
        text: '',
        textFormatting: {
          fontSize: 24, fontFamily: 'OpenDyslexic', textColor: '#333333',
          alignment: 'left', lineSpacing: 1.8,
          position: { x: 0.05, y: 0.65, width: 0.9, height: 0.3 },
        },
        illustration: null,
        layout: 'full_illustration_text_bottom',
      };
      const pages = [...state.project.pages];
      pages.splice(action.afterIndex + 1, 0, newPage);
      // Renumber
      pages.forEach((p, i) => { p.pageNumber = i + 1; });

      return {
        ...state,
        project: { ...state.project, pages, updatedAt: new Date() },
        currentPageIndex: action.afterIndex + 1,
        undoStack: [...state.undoStack, {
          id: `action-${Date.now()}`, type: StudioActionType.PAGE_ADD,
          timestamp: new Date(), before: null, after: newPage,
        }],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'REMOVE_PAGE': {
      if (state.project.pages.length <= 1) return state; // Can't remove last page
      const removedPage = state.project.pages.find(p => p.id === action.pageId);
      const pages = state.project.pages.filter(p => p.id !== action.pageId);
      pages.forEach((p, i) => { p.pageNumber = i + 1; });

      return {
        ...state,
        project: { ...state.project, pages, updatedAt: new Date() },
        currentPageIndex: Math.min(state.currentPageIndex, pages.length - 1),
        undoStack: [...state.undoStack, {
          id: `action-${Date.now()}`, type: StudioActionType.PAGE_REMOVE,
          timestamp: new Date(), before: removedPage, after: null,
        }],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'REORDER_PAGES': {
      const pages = [...state.project.pages];
      const [moved] = pages.splice(action.fromIndex, 1);
      pages.splice(action.toIndex, 0, moved);
      pages.forEach((p, i) => { p.pageNumber = i + 1; });

      return {
        ...state,
        project: { ...state.project, pages, updatedAt: new Date() },
        currentPageIndex: action.toIndex,
        undoStack: [...state.undoStack, {
          id: `action-${Date.now()}`, type: StudioActionType.PAGE_REORDER,
          timestamp: new Date(), before: action.fromIndex, after: action.toIndex,
        }],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'ADD_CHARACTER': {
      return {
        ...state,
        project: {
          ...state.project,
          characters: [...state.project.characters, action.character],
          updatedAt: new Date(),
        },
        undoStack: [...state.undoStack, {
          id: `action-${Date.now()}`, type: StudioActionType.CHARACTER_ADD,
          timestamp: new Date(), before: null, after: action.character,
        }],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'EDIT_CHARACTER': {
      const before = state.project.characters.find(c => c.id === action.characterId);
      const characters = state.project.characters.map(c =>
        c.id === action.characterId ? { ...c, ...action.updates } : c
      );
      return {
        ...state,
        project: { ...state.project, characters, updatedAt: new Date() },
        undoStack: [...state.undoStack, {
          id: `action-${Date.now()}`, type: StudioActionType.CHARACTER_EDIT,
          timestamp: new Date(), before, after: action.updates,
        }],
        redoStack: [],
        isDirty: true,
      };
    }

    case 'UPDATE_METADATA':
      return {
        ...state,
        project: { ...state.project, ...action.updates, updatedAt: new Date() },
        isDirty: true,
      };

    case 'UPDATE_FORMATTING': {
      const pages = state.project.pages.map(p =>
        p.id === action.pageId
          ? { ...p, textFormatting: { ...p.textFormatting, ...action.formatting } }
          : p
      );
      return {
        ...state,
        project: { ...state.project, pages, updatedAt: new Date() },
        isDirty: true,
      };
    }

    case 'SET_PREVIEW_MODE':
      return { ...state, previewMode: action.mode };

    case 'SET_ZOOM':
      return { ...state, zoom: Math.max(0.25, Math.min(4, action.zoom)) };

    case 'TOGGLE_GRID':
      return { ...state, showGrid: !state.showGrid };

    case 'TOGGLE_SAFE_ZONE':
      return { ...state, showSafeZone: !state.showSafeZone };

    case 'SET_VALIDATION':
      return { ...state, validationResults: action.results };

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const lastAction = state.undoStack[state.undoStack.length - 1];
      // In production: apply reverse of lastAction to project
      return {
        ...state,
        undoStack: state.undoStack.slice(0, -1),
        redoStack: [...state.redoStack, lastAction],
        isDirty: true,
      };
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state;
      const redoAction = state.redoStack[state.redoStack.length - 1];
      return {
        ...state,
        undoStack: [...state.undoStack, redoAction],
        redoStack: state.redoStack.slice(0, -1),
        isDirty: true,
      };
    }

    case 'MARK_SAVED':
      return { ...state, isDirty: false };

    default:
      return state;
  }
}

/** Create initial editor state for a new project */
export function createInitialStudioState(project: StudioProject): StudioEditorState {
  return {
    project,
    currentPageIndex: 0,
    selectedElement: null,
    undoStack: [],
    redoStack: [],
    isDirty: false,
    validationResults: null,
    previewMode: 'edit',
    zoom: 1,
    showGrid: false,
    showSafeZone: true,
  };
}

// =============================================================================
// Section 3: Studio Component Registry
// =============================================================================

/**
 * Component definitions for the Studio's component library.
 * Each component can be embedded in third-party applications.
 */
export interface StudioComponent {
  name: string;
  description: string;
  props: Record<string, { type: string; required: boolean; description: string }>;
  events: Record<string, { description: string; payload: string }>;
}

export const STUDIO_COMPONENTS: StudioComponent[] = [
  {
    name: 'StorybookEditor',
    description: 'Full-featured drag-and-drop storybook editor with page management, text editing, illustration generation, and validation.',
    props: {
      project: { type: 'StudioProject', required: true, description: 'The storybook project to edit' },
      apiKey: { type: 'string', required: true, description: 'Scholarly API key for generation services' },
      onSave: { type: '(project: StudioProject) => void', required: true, description: 'Save callback' },
      theme: { type: '"light" | "dark"', required: false, description: 'Editor theme' },
      locale: { type: 'string', required: false, description: 'UI language (en, es, fr, zh, ar)' },
    },
    events: {
      onPageChange: { description: 'Fired when the active page changes', payload: '{ pageIndex: number }' },
      onValidation: { description: 'Fired when validation completes', payload: 'StudioValidationResult' },
      onGenerate: { description: 'Fired when content generation starts', payload: '{ type: "illustration" | "narration" }' },
    },
  },
  {
    name: 'PageThumbnailStrip',
    description: 'Horizontal strip of page thumbnails with drag-to-reorder support.',
    props: {
      pages: { type: 'StudioPage[]', required: true, description: 'Array of pages' },
      activeIndex: { type: 'number', required: true, description: 'Currently active page index' },
      onSelect: { type: '(index: number) => void', required: true, description: 'Page selection callback' },
      onReorder: { type: '(from: number, to: number) => void', required: true, description: 'Reorder callback' },
    },
    events: {},
  },
  {
    name: 'TextEditor',
    description: 'Rich text editor with phonics-aware features (GPC highlighting, decodability indicator, word count).',
    props: {
      text: { type: 'string', required: true, description: 'Page text content' },
      taughtGPCs: { type: 'string[]', required: true, description: 'Taught GPC set for highlighting' },
      formatting: { type: 'TextFormatting', required: true, description: 'Text formatting options' },
      onChange: { type: '(text: string) => void', required: true, description: 'Text change callback' },
    },
    events: {
      onDecodabilityChange: { description: 'Real-time decodability score update', payload: '{ score: number; nonDecodable: string[] }' },
    },
  },
  {
    name: 'IllustrationPanel',
    description: 'Illustration generation and editing panel with style selection, character placement, and scene composition.',
    props: {
      page: { type: 'StudioPage', required: true, description: 'Current page' },
      characters: { type: 'StudioCharacter[]', required: true, description: 'Available characters' },
      artStyles: { type: 'string[]', required: true, description: 'Available art styles' },
      onGenerate: { type: '(prompt: string, style: string) => void', required: true, description: 'Generation callback' },
    },
    events: {},
  },
  {
    name: 'CharacterManager',
    description: 'Character creation and style sheet management panel.',
    props: {
      characters: { type: 'StudioCharacter[]', required: true, description: 'Current characters' },
      onAdd: { type: '(character: StudioCharacter) => void', required: true, description: 'Add character callback' },
      onEdit: { type: '(id: string, updates: Partial<StudioCharacter>) => void', required: true, description: 'Edit callback' },
    },
    events: {},
  },
  {
    name: 'ValidationPanel',
    description: 'Real-time validation results display with per-page breakdown and fix suggestions.',
    props: {
      results: { type: 'StudioValidationResult | null', required: true, description: 'Validation results' },
      onValidate: { type: '() => void', required: true, description: 'Trigger validation' },
      onFix: { type: '(finding: string) => void', required: false, description: 'Apply auto-fix' },
    },
    events: {},
  },
  {
    name: 'PhonicsConstraintPanel',
    description: 'Displays and configures phonics constraints (phase, GPCs, vocabulary tier).',
    props: {
      phonicsPhase: { type: 'number', required: true, description: 'Current phase' },
      targetGPCs: { type: 'string[]', required: true, description: 'Target GPCs' },
      onChange: { type: '(updates: Partial<StudioProject>) => void', required: true, description: 'Constraint change callback' },
    },
    events: {},
  },
];

// =============================================================================
// Section 4: Developer Portal Types (DT-005)
// =============================================================================

/** API Explorer endpoint definition */
export interface APIExplorerEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  category: string;
  authentication: 'required' | 'optional' | 'none';
  parameters: APIParameter[];
  requestBody?: { contentType: string; schema: Record<string, unknown>; example: Record<string, unknown> };
  responses: Record<number, { description: string; example: Record<string, unknown> }>;
  rateLimit: { requests: number; windowSeconds: number };
}

export interface APIParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  type: string;
  required: boolean;
  description: string;
  example?: unknown;
}

/** Template gallery entry */
export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  phonicsPhase: number;
  narrativeTemplate: string;
  thumbnailUrl: string;
  previewUrl: string;
  spec: Record<string, unknown>;
  popularity: number;
  createdBy: string;
  tags: string[];
}

/** SDK tutorial definition */
export interface SDKTutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  steps: TutorialStep[];
  prerequisites: string[];
  tags: string[];
}

export interface TutorialStep {
  title: string;
  content: string;        // Markdown
  codeExample?: string;
  language?: string;
  expectedOutput?: string;
  hints?: string[];
}

// =============================================================================
// Section 5: Developer Portal Registry
// =============================================================================

/** Complete API endpoint registry for the API Explorer */
export const API_ENDPOINTS: APIExplorerEndpoint[] = [
  {
    method: 'POST', path: '/api/v1/stories/generate',
    description: 'Generate a new curriculum-constrained storybook narrative',
    category: 'Stories', authentication: 'required',
    parameters: [],
    requestBody: {
      contentType: 'application/json',
      schema: { phonicsPhase: 'number', targetGPCs: 'string[]', theme: 'string', pageCount: 'number' },
      example: { phonicsPhase: 3, targetGPCs: ['sh', 'ch', 'th'], theme: 'Ocean adventure', pageCount: 12 },
    },
    responses: {
      200: { description: 'Story generated', example: { id: 'story-123', pages: [], decodabilityScore: 0.92 } },
      400: { description: 'Invalid parameters', example: { error: 'Invalid phonics phase' } },
      429: { description: 'Rate limited', example: { error: 'Rate limit exceeded', retryAfter: 60 } },
    },
    rateLimit: { requests: 10, windowSeconds: 60 },
  },
  {
    method: 'POST', path: '/api/v1/stories/{id}/illustrate',
    description: 'Generate illustrations for an existing story',
    category: 'Stories', authentication: 'required',
    parameters: [{ name: 'id', in: 'path', type: 'string', required: true, description: 'Story ID', example: 'story-123' }],
    requestBody: {
      contentType: 'application/json',
      schema: { artStyle: 'string', characters: 'CharacterSpec[]' },
      example: { artStyle: 'soft_watercolour', characters: [] },
    },
    responses: {
      200: { description: 'Illustrations generated', example: { illustrations: [], cost: 0.48 } },
    },
    rateLimit: { requests: 5, windowSeconds: 60 },
  },
  {
    method: 'POST', path: '/api/v1/stories/{id}/narrate',
    description: 'Generate audio narration with word-level timestamps',
    category: 'Stories', authentication: 'required',
    parameters: [{ name: 'id', in: 'path', type: 'string', required: true, description: 'Story ID' }],
    requestBody: {
      contentType: 'application/json',
      schema: { voicePersona: 'string', speed: 'number' },
      example: { voicePersona: 'storytime_sarah' },
    },
    responses: {
      200: { description: 'Narration generated', example: { durationMs: 120000, wordTimestamps: [] } },
    },
    rateLimit: { requests: 5, windowSeconds: 60 },
  },
  {
    method: 'POST', path: '/api/v1/stories/{id}/validate',
    description: 'Validate decodability, safety, and curriculum alignment',
    category: 'Stories', authentication: 'required',
    parameters: [{ name: 'id', in: 'path', type: 'string', required: true, description: 'Story ID' }],
    responses: {
      200: { description: 'Validation results', example: { decodabilityScore: 0.91, passed: true, findings: [] } },
    },
    rateLimit: { requests: 20, windowSeconds: 60 },
  },
  {
    method: 'POST', path: '/api/v1/stories/{id}/submit',
    description: 'Submit storybook to the community review pipeline',
    category: 'Stories', authentication: 'required',
    parameters: [{ name: 'id', in: 'path', type: 'string', required: true, description: 'Story ID' }],
    responses: {
      200: { description: 'Submitted for review', example: { reviewId: 'rev-abc', stage: 'AUTOMATED_VALIDATION' } },
    },
    rateLimit: { requests: 3, windowSeconds: 3600 },
  },
  {
    method: 'GET', path: '/api/v1/stories/{id}/analytics',
    description: 'Retrieve reading performance analytics for a published storybook',
    category: 'Analytics', authentication: 'required',
    parameters: [
      { name: 'id', in: 'path', type: 'string', required: true, description: 'Story ID' },
      { name: 'period', in: 'query', type: 'string', required: false, description: 'Time period (7d, 30d, 90d)', example: '30d' },
    ],
    responses: {
      200: { description: 'Analytics data', example: { reads: 1520, completionRate: 0.82, avgAccuracy: 0.91 } },
    },
    rateLimit: { requests: 30, windowSeconds: 60 },
  },
  {
    method: 'GET', path: '/api/v1/library/search',
    description: 'Search the storybook library with phonics phase and theme filters',
    category: 'Library', authentication: 'optional',
    parameters: [
      { name: 'phase', in: 'query', type: 'number', required: false, description: 'Phonics phase filter' },
      { name: 'theme', in: 'query', type: 'string', required: false, description: 'Theme keyword' },
      { name: 'ageMin', in: 'query', type: 'number', required: false, description: 'Minimum age' },
      { name: 'limit', in: 'query', type: 'number', required: false, description: 'Max results', example: 20 },
    ],
    responses: {
      200: { description: 'Search results', example: { results: [], total: 42 } },
    },
    rateLimit: { requests: 60, windowSeconds: 60 },
  },
  {
    method: 'GET', path: '/api/v1/library/recommend',
    description: 'Get personalised storybook recommendations for a learner',
    category: 'Library', authentication: 'required',
    parameters: [
      { name: 'learnerId', in: 'query', type: 'string', required: true, description: 'Learner ID' },
      { name: 'limit', in: 'query', type: 'number', required: false, description: 'Max results' },
    ],
    responses: {
      200: { description: 'Recommendations', example: { recommendations: [], reason: 'Based on mastery profile' } },
    },
    rateLimit: { requests: 30, windowSeconds: 60 },
  },
  {
    method: 'POST', path: '/api/v1/characters',
    description: 'Create a character style sheet for illustration consistency',
    category: 'Characters', authentication: 'required',
    parameters: [],
    requestBody: {
      contentType: 'application/json',
      schema: { name: 'string', species: 'string', visualDetails: 'string' },
      example: { name: 'Pip', species: 'dog', visualDetails: 'Golden retriever with red collar' },
    },
    responses: {
      201: { description: 'Character created', example: { id: 'char-abc', styleSheetUrl: '/sheets/char-abc.png' } },
    },
    rateLimit: { requests: 10, windowSeconds: 60 },
  },
  {
    method: 'GET', path: '/api/v1/gpcs/taught/{learnerId}',
    description: 'Get a learner\'s currently taught GPC set',
    category: 'Phonics', authentication: 'required',
    parameters: [{ name: 'learnerId', in: 'path', type: 'string', required: true, description: 'Learner ID' }],
    responses: {
      200: { description: 'Taught GPC set', example: { phase: 3, gpcs: ['s', 'a', 't', 'sh', 'ch'] } },
    },
    rateLimit: { requests: 30, windowSeconds: 60 },
  },
];

/** SDK Tutorials for the Developer Portal */
export const SDK_TUTORIALS: SDKTutorial[] = [
  {
    id: 'tut-first-storybook',
    title: 'Create Your First Decodable Storybook',
    description: 'Learn how to generate a curriculum-aligned storybook using the Scholarly Content SDK.',
    difficulty: 'beginner',
    estimatedMinutes: 15,
    prerequisites: ['Node.js 18+', 'Scholarly API key'],
    tags: ['getting-started', 'sdk', 'generation'],
    steps: [
      {
        title: 'Install the SDK',
        content: 'Install the Scholarly Content SDK from npm.',
        codeExample: 'npm install @scholarly/content-sdk',
        language: 'bash',
      },
      {
        title: 'Initialise the client',
        content: 'Create a client instance with your API key.',
        codeExample: `import { ScholarlyClient } from '@scholarly/content-sdk';\n\nconst client = new ScholarlyClient({ apiKey: 'your-api-key' });`,
        language: 'typescript',
      },
      {
        title: 'Generate a story',
        content: 'Generate a Phase 2 storybook about pets.',
        codeExample: `const story = await client.stories.generate({\n  phonicsPhase: 2,\n  targetGPCs: ['s', 'a', 't', 'p'],\n  theme: 'Pets',\n  pageCount: 8,\n});`,
        language: 'typescript',
        expectedOutput: '{ id: "story-abc", pages: [...], decodabilityScore: 0.92 }',
      },
      {
        title: 'Validate the story',
        content: 'Run validation to check decodability and safety.',
        codeExample: `const report = await client.stories.validate(story.id);`,
        language: 'typescript',
      },
    ],
  },
  {
    id: 'tut-custom-generator',
    title: 'Build a Custom Story Generator for Your Classroom',
    description: 'Create a script that generates stories tailored to your specific learner group.',
    difficulty: 'intermediate',
    estimatedMinutes: 30,
    prerequisites: ['tut-first-storybook'],
    tags: ['automation', 'classroom', 'batch'],
    steps: [
      {
        title: 'Define your learner profiles',
        content: 'Query the taught GPC sets for your learners.',
        codeExample: `const learners = ['learner-1', 'learner-2'];\nconst profiles = await Promise.all(\n  learners.map(id => client.gpcs.getTaught(id))\n);`,
        language: 'typescript',
      },
      {
        title: 'Find common GPCs',
        content: 'Compute the intersection of taught GPCs for group activities.',
        codeExample: `const commonGPCs = profiles.reduce(\n  (acc, p) => acc.filter(g => p.gpcs.includes(g)),\n  profiles[0].gpcs\n);`,
        language: 'typescript',
      },
      {
        title: 'Generate targeted stories',
        content: 'Create stories that all learners in the group can read.',
        codeExample: `const story = await client.stories.generate({\n  phonicsPhase: Math.min(...profiles.map(p => p.phase)),\n  targetGPCs: commonGPCs.slice(0, 5),\n  theme: 'Australian animals',\n  pageCount: 10,\n});`,
        language: 'typescript',
      },
    ],
  },
  {
    id: 'tut-validation-pipeline',
    title: 'Set Up a Validation Pipeline',
    description: 'Use the standalone validator to check stories before submission.',
    difficulty: 'beginner',
    estimatedMinutes: 10,
    prerequisites: ['Node.js 18+'],
    tags: ['validation', 'quality'],
    steps: [
      {
        title: 'Install the validator',
        content: 'The validator is a standalone, zero-dependency package.',
        codeExample: 'npm install @scholarly/content-validator',
        language: 'bash',
      },
      {
        title: 'Validate a story',
        content: 'Check decodability, vocabulary, and safety offline.',
        codeExample: `import { ContentValidator } from '@scholarly/content-validator';\n\nconst validator = new ContentValidator();\nconst report = validator.validateComprehensive({\n  text: 'Sam sat on a mat.',\n  taughtGPCs: ['s', 'a', 't', 'm', 'n', 'o'],\n  phonicsPhase: 2,\n});\nconsole.log(report.decodability.score); // 1.0`,
        language: 'typescript',
      },
    ],
  },
];

/** Story templates for the Template Gallery */
export const STORY_TEMPLATES: StoryTemplate[] = [
  {
    id: 'tmpl-phase2-pets', name: 'Phase 2: Pet Friends',
    description: 'A simple friendship story using Phase 2 GPCs', phonicsPhase: 2,
    narrativeTemplate: 'FRIENDSHIP_STORY', thumbnailUrl: '/templates/phase2-pets.png',
    previewUrl: '/templates/phase2-pets-preview', popularity: 245,
    createdBy: 'scholarly-team', tags: ['phase-2', 'pets', 'friendship', 'starter'],
    spec: { targetGPCs: ['s', 'a', 't', 'p', 'd', 'g'], pageCount: 8, artStyle: 'soft_watercolour' },
  },
  {
    id: 'tmpl-phase3-ocean', name: 'Phase 3: Ocean Journey',
    description: 'An adventure story targeting digraphs and long vowels', phonicsPhase: 3,
    narrativeTemplate: 'JOURNEY_STORY', thumbnailUrl: '/templates/phase3-ocean.png',
    previewUrl: '/templates/phase3-ocean-preview', popularity: 189,
    createdBy: 'scholarly-team', tags: ['phase-3', 'ocean', 'adventure', 'digraphs'],
    spec: { targetGPCs: ['sh', 'ch', 'th', 'igh', 'ee'], pageCount: 12, artStyle: 'watercolour_dreamlike' },
  },
  {
    id: 'tmpl-phase4-camping', name: 'Phase 4: Camping Adventure',
    description: 'CCVC/CVCC words in a nature setting', phonicsPhase: 4,
    narrativeTemplate: 'JOURNEY_STORY', thumbnailUrl: '/templates/phase4-camping.png',
    previewUrl: '/templates/phase4-camping-preview', popularity: 156,
    createdBy: 'scholarly-team', tags: ['phase-4', 'nature', 'consonant-clusters'],
    spec: { targetGPCs: ['ch', 'sh', 'th', 'ng'], pageCount: 14, artStyle: 'detailed_storybook' },
  },
  {
    id: 'tmpl-phase5-space', name: 'Phase 5: Space Rescue',
    description: 'Split digraphs and alternative spellings in space', phonicsPhase: 5,
    narrativeTemplate: 'HEROS_JOURNEY', thumbnailUrl: '/templates/phase5-space.png',
    previewUrl: '/templates/phase5-space-preview', popularity: 198,
    createdBy: 'scholarly-team', tags: ['phase-5', 'space', 'split-digraphs'],
    spec: { targetGPCs: ['a_e', 'i_e', 'o_e', 'u_e'], pageCount: 16, artStyle: 'sci_fi_illustration' },
  },
  {
    id: 'tmpl-info-text', name: 'Information Text Template',
    description: 'Non-fiction with narrative framing for any phase', phonicsPhase: 3,
    narrativeTemplate: 'INFORMATION_TEXT', thumbnailUrl: '/templates/info-text.png',
    previewUrl: '/templates/info-text-preview', popularity: 112,
    createdBy: 'scholarly-team', tags: ['non-fiction', 'information', 'adaptable'],
    spec: { pageCount: 10, artStyle: 'flat_vector' },
  },
];

// =============================================================================
// Section 6: Factory Functions
// =============================================================================

export function createStudioProject(overrides?: Partial<StudioProject>): StudioProject {
  const defaultPage: StudioPage = {
    id: 'page-1', pageNumber: 1, text: '',
    textFormatting: {
      fontSize: 24, fontFamily: 'OpenDyslexic', textColor: '#333333',
      alignment: 'left', lineSpacing: 1.8,
      position: { x: 0.05, y: 0.65, width: 0.9, height: 0.3 },
    },
    illustration: null, layout: 'full_illustration_text_bottom',
  };

  return {
    id: `project-${Date.now()}`,
    title: 'Untitled Storybook',
    phonicsPhase: 2,
    targetGPCs: [],
    taughtGPCSet: [],
    ageRange: { min: 4, max: 6 },
    artStyle: 'soft_watercolour',
    voicePersona: 'storytime_sarah',
    comprehensionStrand: 'vocabulary',
    vocabularyTier: 'Tier1',
    pages: [defaultPage],
    characters: [],
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// =============================================================================
// End of studio-portal.ts
// =============================================================================
