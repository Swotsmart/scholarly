/**
 * Scholarly Unified Communications 4.0 — CRM Connector Type System
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE UNIVERSAL PLUG ADAPTER FOR CUSTOMER DATA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Every CRM speaks its own dialect: Salesforce calls them "Leads" and
 * "Opportunities"; HubSpot calls them "Contacts" and "Deals"; Zoho has
 * "Potentials"; Dynamics has "Accounts". But underneath, they're all
 * tracking the same thing: people, companies, conversations, and revenue.
 *
 * These types define a universal vocabulary that any CRM adapter can
 * translate to and from. Think of it like USB-C: you don't need to know
 * whether the device on the other end is a phone, a laptop, or a monitor.
 * You just need to know the connector shape.
 *
 * The CrmProvider interface is the contract. Any CRM adapter that
 * implements it can be plugged into the UC platform and will automatically:
 *   - Receive screen pop data when calls arrive
 *   - Log call activities when interactions complete
 *   - Enable click-to-dial from CRM contact records
 *   - Sync contact data bidirectionally
 */

// ─── CRM Entities (Universal) ───────────────────────────────────────

export interface CrmContact {
  /** CRM-native ID (e.g., Salesforce record ID, HubSpot contact ID) */
  id: string;
  /** Provider name (salesforce, hubspot, zoho, etc.) */
  provider: string;
  firstName?: string;
  lastName?: string;
  displayName: string;
  email?: string;
  phone?: string;
  mobilePhone?: string;
  company?: string;
  title?: string;
  /** Account/Company ID in the CRM */
  accountId?: string;
  accountName?: string;
  /** Owner (assigned agent/sales rep) in the CRM */
  ownerId?: string;
  ownerName?: string;
  /** Lead status or lifecycle stage */
  stage?: string;
  /** Custom fields from the CRM */
  customFields?: Record<string, unknown>;
  /** Tags/labels */
  tags?: string[];
  /** Timestamps */
  createdAt?: string;
  updatedAt?: string;
  /** Full CRM URL to open this contact's record */
  recordUrl?: string;
}

export interface CrmAccount {
  id: string;
  provider: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  billingAddress?: CrmAddress;
  /** Number of employees */
  size?: string;
  /** Annual revenue */
  revenue?: number;
  ownerId?: string;
  ownerName?: string;
  customFields?: Record<string, unknown>;
  recordUrl?: string;
}

export interface CrmAddress {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface CrmActivity {
  /** CRM-native activity ID (returned after logging) */
  id?: string;
  provider?: string;
  /** Activity type */
  type: 'CALL' | 'EMAIL' | 'MEETING' | 'TASK' | 'NOTE' | 'CHAT' | 'SMS';
  /** Activity subject/title */
  subject: string;
  /** Description/body */
  description: string;
  /** Call direction for CALL type */
  direction?: 'INBOUND' | 'OUTBOUND';
  /** Duration in seconds */
  durationSeconds?: number;
  /** Call disposition/outcome */
  disposition?: string;
  /** Associated CRM contact ID */
  contactId?: string;
  /** Associated CRM account ID */
  accountId?: string;
  /** Associated CRM deal/opportunity ID */
  dealId?: string;
  /** Agent/user who performed the activity */
  agentUserId?: string;
  /** CRM user ID of the agent (mapped from UC user) */
  crmUserId?: string;
  /** When the activity occurred */
  activityDate: string;
  /** Custom fields */
  customFields?: Record<string, unknown>;
  /** UC platform references for cross-linking */
  ucReferences?: {
    callId?: string;
    interactionId?: string;
    queueId?: string;
    recordingUrl?: string;
    transcriptUrl?: string;
  };
}

export interface CrmDeal {
  id: string;
  provider: string;
  name: string;
  stage: string;
  amount?: number;
  currency?: string;
  contactId?: string;
  accountId?: string;
  ownerId?: string;
  closeDate?: string;
  customFields?: Record<string, unknown>;
  recordUrl?: string;
}

// ─── Screen Pop Data ────────────────────────────────────────────────

/**
 * Screen pop: the data bundle delivered to an agent's screen the instant
 * a call arrives. Think of it as the caller's dossier — pulled from the
 * CRM in real time so the agent knows who they're talking to before
 * they even say hello.
 */
export interface ScreenPopData {
  /** The identifier used for lookup (phone number, email, etc.) */
  lookupKey: string;
  lookupType: 'PHONE' | 'EMAIL' | 'CRM_ID' | 'CUSTOM';
  /** Whether a CRM match was found */
  matched: boolean;
  /** Matched contact (if found) */
  contact?: CrmContact;
  /** Associated account */
  account?: CrmAccount;
  /** Open deals/opportunities */
  openDeals?: CrmDeal[];
  /** Recent activity history */
  recentActivities?: CrmActivity[];
  /** Previous interactions logged by this platform */
  previousInteractions?: {
    totalCalls: number;
    lastCallDate?: string;
    lastCallAgent?: string;
    lastCallDisposition?: string;
    averageHandleTime?: number;
  };
  /** Suggested actions for the agent */
  suggestions?: string[];
  /** Time taken to fetch this data (ms) */
  fetchDurationMs: number;
  /** Which provider(s) contributed data */
  providers: string[];
  /** Timestamp */
  fetchedAt: string;
}

// ─── Click-to-Dial ──────────────────────────────────────────────────

export interface ClickToDialRequest {
  /** Phone number to dial */
  phoneNumber: string;
  /** CRM contact ID (for auto-association) */
  contactId?: string;
  /** CRM account ID */
  accountId?: string;
  /** CRM deal ID (for context) */
  dealId?: string;
  /** Agent making the call */
  agentUserId: string;
  /** Tenant */
  tenantId: string;
  /** Custom metadata to attach to the call record */
  metadata?: Record<string, unknown>;
}

export interface ClickToDialResult {
  /** Whether the call was initiated */
  success: boolean;
  /** Call ID in the UC platform */
  callId?: string;
  /** Error message if failed */
  error?: string;
  /** Screen pop data for the contact being called */
  screenPop?: ScreenPopData;
}

// ─── Provider Configuration ─────────────────────────────────────────

export interface CrmProviderConfig {
  /** Provider identifier */
  provider: 'salesforce' | 'hubspot' | 'zoho' | 'dynamics' | 'pipedrive' | 'custom';
  /** Display name */
  name: string;
  /** Whether this provider is active */
  isActive: boolean;
  /** Tenant this configuration belongs to */
  tenantId: string;
  /** OAuth credentials */
  auth: CrmOAuthConfig | CrmApiKeyConfig;
  /** Field mapping: CRM field names → universal field names */
  fieldMapping?: Record<string, string>;
  /** Which events trigger auto-logging */
  autoLogEvents: CrmAutoLogEvent[];
  /** Default disposition options for this CRM */
  dispositions?: string[];
  /** Sync settings */
  sync: {
    /** Bidirectional contact sync enabled */
    contactSyncEnabled: boolean;
    /** Sync interval in minutes (0 = real-time only) */
    syncIntervalMinutes: number;
    /** Conflict resolution: CRM wins or UC wins */
    conflictResolution: 'crm-wins' | 'uc-wins' | 'newest-wins';
  };
}

export interface CrmOAuthConfig {
  type: 'oauth2';
  clientId: string;
  clientSecret: string;
  accessToken?: string;
  refreshToken?: string;
  tokenUrl: string;
  authorizeUrl: string;
  scopes: string[];
  instanceUrl?: string; // Salesforce-specific
  expiresAt?: string;
}

export interface CrmApiKeyConfig {
  type: 'api_key';
  apiKey: string;
  baseUrl?: string;
}

export type CrmAutoLogEvent =
  | 'call:completed'
  | 'call:missed'
  | 'call:voicemail'
  | 'queue:entry-completed'
  | 'agent:wrap-up-completed'
  | 'chat:conversation-ended'
  | 'meeting:ended';

// ─── Agent ↔ CRM User Mapping ──────────────────────────────────────

export interface AgentCrmMapping {
  id: string;
  /** UC platform agent/user ID */
  ucUserId: string;
  /** CRM user/owner ID */
  crmUserId: string;
  /** CRM provider */
  provider: string;
  /** CRM user's email (for lookup) */
  crmUserEmail?: string;
  tenantId: string;
  createdAt: string;
}

// ─── Provider Interface ─────────────────────────────────────────────

/**
 * The contract that every CRM adapter must implement. Think of this as
 * the USB-C specification: any device that implements it can plug in
 * and work. The framework handles the when and why; the provider
 * handles the how.
 */
export interface CrmProvider {
  /** Unique provider identifier */
  readonly providerId: string;
  /** Human-readable name */
  readonly providerName: string;

