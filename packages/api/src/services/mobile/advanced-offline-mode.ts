// ============================================================================
// SCHOLARLY PLATFORM — S12-006: Advanced Offline Mode
// Sprint 12: Local AI inference for BKT and story recommendations
// ============================================================================
import { ScholarlyBaseService, Result } from '../shared/base';

// Section 1: Types
interface OfflineCapability { name: string; available: boolean; storageRequired: number; lastSynced?: Date; }
interface OfflineState { isOnline: boolean; capabilities: OfflineCapability[]; storageUsed: number; storageLimit: number; pendingSyncItems: number; lastFullSync: Date; bktEngineLoaded: boolean; recommendationModelLoaded: boolean; }
interface DownloadedBook { bookId: string; title: string; phase: number; pages: { text: string; imageBlob: Blob; audioBlob: Blob; timestamps: any[] }[]; metadata: any; downloadedAt: Date; sizeBytes: number; }
interface OfflineBKTState { learnerId: string; gpcMastery: Record<string, number>; lastUpdated: Date; pendingObservations: BKTObservation[]; }
interface BKTObservation { gpc: string; correct: boolean; timestamp: Date; sessionId: string; }
interface SyncQueueItem { id: string; type: 'bkt_update' | 'reading_session' | 'achievement' | 'analytics'; payload: any; createdAt: Date; retryCount: number; }

// Section 2: Offline Manager
class AdvancedOfflineManager extends ScholarlyBaseService {
  private state: OfflineState;
  private syncQueue: SyncQueueItem[] = [];
  private bktEngine: LocalBKTEngine;
  private recommendationEngine: LocalRecommendationEngine;
  private storage: OfflineStorage;

  constructor(tenantId: string, userId: string) {
    super(tenantId, userId);
    this.bktEngine = new LocalBKTEngine();
    this.recommendationEngine = new LocalRecommendationEngine();
    this.storage = new OfflineStorage();
    this.state = { isOnline: true, capabilities: [], storageUsed: 0, storageLimit: 500 * 1024 * 1024, pendingSyncItems: 0, lastFullSync: new Date(), bktEngineLoaded: false, recommendationModelLoaded: false };
  }

  async initialise(): Promise<Result<OfflineState>> {
    // Load BKT engine (WebAssembly for performance)
    const bktResult = await this.bktEngine.load();
    this.state.bktEngineLoaded = bktResult.success;
    // Load recommendation model
    const recResult = await this.recommendationEngine.load();
    this.state.recommendationModelLoaded = recResult.success;
    // Check storage
    this.state.storageUsed = await this.storage.getUsedSpace();
    // Register capabilities
    this.state.capabilities = [
      { name: 'Reading downloaded books', available: true, storageRequired: 0 },
      { name: 'BKT mastery tracking', available: this.state.bktEngineLoaded, storageRequired: 1024 * 50 },
      { name: 'Story recommendations', available: this.state.recommendationModelLoaded, storageRequired: 1024 * 200 },
      { name: 'Audio narration playback', available: true, storageRequired: 0 },
      { name: 'Progress sync when online', available: true, storageRequired: 0 },
    ];
    return { success: true, data: this.state };
  }

  async downloadBook(bookId: string, bookData: any): Promise<Result<DownloadedBook>> {
    const totalSize = this.estimateBookSize(bookData);
    if (this.state.storageUsed + totalSize > this.state.storageLimit) {
      return { success: false, error: { code: 'STORAGE_FULL', message: `Need ${totalSize} bytes, have ${this.state.storageLimit - this.state.storageUsed}` } };
    }
    const downloaded: DownloadedBook = { bookId, title: bookData.title, phase: bookData.phase, pages: bookData.pages.map((p: any) => ({ text: p.text, imageBlob: new Blob([]), audioBlob: new Blob([]), timestamps: p.wordTimestamps || [] })), metadata: bookData.metadata, downloadedAt: new Date(), sizeBytes: totalSize };
    await this.storage.saveBook(downloaded);
    this.state.storageUsed += totalSize;
    this.log('info', 'Book downloaded for offline', { bookId, size: totalSize });
    return { success: true, data: downloaded };
  }

  async processOfflineReading(learnerId: string, bookId: string, performance: any): Promise<Result<void>> {
    // Update local BKT
    for (const obs of performance.observations || []) {
      const bktObs: BKTObservation = { gpc: obs.gpc, correct: obs.correct, timestamp: new Date(), sessionId: performance.sessionId };
      await this.bktEngine.processObservation(learnerId, bktObs);
    }
    // Queue for sync
    this.syncQueue.push({ id: `sq_${Date.now()}`, type: 'reading_session', payload: { learnerId, bookId, performance }, createdAt: new Date(), retryCount: 0 });
    this.state.pendingSyncItems = this.syncQueue.length;
    return { success: true };
  }

