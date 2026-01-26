/**
 * 1EdTech & Ed-Fi Type Definitions
 *
 * Comprehensive types for:
 * - LTI Advantage (LTI 1.3): Platform/tool registration, OIDC, AGS, NRPS, Deep Linking
 * - OneRoster 1.2: REST consumer/provider, delta sync, bulk CSV
 * - CASE (Competency & Academic Standards Exchange): Frameworks, items, associations
 * - CLR 2.0 / Open Badges 3.0: Achievements, badges, verifiable credentials
 * - Ed-Fi ODS/API v7: Bidirectional sync engine, field mapping, conflict resolution
 */

// ============================================================================
// LTI ADVANTAGE (LTI 1.3)
// ============================================================================

export type LTIPlatformStatus = 'active' | 'inactive' | 'pending_validation';

export interface LTIPlatform {
  id: string;
  tenantId: string;
  name: string;
  issuer: string;
  clientId: string;
  deploymentId: string;
  oidcAuthUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  publicKey?: string;
  privateKey?: string;
  keyId?: string;
  accessTokenUrl?: string;
  scopes: string[];
  status: LTIPlatformStatus;
  lastKeyRotation?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface LTITool {
  id: string;
  tenantId: string;
  platformId: string;
  name: string;
  description?: string;
  launchUrl: string;
  loginUrl: string;
  redirectUrls: string[];
  deepLinkUrl?: string;
  customParameters: Record<string, string>;
  scopes: LTIScope[];
  iconUrl?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export type LTIScope =
  | 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem'
  | 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly'
  | 'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly'
  | 'https://purl.imsglobal.org/spec/lti-ags/scope/score'
  | 'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly'
  | 'https://purl.imsglobal.org/spec/lti-dl/scope/content-item';

export interface LTIOIDCLoginRequest {
  iss: string;
  login_hint: string;
  target_link_uri: string;
  lti_message_hint?: string;
  lti_deployment_id?: string;
  client_id?: string;
}

export interface LTIOIDCState {
  id: string;
  state: string;
  nonce: string;
  platformId: string;
  loginHint: string;
  targetLinkUri: string;
  ltiMessageHint?: string;
  createdAt: Date;
  expiresAt: Date;
  consumed: boolean;
}

export interface LTIIDTokenClaims {
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nonce: string;
  azp?: string;
  'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest' | 'LtiDeepLinkingRequest';
  'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0';
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id': string;
  'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': string;
  'https://purl.imsglobal.org/spec/lti/claim/resource_link'?: {
    id: string;
    title?: string;
    description?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/context'?: {
    id: string;
    type?: string[];
    label?: string;
    title?: string;
  };
  'https://purl.imsglobal.org/spec/lti/claim/roles'?: string[];
  'https://purl.imsglobal.org/spec/lti/claim/custom'?: Record<string, string>;
  'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'?: DeepLinkingSettings;
  name?: string;
  given_name?: string;
  family_name?: string;
  email?: string;
  picture?: string;
  locale?: string;
}

export interface DeepLinkingSettings {
  deep_link_return_url: string;
  accept_types: string[];
  accept_presentation_document_targets: string[];
  accept_media_types?: string;
  accept_multiple?: boolean;
  auto_create?: boolean;
  title?: string;
  text?: string;
  data?: string;
}

export type DeepLinkContentItemType = 'ltiResourceLink' | 'link' | 'file' | 'html' | 'image';

export interface DeepLinkContentItem {
  type: DeepLinkContentItemType;
  title?: string;
  text?: string;
  url?: string;
  icon?: { url: string; width?: number; height?: number };
  thumbnail?: { url: string; width?: number; height?: number };
  custom?: Record<string, string>;
  lineItem?: {
    scoreMaximum: number;
    label?: string;
    resourceId?: string;
    tag?: string;
  };
  // For ltiResourceLink
  iframe?: { width?: number; height?: number };
  window?: { targetName?: string; width?: number; height?: number };
  // For html
  html?: string;
  // For file
  mediaType?: string;
  expiresAt?: string;
}

// AGS (Assignment & Grade Services)
export interface AGSLineItem {
  id?: string;
  scoreMaximum: number;
  label: string;
  resourceId?: string;
  resourceLinkId?: string;
  tag?: string;
  startDateTime?: string;
  endDateTime?: string;
  gradesReleased?: boolean;
}

export interface AGSScore {
  userId: string;
  scoreGiven?: number;
  scoreMaximum?: number;
  comment?: string;
  timestamp: string;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
}

export interface AGSResult {
  id: string;
  userId: string;
  resultScore?: number;
  resultMaximum?: number;
  comment?: string;
  scoreOf: string;
}

// NRPS (Names & Role Provisioning Service)
export interface NRPSMember {
  status: 'Active' | 'Inactive' | 'Deleted';
  name?: string;
  givenName?: string;
  familyName?: string;
  email?: string;
  picture?: string;
  userId: string;
  roles: string[];
  ltiCustom?: Record<string, string>;
  message?: LTIIDTokenClaims[];
}

export interface NRPSContext {
  id: string;
  label?: string;
  title?: string;
}

export interface NRPSMembershipContainer {
  id: string;
  context: NRPSContext;
  members: NRPSMember[];
}

// ============================================================================
// ONEROSTER 1.2
// ============================================================================

export type OneRosterStatus = 'active' | 'tobedeleted' | 'inactive';
export type OneRosterRoleType = 'administrator' | 'aide' | 'guardian' | 'parent' | 'proctor' | 'relative' | 'student' | 'teacher';
export type OneRosterGrade = 'IT' | 'PR' | 'PK' | 'TK' | 'KG' | '01' | '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | '11' | '12' | '13' | 'PS' | 'UG' | 'Other';

export interface OneRosterGUIDRef {
  href: string;
  sourcedId: string;
  type: string;
}

export interface OneRosterOrg {
  sourcedId: string;
  status: OneRosterStatus;
  dateLastModified: string;
  metadata?: Record<string, unknown>;
  name: string;
  type: 'department' | 'school' | 'district' | 'local' | 'state' | 'national';
  identifier?: string;
  parent?: OneRosterGUIDRef;
  children?: OneRosterGUIDRef[];
}

export interface OneRosterAcademicSession {
  sourcedId: string;
  status: OneRosterStatus;
  dateLastModified: string;
  metadata?: Record<string, unknown>;
  title: string;
  type: 'gradingPeriod' | 'semester' | 'schoolYear' | 'term';
  startDate: string;
  endDate: string;
  parent?: OneRosterGUIDRef;
  children?: OneRosterGUIDRef[];
  schoolYear: string;
}

export interface OneRosterCourse {
  sourcedId: string;
  status: OneRosterStatus;
  dateLastModified: string;
  metadata?: Record<string, unknown>;
  title: string;
  schoolYear?: OneRosterGUIDRef;
  courseCode?: string;
  grades?: OneRosterGrade[];
  subjects?: string[];
  org?: OneRosterGUIDRef;
  subjectCodes?: string[];
}

export interface OneRosterClass {
  sourcedId: string;
  status: OneRosterStatus;
  dateLastModified: string;
  metadata?: Record<string, unknown>;
  title: string;
  classCode?: string;
  classType: 'homeroom' | 'scheduled';
  location?: string;
  grades?: OneRosterGrade[];
  subjects?: string[];
  course?: OneRosterGUIDRef;
  school?: OneRosterGUIDRef;
  terms?: OneRosterGUIDRef[];
  subjectCodes?: string[];
  periods?: string[];
}

export interface OneRosterUser {
  sourcedId: string;
  status: OneRosterStatus;
  dateLastModified: string;
  metadata?: Record<string, unknown>;
  enabledUser: boolean;
  username?: string;
  userIds?: Array<{ type: string; identifier: string }>;
  givenName: string;
  familyName: string;
  middleName?: string;
  role: OneRosterRoleType;
  identifier?: string;
  email?: string;
  sms?: string;
  phone?: string;
  agents?: OneRosterGUIDRef[];
  orgs?: OneRosterGUIDRef[];
  grades?: OneRosterGrade[];
  password?: string;
}

export interface OneRosterEnrollment {
  sourcedId: string;
  status: OneRosterStatus;
  dateLastModified: string;
  metadata?: Record<string, unknown>;
  user: OneRosterGUIDRef;
  class: OneRosterGUIDRef;
  school: OneRosterGUIDRef;
  role: 'administrator' | 'aide' | 'proctor' | 'student' | 'teacher';
  primary?: boolean;
  beginDate?: string;
  endDate?: string;
}

export interface OneRosterDemographic {
  sourcedId: string;
  status: OneRosterStatus;
  dateLastModified: string;
  metadata?: Record<string, unknown>;
  birthDate?: string;
  sex?: 'male' | 'female';
  americanIndianOrAlaskaNative?: boolean;
  asian?: boolean;
  blackOrAfricanAmerican?: boolean;
  nativeHawaiianOrOtherPacificIslander?: boolean;
  white?: boolean;
  demographicRaceTwoOrMoreRaces?: boolean;
  hispanicOrLatinoEthnicity?: boolean;
  countryOfBirthCode?: string;
  stateOfBirthAbbreviation?: string;
  cityOfBirth?: string;
  publicSchoolResidenceStatus?: string;
}

export interface OneRosterFilter {
  field: string;
  predicate: '=' | '!=' | '>' | '>=' | '<' | '<=' | '~';
  value: string;
}

export interface OneRosterQuery {
  filter?: OneRosterFilter[];
  sort?: string;
  orderBy?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
  fields?: string[];
  dateLastModified?: string;
}

export interface OneRosterConnection {
  id: string;
  tenantId: string;
  name: string;
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  tokenUrl: string;
  scope?: string;
  accessToken?: string;
  tokenExpiry?: Date;
  lastSyncAt?: Date;
  syncStatus: 'idle' | 'syncing' | 'error';
  fieldMappings: OneRosterFieldMapping[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OneRosterFieldMapping {
  sourceField: string;
  targetField: string;
  transform?: 'uppercase' | 'lowercase' | 'trim' | 'date_iso' | 'custom';
  customTransform?: string;
}

export interface OneRosterBulkResult {
  totalRecords: number;
  processedRecords: number;
  errorRecords: number;
  errors: Array<{
    line: number;
    field?: string;
    message: string;
  }>;
}

// ============================================================================
// CASE (Competency & Academic Standards Exchange)
// ============================================================================

export type CASEAssociationType =
  | 'isChildOf'
  | 'isPartOf'
  | 'precedes'
  | 'isRelatedTo'
  | 'replacedBy'
  | 'exemplar'
  | 'hasSkillLevel'
  | 'isTranslationOf'
  | 'isPeerOf';

export interface CASEDocument {
  identifier: string;
  uri: string;
  creator: string;
  title: string;
  lastChangeDateTime: string;
  officialSourceURL?: string;
  publisher?: string;
  description?: string;
  subject?: string[];
  subjectURI?: string[];
  language?: string;
  version?: string;
  adoptionStatus?: 'Draft' | 'Review' | 'Adopted' | 'Deprecated';
  statusStartDate?: string;
  statusEndDate?: string;
  licenseURI?: string;
  notes?: string;
  CFPackageURI?: { title: string; identifier: string; uri: string };
}

export interface CASEItem {
  identifier: string;
  uri: string;
  fullStatement: string;
  humanCodingScheme?: string;
  lastChangeDateTime: string;
  CFDocumentURI: { title: string; identifier: string; uri: string };
  CFItemType?: string;
  CFItemTypeURI?: { title: string; identifier: string; uri: string };
  educationLevel?: string[];
  abbreviatedStatement?: string;
  alternativeLabel?: string;
  conceptKeywords?: string[];
  conceptKeywordsURI?: { title: string; identifier: string; uri: string };
  notes?: string;
  language?: string;
  listEnumeration?: string;
  statusStartDate?: string;
  statusEndDate?: string;
  licenseURI?: string;
}

export interface CASEAssociation {
  identifier: string;
  uri: string;
  associationType: CASEAssociationType;
  originNodeURI: { title: string; identifier: string; uri: string };
  destinationNodeURI: { title: string; identifier: string; uri: string };
  lastChangeDateTime: string;
  CFDocumentURI?: { title: string; identifier: string; uri: string };
  sequenceNumber?: number;
}

export interface CASEFramework {
  id: string;
  tenantId: string;
  document: CASEDocument;
  items: CASEItem[];
  associations: CASEAssociation[];
  importedAt: Date;
  lastSyncAt?: Date;
  sourceUrl?: string;
  status: 'active' | 'archived' | 'draft';
}

export interface CASEItemMapping {
  caseItemId: string;
  knowledgeGraphNodeId: string;
  confidence: number;
  mappedBy: 'auto' | 'manual';
  mappedAt: Date;
}

// ============================================================================
// CLR 2.0 / OPEN BADGES 3.0
// ============================================================================

export type BadgeVerificationType = 'HostedBadge' | 'SignedBadge';
export type BadgeStatus = 'draft' | 'active' | 'revoked' | 'expired';

export interface AchievementDefinition {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  criteriaType: 'narrative' | 'id_based';
  criteriaNarrative?: string;
  criteriaId?: string;
  achievementType: string;
  image?: string;
  alignment: AchievementAlignment[];
  tags: string[];
  evidenceRequired: boolean;
  evidenceDescription?: string;
  resultDescriptions?: ResultDescription[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AchievementAlignment {
  targetName: string;
  targetUrl: string;
  targetDescription?: string;
  targetFramework?: string;
  targetCode?: string;
}

export interface ResultDescription {
  id: string;
  name: string;
  resultType: 'GradePointAverage' | 'LetterGrade' | 'Percent' | 'PerformanceLevel' | 'PredictedScore' | 'RawScore' | 'Result' | 'RubricCriterion' | 'RubricCriterionLevel' | 'RubricScore' | 'ScaledScore' | 'Status';
  allowedValues?: string[];
  valueMin?: string;
  valueMax?: string;
  requiredLevel?: string;
}

export interface OpenBadgeCredential {
  '@context': string[];
  id: string;
  type: ['VerifiableCredential', 'OpenBadgeCredential'];
  issuer: OpenBadgeIssuer;
  issuanceDate: string;
  expirationDate?: string;
  name: string;
  credentialSubject: {
    id?: string;
    type: ['AchievementSubject'];
    achievement: OpenBadgeAchievement;
    result?: OpenBadgeResult[];
    identity?: {
      identityHash: string;
      identityType: string;
      hashed: boolean;
      salt?: string;
    };
    source?: { id: string; type: string[] };
  };
  credentialStatus?: {
    id: string;
    type: 'RevocationList';
  };
  proof?: OpenBadgeProof;
  evidence?: OpenBadgeEvidence[];
}

export interface OpenBadgeIssuer {
  id: string;
  type: ['Profile'];
  name: string;
  url?: string;
  description?: string;
  email?: string;
  image?: string;
  otherIdentifier?: Array<{ type: string; identifier: string; identifierType: string }>;
}

export interface OpenBadgeAchievement {
  id: string;
  type: ['Achievement'];
  name: string;
  description: string;
  criteria: { narrative?: string; id?: string };
  image?: { id: string; type: string };
  alignment?: AchievementAlignment[];
  resultDescription?: ResultDescription[];
  tag?: string[];
  achievementType?: string;
}

export interface OpenBadgeResult {
  type: ['Result'];
  resultDescription: string;
  value?: string;
  status?: string;
  achievedLevel?: string;
}

export interface OpenBadgeEvidence {
  id?: string;
  type: ['Evidence'];
  name?: string;
  description?: string;
  narrative?: string;
  genre?: string;
  audience?: string;
}

export interface OpenBadgeProof {
  type: string;
  created: string;
  verificationMethod: string;
  proofPurpose: string;
  proofValue?: string;
  jws?: string;
}

export interface BadgeAssertion {
  id: string;
  tenantId: string;
  achievementDefinitionId: string;
  recipientId: string;
  recipientEmail?: string;
  recipientIdentityHash?: string;
  issuerId: string;
  credential: OpenBadgeCredential;
  verificationType: BadgeVerificationType;
  verificationUrl?: string;
  signatureJws?: string;
  status: BadgeStatus;
  issuedAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  revocationReason?: string;
  nftTokenId?: string;
  nftTransactionHash?: string;
  evidence: OpenBadgeEvidence[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CLRCredential {
  '@context': string[];
  id: string;
  type: ['VerifiableCredential', 'ClrCredential'];
  issuer: OpenBadgeIssuer;
  issuanceDate: string;
  name: string;
  credentialSubject: {
    id?: string;
    type: ['ClrSubject'];
    learner: {
      id: string;
      type: ['Profile'];
      name: string;
      email?: string;
      studentId?: string;
    };
    achievements: CLRAchievementClaim[];
    verifiableCredential?: OpenBadgeCredential[];
  };
  proof?: OpenBadgeProof;
}

export interface CLRAchievementClaim {
  achievement: OpenBadgeAchievement;
  results?: OpenBadgeResult[];
  evidence?: OpenBadgeEvidence[];
  issuedOn: string;
  source?: { id: string; name: string };
}

export interface BadgeRevocationEntry {
  assertionId: string;
  revokedAt: string;
  reason: string;
}

// ============================================================================
// ED-FI ODS/API v7
// ============================================================================

export type EdFiSyncDirection = 'inbound' | 'outbound' | 'bidirectional';
export type EdFiSyncStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type EdFiResourceType =
  | 'students'
  | 'staff'
  | 'studentSchoolAssociations'
  | 'sections'
  | 'gradebookEntries'
  | 'grades'
  | 'attendance'
  | 'assessments'
  | 'courseOfferings'
  | 'courses'
  | 'schools'
  | 'educationOrganizations';

export interface EdFiConnectionConfig {
  id: string;
  tenantId: string;
  name: string;
  districtName: string;
  baseUrl: string;
  oauthUrl: string;
  clientId: string;
  clientSecret: string;
  schoolYear: number;
  namespace: string;
  apiVersion: string;
  pageSize: number;
  rateLimitPerMinute: number;
  syncDirection: EdFiSyncDirection;
  enabledResources: EdFiResourceType[];
  accessToken?: string;
  tokenExpiry?: Date;
  lastSyncVersion?: number;
  status: 'active' | 'inactive' | 'error';
  createdAt: Date;
  updatedAt: Date;
}

export interface EdFiSyncJobConfig {
  id: string;
  tenantId: string;
  connectionId: string;
  direction: EdFiSyncDirection;
  resourceType: EdFiResourceType;
  status: EdFiSyncStatus;
  startedAt?: Date;
  completedAt?: Date;
  totalRecords: number;
  processedRecords: number;
  createdRecords: number;
  updatedRecords: number;
  errorRecords: number;
  skippedRecords: number;
  lastChangeVersion?: number;
  errors: EdFiSyncError[];
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface EdFiSyncError {
  resourceId?: string;
  resourceType: string;
  operation: 'create' | 'update' | 'delete';
  errorCode: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface EdFiFieldMapping {
  id: string;
  tenantId: string;
  connectionId: string;
  resourceType: EdFiResourceType;
  scholarlyField: string;
  edfiField: string;
  direction: EdFiSyncDirection;
  transform?: 'direct' | 'uppercase' | 'lowercase' | 'date_format' | 'lookup' | 'custom';
  transformConfig?: Record<string, unknown>;
  isRequired: boolean;
  defaultValue?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EdFiConflict {
  id: string;
  tenantId: string;
  connectionId: string;
  syncJobId: string;
  resourceType: EdFiResourceType;
  resourceId: string;
  scholarlyData: Record<string, unknown>;
  edfiData: Record<string, unknown>;
  conflictFields: string[];
  resolution?: 'scholarly_wins' | 'edfi_wins' | 'manual_merge';
  resolvedData?: Record<string, unknown>;
  resolvedBy?: string;
  resolvedAt?: Date;
  status: 'pending' | 'resolved' | 'ignored';
  createdAt: Date;
}

export interface EdFiChangeTracker {
  id: string;
  tenantId: string;
  connectionId: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  changedFields: string[];
  previousValues: Record<string, unknown>;
  newValues: Record<string, unknown>;
  synced: boolean;
  syncJobId?: string;
  trackedAt: Date;
}

export interface EdFiStudentResource {
  id?: string;
  studentUniqueId: string;
  birthDate: string;
  firstName: string;
  lastSurname: string;
  middleName?: string;
  generationCodeSuffix?: string;
  personalTitlePrefix?: string;
  sexDescriptor: string;
  birthCity?: string;
  birthStateAbbreviationDescriptor?: string;
  birthCountryDescriptor?: string;
  citizenshipStatusDescriptor?: string;
  hispanicLatinoEthnicity?: boolean;
  races?: Array<{ raceDescriptor: string }>;
  addresses?: Array<{
    addressTypeDescriptor: string;
    streetNumberName: string;
    city: string;
    stateAbbreviationDescriptor: string;
    postalCode: string;
  }>;
  telephones?: Array<{
    telephoneNumber: string;
    telephoneNumberTypeDescriptor: string;
  }>;
  electronicMails?: Array<{
    electronicMailAddress: string;
    electronicMailTypeDescriptor: string;
  }>;
}

export interface EdFiGradeResource {
  id?: string;
  gradeTypeDescriptor: string;
  gradingPeriodDescriptor: string;
  gradingPeriodSchoolYear: number;
  gradingPeriodSequence: number;
  studentUniqueId: string;
  schoolId: number;
  sectionIdentifier: string;
  sessionName: string;
  localCourseCode: string;
  schoolYear: number;
  letterGradeEarned?: string;
  numericGradeEarned?: number;
  performanceBaseConversionDescriptor?: string;
}

export interface EdFiAttendanceResource {
  id?: string;
  attendanceDate: string;
  studentUniqueId: string;
  schoolId: number;
  sectionIdentifier?: string;
  sessionName?: string;
  localCourseCode?: string;
  schoolYear: number;
  attendanceEventCategoryDescriptor: string;
  attendanceEventReason?: string;
  eventDuration?: number;
}
