// =============================================================================
// SCHOLARLY PLATFORM — Sprint 10: SY-001
// Federated Sync Hardening
// =============================================================================
// Extends the existing federated knowledge tracing (1,864 lines across client
// and server) to cover storybook downloads, reading positions, subscription
// portability, token balances, achievements, and preferences.
// =============================================================================

import { Result } from '../shared/base';

// SECTION 1: ENUMS & CONFIG
export enum SyncDomain { BKT_MASTERY='bkt_mastery', READING_POSITION='reading_position', STORYBOOK_DOWNLOAD='storybook_download', SUBSCRIPTION_STATUS='subscription_status', TOKEN_BALANCE='token_balance', ACHIEVEMENT_STATE='achievement_state', PREFERENCES='preferences' }
export enum ConflictStrategy { LAST_WRITE_WINS='lww', SERVER_WINS='sw', CLIENT_WINS='cw', MERGE='merge', HIGHEST_VALUE='hv' }
export enum SyncOpStatus { QUEUED='queued', IN_PROGRESS='in_progress', COMPLETED='completed', FAILED='failed', CONFLICT='conflict', RETRYING='retrying' }
export enum DownloadStatus { NOT_DOWNLOADED='not_downloaded', QUEUED='queued', DOWNLOADING='downloading', DOWNLOADED='downloaded', UPDATING='updating', ERROR='error', EXPIRED='expired' }
export enum SubscriptionStatus { ACTIVE='active', TRIAL='trial', GRACE_PERIOD='grace_period', EXPIRED='expired', CANCELLED='cancelled', PAUSED='paused' }
export enum SubscriptionTier { FREE='free', FAMILY='family', CLASSROOM='classroom', SCHOOL='school', DISTRICT='district' }

export interface RetryConfig { maxRetries: number; baseDelayMs: number; maxDelayMs: number; backoffMultiplier: number; jitterMs: number; }
export interface SyncConfig { syncIntervalMs: number; syncTimeoutMs: number; maxOfflineQueueSize: number; conflictStrategies: Record<SyncDomain, ConflictStrategy>; enabledDomains: SyncDomain[]; syncOnReconnect: boolean; batchSize: number; retryConfig: RetryConfig; }

export const DEFAULT_SYNC_CONFIG: SyncConfig = {
  syncIntervalMs: 60_000, syncTimeoutMs: 30_000, maxOfflineQueueSize: 500,
  conflictStrategies: { [SyncDomain.BKT_MASTERY]: ConflictStrategy.MERGE, [SyncDomain.READING_POSITION]: ConflictStrategy.LAST_WRITE_WINS, [SyncDomain.STORYBOOK_DOWNLOAD]: ConflictStrategy.MERGE, [SyncDomain.SUBSCRIPTION_STATUS]: ConflictStrategy.SERVER_WINS, [SyncDomain.TOKEN_BALANCE]: ConflictStrategy.SERVER_WINS, [SyncDomain.ACHIEVEMENT_STATE]: ConflictStrategy.HIGHEST_VALUE, [SyncDomain.PREFERENCES]: ConflictStrategy.LAST_WRITE_WINS },
  enabledDomains: Object.values(SyncDomain) as SyncDomain[], syncOnReconnect: true, batchSize: 50,
  retryConfig: { maxRetries: 5, baseDelayMs: 1000, maxDelayMs: 30000, backoffMultiplier: 2, jitterMs: 500 },
};

// SECTION 2: SYNC OPERATIONS
export interface SyncOperation { id: string; domain: SyncDomain; type: 'create'|'update'|'delete'; entityId: string; data: Record<string, unknown>; timestamp: number; deviceId: string; userId: string; tenantId: string; version: number; retryCount: number; status: SyncOpStatus; error: string|null; }
export interface ConflictResolution { strategy: ConflictStrategy; localValue: unknown; serverValue: unknown; resolvedValue: unknown; autoResolved: boolean; requiresUserAction: boolean; description: string; }
export interface SyncResult { operationId: string; domain: SyncDomain; status: SyncOpStatus; serverVersion: number; conflictResolution: ConflictResolution|null; timestamp: number; }
export interface SyncSummary { startedAt: number; completedAt: number; durationMs: number; operationsProcessed: number; succeeded: number; failed: number; conflicts: number; autoResolved: number; }

// SECTION 3: READING POSITION SYNC
export interface ReadingPosition { storybookId: string; learnerId: string; currentPage: number; currentWordIndex: number; readingMode: string; lastReadAt: number; deviceId: string; pagesCompleted: number[]; sessionDurationMs: number; totalWordsRead: number; bookmarkPages: number[]; }

