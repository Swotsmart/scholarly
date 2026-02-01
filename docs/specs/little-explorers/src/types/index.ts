/**
 * Little Explorers - Type Definitions Index
 * 
 * Central export point for all type definitions used throughout
 * the Little Explorers Early Years Education platform.
 * 
 * @module LittleExplorers/Types
 * @version 1.0.0
 */

// Core types
export * from './core.types';

// Domain types
export * from './behaviour.types';
export * from './communication.types';
export * from './portfolio.types';
export * from './ai.types';

// Re-export commonly used types for convenience
export type {
  // Core
  Result,
  School,
  Classroom,
  Student,
  Parent,
  Teacher,
  
  // Behaviour
  ExplorerPoint,
  BehaviourSkill,
  AIPointSuggestion,
  Celebration,
  GroupAward,
  
  // Communication
  StoryPost,
  Message,
  Conversation,
  CalendarEvent,
  EmergencyAlert,
  Notification,
  
  // Portfolio
  PortfolioItem,
  PortfolioActivity,
  ActivityResponse,
  TeacherObservation,
  StudentMilestone,
  PortfolioReport,
  
  // AI
  AIContext,
  AIProviderConfig,
  AIService
} from './index';
