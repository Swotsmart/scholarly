/**
 * Admin Section Type Definitions
 * Platform administration, user management, scheduling, and system configuration
 */

// =============================================================================
// USER MANAGEMENT
// =============================================================================

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'learner' | 'teacher' | 'admin' | 'parent';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
}

// =============================================================================
// PLATFORM STATS
// =============================================================================

export interface PlatformStats {
  totalUsers: number;
  activeSessions: number;
  storageUsed: string;
  uptime: string;
}

export interface PlatformHealth {
  cpuUsage: number;
  memoryUsage: number;
  dbConnections: number;
  dbMaxConnections: number;
  responseTimeMs: number;
}

// =============================================================================
// SCHEDULING
// =============================================================================

export interface TimetableEntry {
  classCode: string;
  className: string;
  teacher: string;
  room: string;
  department: string;
}

export interface ReliefTeacher {
  id: string;
  name: string;
  qualifications: string[];
  availability: string;
  rating: number;
  status: 'available' | 'assigned' | 'unavailable';
}

export interface RoomInventory {
  id: string;
  name: string;
  type: 'classroom' | 'lab' | 'hall' | 'library' | 'studio' | 'office';
  capacity: number;
  equipment: string[];
  status: 'available' | 'occupied' | 'maintenance';
}

export interface SchedulingConstraint {
  id: string;
  name: string;
  type: 'teacher_preference' | 'room_requirement' | 'time_block';
  description: string;
  priority: 'high' | 'medium' | 'low';
  enabled: boolean;
}

// =============================================================================
// REPORTS
// =============================================================================

export interface SystemReport {
  id: string;
  name: string;
  type: string;
  generatedAt: string;
  status: 'ready' | 'generating' | 'failed';
  size: string;
}

// =============================================================================
// SETTINGS & FEATURE FLAGS
// =============================================================================

export interface FeatureFlag {
  id: string;
  name: string;
  enabled: boolean;
  description: string;
  scope: 'global' | 'tenant' | 'user';
}

export interface IntegrationService {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  icon: string;
}

// =============================================================================
// ADMIN ACTIVITY
// =============================================================================

export interface AdminActivity {
  id: string;
  action: string;
  description: string;
  user: string;
  timestamp: string;
  type: 'user' | 'config' | 'report' | 'system';
}