export class ReadingPositionSync {
  private positions: Map<string, ReadingPosition> = new Map();
  updatePosition(pos: ReadingPosition): void { const k=`${pos.learnerId}:${pos.storybookId}`; const e=this.positions.get(k); if(!e||pos.lastReadAt>e.lastReadAt) this.positions.set(k,pos); }
  resolveConflict(local: ReadingPosition, server: ReadingPosition): ReadingPosition {
    const lp=local.currentPage*1000+local.currentWordIndex, sp=server.currentPage*1000+server.currentWordIndex;
    const base=lp>sp?local:server;
    return { ...base, pagesCompleted:[...new Set([...local.pagesCompleted,...server.pagesCompleted])].sort((a,b)=>a-b), bookmarkPages:[...new Set([...local.bookmarkPages,...server.bookmarkPages])].sort((a,b)=>a-b), totalWordsRead:Math.max(local.totalWordsRead,server.totalWordsRead) };
  }
  getPosition(learnerId: string, storybookId: string): ReadingPosition|null { return this.positions.get(`${learnerId}:${storybookId}`)??null; }
  getAllPositions(): ReadingPosition[] { return Array.from(this.positions.values()); }
}

// SECTION 4: DOWNLOAD SYNC
export interface DownloadSyncRecord { storybookId: string; learnerId: string; deviceId: string; downloadStatus: DownloadStatus; downloadedAt: number|null; storageSizeBytes: number; contentVersion: number; narrationIncluded: boolean; lastAccessedAt: number|null; expiresAt: number|null; }
export interface CrossDeviceDownloadView { storybookId: string; title: string; thisDevice: DownloadSyncRecord|null; otherDevices: {deviceId:string;deviceName:string;status:DownloadStatus}[]; recommendDownload: boolean; estimatedSizeBytes: number; }

export class DownloadSync {
  private records: Map<string, DownloadSyncRecord> = new Map();
  registerDownload(r: DownloadSyncRecord): void { this.records.set(`${r.storybookId}:${r.deviceId}`,r); }
  getCrossDeviceStatus(bookId: string, deviceId: string, all: DownloadSyncRecord[]): CrossDeviceDownloadView {
    const td=all.find(r=>r.storybookId===bookId&&r.deviceId===deviceId)??null;
    const od=all.filter(r=>r.storybookId===bookId&&r.deviceId!==deviceId).map(r=>({deviceId:r.deviceId,deviceName:'Device',status:r.downloadStatus}));
    return { storybookId:bookId, title:'', thisDevice:td, otherDevices:od, recommendDownload:!td||td.downloadStatus===DownloadStatus.NOT_DOWNLOADED, estimatedSizeBytes:0 };
  }
  cleanupExpired(): string[] { const now=Date.now(); const exp:string[]=[]; for(const[k,r]of this.records.entries()){if(r.expiresAt&&r.expiresAt<now){r.downloadStatus=DownloadStatus.EXPIRED;exp.push(k);}} return exp; }
  getDeviceStorageUsed(deviceId: string): number { let t=0; for(const r of this.records.values()){if(r.deviceId===deviceId&&r.downloadStatus===DownloadStatus.DOWNLOADED)t+=r.storageSizeBytes;} return t; }
  getDeviceDownloads(deviceId: string): DownloadSyncRecord[] { return Array.from(this.records.values()).filter(r=>r.deviceId===deviceId); }
}

// SECTION 5: SUBSCRIPTION PORTABILITY
export interface SubscriptionFeatures { maxLearnerProfiles: number; offlineBookLimit: number; communityContentAccess: boolean; arenaAccess: boolean; creatorToolsAccess: boolean; prioritySupport: boolean; adFree: boolean; customThemes: boolean; }
export const TIER_FEATURES: Record<SubscriptionTier, SubscriptionFeatures> = {
  [SubscriptionTier.FREE]: { maxLearnerProfiles:1, offlineBookLimit:3, communityContentAccess:false, arenaAccess:false, creatorToolsAccess:false, prioritySupport:false, adFree:false, customThemes:false },
  [SubscriptionTier.FAMILY]: { maxLearnerProfiles:5, offlineBookLimit:50, communityContentAccess:true, arenaAccess:true, creatorToolsAccess:false, prioritySupport:false, adFree:true, customThemes:true },
  [SubscriptionTier.CLASSROOM]: { maxLearnerProfiles:35, offlineBookLimit:100, communityContentAccess:true, arenaAccess:true, creatorToolsAccess:true, prioritySupport:true, adFree:true, customThemes:true },
  [SubscriptionTier.SCHOOL]: { maxLearnerProfiles:500, offlineBookLimit:200, communityContentAccess:true, arenaAccess:true, creatorToolsAccess:true, prioritySupport:true, adFree:true, customThemes:true },
  [SubscriptionTier.DISTRICT]: { maxLearnerProfiles:10000, offlineBookLimit:500, communityContentAccess:true, arenaAccess:true, creatorToolsAccess:true, prioritySupport:true, adFree:true, customThemes:true },
};
export interface SubscriptionSyncRecord { userId:string; subscriptionId:string; status:SubscriptionStatus; tier:SubscriptionTier; purchasedVia:'apple'|'google'|'stripe'|'gift'|'school'; originalTransactionId:string; expiresAt:number; autoRenewing:boolean; gracePeriodEndsAt:number|null; cancelledAt:number|null; lastVerifiedAt:number; features:SubscriptionFeatures; }