  async getOfflineRecommendations(learnerId: string): Promise<Result<string[]>> {
    if (!this.state.recommendationModelLoaded) return { success: false, error: { code: 'MODEL_NOT_LOADED', message: 'Recommendation engine unavailable offline' } };
    const bktState = await this.bktEngine.getState(learnerId);
    if (!bktState) return { success: true, data: [] };
    const downloadedBooks = await this.storage.getDownloadedBooks();
    const recommendations = this.recommendationEngine.recommend(bktState, downloadedBooks);
    return { success: true, data: recommendations };
  }

  async syncWhenOnline(): Promise<Result<{ synced: number; failed: number }>> {
    if (!this.state.isOnline) return { success: false, error: { code: 'OFFLINE', message: 'No connection' } };
    let synced = 0, failed = 0;
    const items = [...this.syncQueue];
    for (const item of items) {
      try {
        await fetch('/api/v1/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
        this.syncQueue = this.syncQueue.filter(i => i.id !== item.id);
        synced++;
      } catch { item.retryCount++; if (item.retryCount > 5) { this.syncQueue = this.syncQueue.filter(i => i.id !== item.id); failed++; } }
    }
    this.state.pendingSyncItems = this.syncQueue.length;
    this.state.lastFullSync = new Date();
    return { success: true, data: { synced, failed } };
  }

  private estimateBookSize(bookData: any): number {
    const textSize = JSON.stringify(bookData).length;
    const imageSize = (bookData.pages?.length || 0) * 200 * 1024; // ~200KB per image
    const audioSize = (bookData.pages?.length || 0) * 100 * 1024; // ~100KB per audio
    return textSize + imageSize + audioSize;
  }
}

// Section 3: Local BKT Engine
class LocalBKTEngine {
  private states: Map<string, OfflineBKTState> = new Map();
  private params = { pLearn: 0.3, pSlip: 0.1, pGuess: 0.2 };

  async load(): Promise<Result<void>> { return { success: true }; }

  async processObservation(learnerId: string, obs: BKTObservation): Promise<void> {
    let state = this.states.get(learnerId) || { learnerId, gpcMastery: {}, lastUpdated: new Date(), pendingObservations: [] };
    const prior = state.gpcMastery[obs.gpc] || 0.1;
    // BKT update equations
    const pCorrectGivenMastered = 1 - this.params.pSlip;
    const pCorrectGivenUnmastered = this.params.pGuess;
    const pCorrect = prior * pCorrectGivenMastered + (1 - prior) * pCorrectGivenUnmastered;
    let posterior: number;
    if (obs.correct) { posterior = (prior * pCorrectGivenMastered) / pCorrect; }
    else { posterior = (prior * this.params.pSlip) / (1 - pCorrect); }
    // Learning transition
    state.gpcMastery[obs.gpc] = posterior + (1 - posterior) * this.params.pLearn;
    state.lastUpdated = new Date();
    state.pendingObservations.push(obs);
    this.states.set(learnerId, state);
  }

  async getState(learnerId: string): Promise<OfflineBKTState | null> { return this.states.get(learnerId) || null; }
}

// Section 4: Local Recommendation Engine
class LocalRecommendationEngine {
  async load(): Promise<Result<void>> { return { success: true }; }

  recommend(bktState: OfflineBKTState, availableBooks: DownloadedBook[]): string[] {
    // Find GPCs needing practice (mastery < 0.85)
    const weakGPCs = Object.entries(bktState.gpcMastery).filter(([_, m]) => m < 0.85).sort((a, b) => a[1] - b[1]).map(([gpc]) => gpc);
    // Rank books by how many weak GPCs they target
    const scored = availableBooks.map(book => {
      const targetGPCs = book.metadata?.targetGPCs || [];
      const overlap = targetGPCs.filter((g: string) => weakGPCs.includes(g)).length;
      return { bookId: book.bookId, score: overlap };
    }).sort((a, b) => b.score - a.score);
    return scored.slice(0, 5).map(s => s.bookId);
  }
}

// Section 5: Storage Abstraction
class OfflineStorage {
  async saveBook(book: DownloadedBook): Promise<void> { /* IndexedDB / expo-sqlite */ }
  async getDownloadedBooks(): Promise<DownloadedBook[]> { return []; }
  async getUsedSpace(): Promise<number> { return 0; }
  async clearAll(): Promise<void> { /* Clear all offline data */ }
}

export { AdvancedOfflineManager, LocalBKTEngine, LocalRecommendationEngine, OfflineStorage, OfflineState, DownloadedBook, OfflineBKTState, SyncQueueItem };