  /** Initialize the provider with config (OAuth token refresh, etc.) */
  initialize(config: CrmProviderConfig): Promise<void>;

  /** Test connectivity (verify credentials, check API access) */
  testConnection(): Promise<{ connected: boolean; error?: string; details?: string }>;

  // ── Contact Lookup ──────────────────────────────────────────────
  /** Look up a contact by phone number */
  lookupByPhone(phone: string): Promise<CrmContact | null>;
  /** Look up a contact by email */
  lookupByEmail(email: string): Promise<CrmContact | null>;
  /** Look up a contact by CRM ID */
  lookupById(id: string): Promise<CrmContact | null>;
  /** Search contacts by query string */
  searchContacts(query: string, limit?: number): Promise<CrmContact[]>;

  // ── Account Lookup ──────────────────────────────────────────────
  /** Get account by ID */
  getAccount(id: string): Promise<CrmAccount | null>;

  // ── Activity Logging ────────────────────────────────────────────
  /** Log a call/activity to the CRM */
  logActivity(activity: CrmActivity): Promise<{ id: string; success: boolean; error?: string }>;

  // ── Deal Lookup ─────────────────────────────────────────────────
  /** Get open deals for a contact */
  getOpenDeals(contactId: string): Promise<CrmDeal[]>;

  // ── Recent Activities ───────────────────────────────────────────
  /** Get recent activities for a contact */
  getRecentActivities(contactId: string, limit?: number): Promise<CrmActivity[]>;

  // ── User Mapping ────────────────────────────────────────────────
  /** Look up CRM user by email (for agent mapping) */
  lookupUserByEmail(email: string): Promise<{ id: string; name: string; email: string } | null>;

  /** Shutdown/cleanup */
  shutdown(): Promise<void>;
}

// ─── Events ─────────────────────────────────────────────────────────

export interface CrmEventPayloads {
  'crm:screen-pop-requested': { lookupKey: string; lookupType: string; agentId: string; tenantId: string };
  'crm:screen-pop-delivered': { lookupKey: string; matched: boolean; provider: string; fetchDurationMs: number; tenantId: string };
  'crm:activity-logged': { activityId: string; type: string; provider: string; contactId?: string; tenantId: string };
  'crm:activity-log-failed': { error: string; provider: string; tenantId: string };
  'crm:click-to-dial': { phoneNumber: string; contactId?: string; agentUserId: string; tenantId: string };
  'crm:contact-synced': { contactId: string; provider: string; direction: 'to-crm' | 'from-crm'; tenantId: string };
  'crm:provider-connected': { provider: string; tenantId: string };
  'crm:provider-disconnected': { provider: string; error?: string; tenantId: string };
  'crm:provider-error': { provider: string; operation: string; error: string; tenantId: string };
}