export class SubscriptionSync {
  private current: SubscriptionSyncRecord|null = null;
  async verify(userId: string): Promise<Result<SubscriptionSyncRecord>> { if(!this.current) return{success:true,data:{userId,subscriptionId:'',status:SubscriptionStatus.EXPIRED,tier:SubscriptionTier.FREE,purchasedVia:'stripe',originalTransactionId:'',expiresAt:0,autoRenewing:false,gracePeriodEndsAt:null,cancelledAt:null,lastVerifiedAt:Date.now(),features:TIER_FEATURES[SubscriptionTier.FREE]}}; return{success:true,data:this.current}; }
  hasFeature(f: keyof SubscriptionFeatures): boolean { return this.current?!!this.current.features[f]:false; }
  checkOfflineAccess(): {allowed:boolean;reason:string} { if(!this.current)return{allowed:false,reason:'No subscription'}; const now=Date.now(),G=7*24*60*60*1000; if(this.current.status===SubscriptionStatus.ACTIVE){if(this.current.expiresAt>now)return{allowed:true,reason:'Active'};if(now-this.current.lastVerifiedAt<G)return{allowed:true,reason:'Offline grace'};} if(this.current.status===SubscriptionStatus.GRACE_PERIOD&&this.current.gracePeriodEndsAt&&this.current.gracePeriodEndsAt>now)return{allowed:true,reason:'Billing grace'}; return{allowed:false,reason:'Expired'}; }
  update(r: SubscriptionSyncRecord): void { this.current=r; }
  getCurrent(): SubscriptionSyncRecord|null { return this.current; }
}

// SECTION 6: SYNC ORCHESTRATOR
export interface DomainHealth { lastSyncAt:number|null; staleness:number; queuedOps:number; failedOps:number; isHealthy:boolean; }
export interface SyncHealthReport { isHealthy:boolean; totalQueued:number; oldestQueuedAt:number|null; domainHealth:Record<string,DomainHealth>; lastFullSync:number; }

export class SyncOrchestrator {
  private config: SyncConfig; private queue: SyncOperation[]=[]; private running=false;
  private lastTs: Map<SyncDomain,number>=new Map(); private timer:NodeJS.Timeout|null=null;
  readonly readingSync: ReadingPositionSync; readonly downloadSync: DownloadSync; readonly subSync: SubscriptionSync;
  private deviceId:string; private userId:string; private tenantId:string;

  constructor(config:Partial<SyncConfig>={},deviceId='',userId='',tenantId='') {
    this.config={...DEFAULT_SYNC_CONFIG,...config}; this.deviceId=deviceId; this.userId=userId; this.tenantId=tenantId;
    this.readingSync=new ReadingPositionSync(); this.downloadSync=new DownloadSync(); this.subSync=new SubscriptionSync();
  }

  start(): void { if(this.running)return; this.running=true; this.loop(); }
  stop(): void { this.running=false; if(this.timer)clearTimeout(this.timer); }
  async syncNow(): Promise<SyncSummary> { return this.cycle(); }

  enqueue(domain:SyncDomain,type:'create'|'update'|'delete',entityId:string,data:Record<string,unknown>): void {
    if(this.queue.length>=this.config.maxOfflineQueueSize){const c=[SyncDomain.BKT_MASTERY,SyncDomain.TOKEN_BALANCE];const i=this.queue.findIndex(op=>!c.includes(op.domain));if(i>=0)this.queue.splice(i,1);}
    this.queue.push({id:`op_${Date.now()}_${Math.random().toString(36).substr(2,9)}`,domain,type,entityId,data,timestamp:Date.now(),deviceId:this.deviceId,userId:this.userId,tenantId:this.tenantId,version:0,retryCount:0,status:SyncOpStatus.QUEUED,error:null});
  }

  getQueueSize(): number { return this.queue.length; }

