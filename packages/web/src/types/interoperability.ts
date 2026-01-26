/**
 * Interoperability Type Definitions
 * 1EdTech (LTI, OneRoster, CASE, Open Badges, CLR) and Ed-Fi standards
 */

// =============================================================================
// LTI ADVANTAGE 1.3
// =============================================================================

export interface LTIPlatform {
  id: string;
  name: string;
  issuer: string;
  clientId: string;
  deploymentId: string;
  status: 'active' | 'inactive';
  toolCount: number;
  lastActivity: string;
}

export interface LTITool {
  id: string;
  name: string;
  launchUrl: string;
  platformId: string;
  scopes: string[];
  status: 'active' | 'inactive';
}

// =============================================================================
// ONEROSTER 1.2
// =============================================================================

export interface OneRosterConnection {
  id: string;
  name: string;
  baseUrl: string;
  syncDirection: 'inbound' | 'outbound' | 'bidirectional';
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  recordCount: number;
}

export interface OneRosterSyncJob {
  id: string;
  connectionId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  resourceType: string;
  recordsProcessed: number;
  recordsTotal: number;
  startedAt: string;
  completedAt?: string;
  errors: number;
}

// =============================================================================
// CASE NETWORK
// =============================================================================

export interface CASEFramework {
  id: string;
  title: string;
  creator: string;
  version: string;
  itemCount: number;
  status: 'imported' | 'draft' | 'published';
  lastUpdated: string;
}

export interface CASEItem {
  id: string;
  humanCodingScheme: string;
  fullStatement: string;
  type: string;
  level: number;
  children?: CASEItem[];
}

// =============================================================================
// OPEN BADGES & CLR
// =============================================================================

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  criteria: string;
  image: string;
  category: string;
  issuedCount: number;
  status: 'active' | 'draft' | 'archived';
}

export interface BadgeAssertion {
  id: string;
  badgeId: string;
  badgeName: string;
  recipientName: string;
  issuedAt: string;
  verified: boolean;
  onChain: boolean;
}

// =============================================================================
// ED-FI ODS/API
// =============================================================================

export interface EdFiConnection {
  id: string;
  districtName: string;
  baseUrl: string;
  apiVersion: string;
  status: 'connected' | 'disconnected' | 'error';
  lastSync: string;
  syncDirection: 'inbound' | 'outbound' | 'bidirectional';
}

export interface EdFiSyncJob {
  id: string;
  connectionId: string;
  direction: string;
  resourceType: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsTotal: number;
  conflicts: number;
  startedAt: string;
}

export interface EdFiConflict {
  id: string;
  jobId: string;
  resourceType: string;
  fieldName: string;
  localValue: string;
  remoteValue: string;
  status: 'unresolved' | 'resolved_local' | 'resolved_remote';
  createdAt: string;
}