  getSyncHealth(): SyncHealthReport {
    const now=Date.now(); const dh:Record<string,DomainHealth>={};
    for(const d of this.config.enabledDomains){const ls=this.lastTs.get(d);const q=this.queue.filter(op=>op.domain===d);const f=q.filter(op=>op.status===SyncOpStatus.FAILED);dh[d]={lastSyncAt:ls??null,staleness:ls?now-ls:Infinity,queuedOps:q.length,failedOps:f.length,isHealthy:(ls?now-ls<this.config.syncIntervalMs*3:false)&&f.length===0};}
    const ts=Array.from(this.lastTs.values());
    return{isHealthy:Object.values(dh).every(d=>d.isHealthy),totalQueued:this.queue.length,oldestQueuedAt:this.queue[0]?.timestamp??null,domainHealth:dh,lastFullSync:ts.length>0?Math.min(...ts):0};
  }

  private loop(): void { if(!this.running)return; this.timer=setTimeout(async()=>{await this.cycle();this.loop();},this.config.syncIntervalMs); }

  private async cycle(): Promise<SyncSummary> {
    const start=Date.now(); let ok=0,fail=0,conflict=0,auto=0;
    const pending=this.queue.filter(op=>op.status===SyncOpStatus.QUEUED||op.status===SyncOpStatus.RETRYING);
    for(let i=0;i<pending.length;i+=this.config.batchSize){
      for(const op of pending.slice(i,i+this.config.batchSize)){
        try{op.status=SyncOpStatus.IN_PROGRESS;const r=await this.exec(op);if(r.status===SyncOpStatus.COMPLETED){ok++;this.rm(op.id);this.lastTs.set(op.domain,Date.now());}else if(r.status===SyncOpStatus.CONFLICT){conflict++;if(r.conflictResolution?.autoResolved){auto++;this.rm(op.id);}}else{fail++;op.retryCount++;op.status=op.retryCount>=this.config.retryConfig.maxRetries?SyncOpStatus.FAILED:SyncOpStatus.RETRYING;}}
        catch(e){fail++;op.status=SyncOpStatus.FAILED;op.error=e instanceof Error?e.message:'Unknown';}
      }
    }
    return{startedAt:start,completedAt:Date.now(),durationMs:Date.now()-start,operationsProcessed:pending.length,succeeded:ok,failed:fail,conflicts:conflict,autoResolved:auto};
  }

  private async exec(op:SyncOperation): Promise<SyncResult> { return{operationId:op.id,domain:op.domain,status:SyncOpStatus.COMPLETED,serverVersion:op.version+1,conflictResolution:null,timestamp:Date.now()}; }
  private rm(id:string): void { const i=this.queue.findIndex(op=>op.id===id);if(i>=0)this.queue.splice(i,1); }
}

// SECTION 7: STRESS TESTS
export interface StressTestScenario { name:string; description:string; devices:number; concurrentOps:number; offlinePeriodMs:number; expectedConflicts:number; acceptableSyncMs:number; }
export const STRESS_TESTS: StressTestScenario[] = [
  {name:'home_to_school',description:'Child reads 3 books on iPad, logs in at school on Chromebook',devices:2,concurrentOps:0,offlinePeriodMs:0,expectedConflicts:0,acceptableSyncMs:5000},
  {name:'offline_weekend',description:'Child reads offline all weekend (20 sessions), syncs Monday',devices:1,concurrentOps:0,offlinePeriodMs:172800000,expectedConflicts:0,acceptableSyncMs:15000},
  {name:'concurrent_family',description:'Two siblings reading simultaneously, same account',devices:2,concurrentOps:10,offlinePeriodMs:0,expectedConflicts:2,acceptableSyncMs:8000},
  {name:'classroom_30',description:'30 students + teacher simultaneous',devices:31,concurrentOps:30,offlinePeriodMs:0,expectedConflicts:0,acceptableSyncMs:10000},
  {name:'network_flap',description:'Connectivity drops 5 times during session',devices:1,concurrentOps:5,offlinePeriodMs:30000,expectedConflicts:1,acceptableSyncMs:12000},
  {name:'subscription_race',description:'Parent buys sub on web while child reads on app',devices:2,concurrentOps:1,offlinePeriodMs:0,expectedConflicts:0,acceptableSyncMs:3000},
  {name:'cross_platform_dl',description:'Same book on 3 devices, one offline, content updated',devices:3,concurrentOps:3,offlinePeriodMs:3600000,expectedConflicts:1,acceptableSyncMs:20000},
];

// NATS EVENTS
export const SYNC_EVENTS = { SYNC_STARTED:'scholarly.sync.started', SYNC_COMPLETED:'scholarly.sync.completed', SYNC_FAILED:'scholarly.sync.failed', CONFLICT_DETECTED:'scholarly.sync.conflict_detected', CONFLICT_RESOLVED:'scholarly.sync.conflict_resolved', DEVICE_REGISTERED:'scholarly.sync.device_registered', OFFLINE_QUEUE_FULL:'scholarly.sync.offline_queue_full' } as const;
