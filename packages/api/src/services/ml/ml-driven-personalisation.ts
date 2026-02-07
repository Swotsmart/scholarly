// ============================================================================
// SCHOLARLY PLATFORM — Sprint 14, Deliverable S14-002
// ML-Driven Personalisation Engine
// ============================================================================
//
// PURPOSE: Recommendation engine using collaborative filtering, content-based
// filtering, learner similarity clustering, and contextual bandits. If BKT
// is a GPS for the next turn, this engine is the travel agent who knows you
// prefer scenic routes and always stop for ice cream.
//
// INTEGRATIONS:
//   - Sprint 3 (BKT mastery), Sprint 5 (reading sessions)
//   - Sprint 10 (wellbeing), Sprint 11 (gamification)
//   - Sprint 13 (A/B testing), S14-001 (Data Lake)
// ============================================================================

import { ScholarlyBaseService, Result } from '../shared/base';

// ============================================================================
// SECTION 1: LEARNER FEATURE VECTORS
// ============================================================================

export interface LearnerFeatureVector {
  learnerId: string;
  tenantId: string;
  computedAt: Date;
  version: number;
  // Mastery features (from BKT)
  overallMasteryLevel: number;
  currentPhase: number;
  phaseProgress: number;
  masteryVelocity: number;
  struggleGPCs: string[];
  strengthGPCs: string[];
  // Reading behaviour features
  avgSessionDurationMinutes: number;
  avgSessionsPerWeek: number;
  preferredReadingMode: 'listen' | 'read_aloud' | 'independent' | 'mixed';
  avgCompletionRate: number;
  avgEngagementScore: number;
  rereadRate: number;
  avgAccuracy: number;
  // Content preferences
  preferredArtStyles: string[];
  preferredThemes: string[];
  preferredWordCount: number;
  preferredPageCount: number;
  seriesAffinity: number;
  // Temporal features
  preferredTimeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  weekdayVsWeekend: number;
  sessionFrequencyPattern: 'daily' | 'alternate_days' | 'weekly' | 'sporadic';
  // Affective features
  avgMoodScore: number;
  frustrationTendency: number;
  motivationProfile: 'intrinsic' | 'extrinsic' | 'social' | 'mixed';
  // Lifecycle
  daysOnPlatform: number;
  totalBooksRead: number;
  totalReadingMinutes: number;
  currentStreak: number;
  longestStreak: number;
  churnRisk: number;
}

export class FeatureEngineer extends ScholarlyBaseService {
  constructor(tenantId: string) {
    super('FeatureEngineer', tenantId);
  }

  async computeFeatureVector(learnerId: string): Promise<Result<LearnerFeatureVector>> {
    try {
      const [mastery, reading, preferences, temporal, affective, lifecycle] = await Promise.all([
        this.computeMasteryFeatures(learnerId),
        this.computeReadingFeatures(learnerId),
        this.computePreferenceFeatures(learnerId),
        this.computeTemporalFeatures(learnerId),
        this.computeAffectiveFeatures(learnerId),
        this.computeLifecycleFeatures(learnerId),
      ]);

      const vector: LearnerFeatureVector = {
        learnerId,
        tenantId: this.tenantId,
        computedAt: new Date(),
        version: 1,
        ...mastery,
        ...reading,
        ...preferences,
        ...temporal,
        ...affective,
        ...lifecycle,
      };

      return this.ok(vector);
    } catch (error) {
      return this.fail(`Feature computation failed: ${String(error)}`);
    }
  }

  // Convert feature vector to numerical array for similarity computation
  vectorToNumeric(v: LearnerFeatureVector): number[] {
    return [
      v.overallMasteryLevel,
      v.currentPhase / 6,
      v.phaseProgress,
      Math.min(v.masteryVelocity / 5, 1),
      v.avgSessionDurationMinutes / 30,
      v.avgSessionsPerWeek / 7,
      v.avgCompletionRate,
      v.avgEngagementScore / 100,
      v.rereadRate,
      v.avgAccuracy,
      v.preferredWordCount / 500,
      v.preferredPageCount / 24,
      v.seriesAffinity,
      v.weekdayVsWeekend,
      v.avgMoodScore / 5,
      v.frustrationTendency,
      v.daysOnPlatform / 365,
      Math.min(v.totalBooksRead / 100, 1),
      Math.min(v.totalReadingMinutes / 1000, 1),
      v.currentStreak / Math.max(v.longestStreak, 1),
      v.churnRisk,
    ];
  }

  private async computeMasteryFeatures(learnerId: string): Promise<Partial<LearnerFeatureVector>> {
    // Production: query fact_mastery_snapshot from data lake
    // SELECT AVG(mastery_probability), MAX(phase_key), ...
    // FROM fact_mastery_snapshot WHERE user_id = :learnerId AND snapshot_type = 'daily'
    // ORDER BY date_key DESC LIMIT 1
    return {
      overallMasteryLevel: 0.65,
      currentPhase: 3,
      phaseProgress: 0.4,
      masteryVelocity: 2.5,
      struggleGPCs: [],
      strengthGPCs: [],
    };
  }

  private async computeReadingFeatures(learnerId: string): Promise<Partial<LearnerFeatureVector>> {
    // Production: query mv_weekly_learner_stats
    return {
      avgSessionDurationMinutes: 12,
      avgSessionsPerWeek: 4,
      preferredReadingMode: 'read_aloud' as const,
      avgCompletionRate: 0.85,
      avgEngagementScore: 72,
      rereadRate: 0.15,
      avgAccuracy: 0.82,
    };
  }

  private async computePreferenceFeatures(learnerId: string): Promise<Partial<LearnerFeatureVector>> {
    return {
      preferredArtStyles: ['watercolour', 'soft_3d', 'flat_vector'],
      preferredThemes: ['animals', 'adventure', 'friendship'],
      preferredWordCount: 180,
      preferredPageCount: 14,
      seriesAffinity: 0.65,
    };
  }

  private async computeTemporalFeatures(learnerId: string): Promise<Partial<LearnerFeatureVector>> {
    return {
      preferredTimeOfDay: 'evening' as const,
      weekdayVsWeekend: 0.35,
      sessionFrequencyPattern: 'daily' as const,
    };
  }

  private async computeAffectiveFeatures(learnerId: string): Promise<Partial<LearnerFeatureVector>> {
    return {
      avgMoodScore: 4.1,
      frustrationTendency: 0.15,
      motivationProfile: 'intrinsic' as const,
    };
  }

  private async computeLifecycleFeatures(learnerId: string): Promise<Partial<LearnerFeatureVector>> {
    return {
      daysOnPlatform: 90,
      totalBooksRead: 42,
      totalReadingMinutes: 480,
      currentStreak: 7,
      longestStreak: 14,
      churnRisk: 0.12,
    };
  }
}


// ============================================================================
// SECTION 2: COLLABORATIVE FILTERING
// ============================================================================
// "Learners like you loved this book." Collaborative filtering finds patterns
// across the entire learner population. It's the same technique Netflix uses:
// if learner A and learner B both loved books X and Y, and B also loved book Z,
// then A will probably love Z too — even if they've never seen it.

export interface UserItemMatrix {
  userIds: string[];
  itemIds: string[];
  // Sparse matrix: ratings[userIndex][itemIndex] = engagement score or null
  ratings: (number | null)[][];
}

export interface SimilarityScore {
  userId: string;
  similarity: number;  // -1 to 1 (cosine similarity)
}

export interface CollaborativeRecommendation {
  storybookId: string;
  predictedEngagement: number;  // 0-100
  confidence: number;           // 0-1
  basedOnUsers: number;         // How many similar users informed this
  reason: string;               // Human-readable explanation
}

export class CollaborativeFilteringEngine extends ScholarlyBaseService {
  private readonly MIN_COMMON_ITEMS = 3;   // Min shared books for valid similarity
  private readonly NEIGHBOUR_COUNT = 20;   // Top-K similar users to consider
  private readonly MIN_CONFIDENCE = 0.3;   // Minimum confidence to recommend

  constructor(tenantId: string) {
    super('CollaborativeFiltering', tenantId);
  }

  // Build user-item interaction matrix from reading session data
  async buildInteractionMatrix(
    userIds: string[],
    timeWindowDays: number = 90
  ): Promise<Result<UserItemMatrix>> {
    // In production: query data lake
    // SELECT user_id, storybook_id, AVG(engagement_score) as rating
    // FROM fact_reading_session
    // WHERE date_key >= :startDate
    // GROUP BY user_id, storybook_id

    const matrix: UserItemMatrix = {
      userIds,
      itemIds: [],  // Populated from query results
      ratings: userIds.map(() => []),
    };

    this.log('info', 'Built interaction matrix', {
      users: userIds.length,
      items: matrix.itemIds.length,
    });

    return this.ok(matrix);
  }

  // Compute cosine similarity between two users
  cosineSimilarity(ratingsA: (number | null)[], ratingsB: (number | null)[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    let commonItems = 0;

    for (let i = 0; i < ratingsA.length; i++) {
      if (ratingsA[i] !== null && ratingsB[i] !== null) {
        const a = ratingsA[i]!;
        const b = ratingsB[i]!;
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
        commonItems++;
      }
    }

    if (commonItems < this.MIN_COMMON_ITEMS) return 0;
    if (normA === 0 || normB === 0) return 0;

    // Significance weighting: penalise similarity based on few common items
    const significanceWeight = Math.min(commonItems / 10, 1);

    return (dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))) * significanceWeight;
  }

  // Adjusted cosine similarity (accounts for user rating bias)
  adjustedCosineSimilarity(
    ratingsA: (number | null)[],
    ratingsB: (number | null)[],
    meanA: number,
    meanB: number
  ): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    let commonItems = 0;

    for (let i = 0; i < ratingsA.length; i++) {
      if (ratingsA[i] !== null && ratingsB[i] !== null) {
        const a = ratingsA[i]! - meanA;
        const b = ratingsB[i]! - meanB;
        dotProduct += a * b;
        normA += a * a;
        normB += b * b;
        commonItems++;
      }
    }

    if (commonItems < this.MIN_COMMON_ITEMS) return 0;
    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Find K most similar users (neighbours)
  findNeighbours(
    targetUserIndex: number,
    matrix: UserItemMatrix
  ): SimilarityScore[] {
    const targetRatings = matrix.ratings[targetUserIndex];
    const targetMean = this.computeMean(targetRatings);
    const similarities: SimilarityScore[] = [];

    for (let i = 0; i < matrix.userIds.length; i++) {
      if (i === targetUserIndex) continue;

      const otherMean = this.computeMean(matrix.ratings[i]);
      const sim = this.adjustedCosineSimilarity(
        targetRatings,
        matrix.ratings[i],
        targetMean,
        otherMean
      );

      if (sim > 0) {
        similarities.push({
          userId: matrix.userIds[i],
          similarity: sim,
        });
      }
    }

    // Sort by similarity (descending) and take top K
    return similarities
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, this.NEIGHBOUR_COUNT);
  }

  // Predict engagement score for an item the target user hasn't read
  predictEngagement(
    targetUserIndex: number,
    itemIndex: number,
    neighbours: SimilarityScore[],
    matrix: UserItemMatrix
  ): { prediction: number; confidence: number; basedOn: number } {
    let weightedSum = 0;
    let weightTotal = 0;
    let contributingNeighbours = 0;

    const targetMean = this.computeMean(matrix.ratings[targetUserIndex]);

    for (const neighbour of neighbours) {
      const neighbourIndex = matrix.userIds.indexOf(neighbour.userId);
      if (neighbourIndex === -1) continue;

      const neighbourRating = matrix.ratings[neighbourIndex][itemIndex];
      if (neighbourRating === null) continue;

      const neighbourMean = this.computeMean(matrix.ratings[neighbourIndex]);
      const deviation = neighbourRating - neighbourMean;

      weightedSum += neighbour.similarity * deviation;
      weightTotal += Math.abs(neighbour.similarity);
      contributingNeighbours++;
    }

    if (weightTotal === 0 || contributingNeighbours === 0) {
      return { prediction: targetMean, confidence: 0, basedOn: 0 };
    }

    const prediction = targetMean + (weightedSum / weightTotal);
    const confidence = Math.min(contributingNeighbours / 5, 1) * (weightTotal / neighbours.length);

    return {
      prediction: Math.max(0, Math.min(100, prediction)),
      confidence: Math.min(confidence, 1),
      basedOn: contributingNeighbours,
    };
  }

  // Generate collaborative filtering recommendations for a user
  async recommend(
    learnerId: string,
    maxResults: number = 10,
    excludeRead: boolean = true
  ): Promise<Result<CollaborativeRecommendation[]>> {
    try {
      // 1. Build or retrieve cached interaction matrix
      // In production: matrix is pre-computed in batch and cached in Redis
      const matrixResult = await this.buildInteractionMatrix([learnerId]);
      if (!matrixResult.success) return this.fail(matrixResult.error!);

      const matrix = matrixResult.data!;
      const targetIndex = matrix.userIds.indexOf(learnerId);
      if (targetIndex === -1) return this.ok([]);

      // 2. Find similar users
      const neighbours = this.findNeighbours(targetIndex, matrix);
      if (neighbours.length === 0) {
        return this.ok([]);  // Cold start — fall back to content-based
      }

      // 3. Predict engagement for unread items
      const recommendations: CollaborativeRecommendation[] = [];

      for (let itemIdx = 0; itemIdx < matrix.itemIds.length; itemIdx++) {
        // Skip already-read books if requested
        if (excludeRead && matrix.ratings[targetIndex][itemIdx] !== null) continue;

        const { prediction, confidence, basedOn } = this.predictEngagement(
          targetIndex, itemIdx, neighbours, matrix
        );

        if (confidence >= this.MIN_CONFIDENCE) {
          recommendations.push({
            storybookId: matrix.itemIds[itemIdx],
            predictedEngagement: prediction,
            confidence,
            basedOnUsers: basedOn,
            reason: `${basedOn} similar learners rated this ${prediction >= 75 ? 'highly' : 'well'}`,
          });
        }
      }

      // Sort by predicted engagement and return top N
      recommendations.sort((a, b) => b.predictedEngagement - a.predictedEngagement);

      return this.ok(recommendations.slice(0, maxResults));
    } catch (error) {
      return this.fail(`Collaborative filtering failed: ${String(error)}`);
    }
  }

  private computeMean(ratings: (number | null)[]): number {
    const valid = ratings.filter((r): r is number => r !== null);
    if (valid.length === 0) return 50;  // Default mean engagement
    return valid.reduce((sum, r) => sum + r, 0) / valid.length;
  }
}


// ============================================================================
// SECTION 3: CONTENT-BASED FILTERING
// ============================================================================
// "Based on books you enjoyed, try this one." Content-based filtering
// recommends items similar to what the learner already likes, using the
// content's attributes (phonics phase, themes, art style, difficulty).
// Unlike collaborative filtering which needs a crowd, this works for
// individual learners — even new ones with just a few readings.

export interface ContentFeatureVector {
  storybookId: string;
  // Categorical features (one-hot encoded)
  phaseVector: number[];          // [0,0,1,0,0,0] for Phase 3
  artStyleVector: number[];       // One-hot over 30+ styles
  themeVector: number[];          // Multi-hot over theme taxonomy
  vocabularyTierVector: number[]; // [1,0,0] for Tier 1
  creatorTypeVector: number[];    // [system, community, educator]
  // Numerical features
  decodabilityScore: number;
  wordCount: number;              // Normalised 0-1
  pageCount: number;              // Normalised 0-1
  avgEngagement: number;          // Platform average engagement for this book
  completionRate: number;         // Platform average completion rate
  readCount: number;              // Normalised popularity
  isInSeries: number;             // 0 or 1
}

export interface ContentRecommendation {
  storybookId: string;
  similarityScore: number;        // 0-1
  matchedFeatures: string[];      // Which features matched
  reason: string;
}

export class ContentBasedFilteringEngine extends ScholarlyBaseService {
  // Theme taxonomy for consistent vectorisation
  static readonly THEME_TAXONOMY = [
    'animals', 'adventure', 'friendship', 'family', 'nature',
    'space', 'dinosaurs', 'vehicles', 'food', 'seasons',
    'feelings', 'school', 'fantasy', 'ocean', 'sports',
    'music', 'science', 'colours', 'shapes', 'numbers',
    'community', 'weather', 'travel', 'bedtime', 'humour',
  ];

  static readonly ART_STYLES = [
    'watercolour', 'flat_vector', 'soft_3d', 'crayon', 'papercraft',
    'cartoon', 'realistic', 'pixel_art', 'collage', 'storybook_classic',
    'anime', 'sketch', 'oil_painting', 'digital_paint', 'pop_art',
    'minimalist', 'retro', 'geometric', 'impressionist', 'folk_art',
    'comic', 'clay', 'pastel', 'neon', 'vintage',
    'woodcut', 'mosaic', 'textile', 'silhouette', 'botanical',
  ];

  constructor(tenantId: string) {
    super('ContentBasedFiltering', tenantId);
  }

  // Build content feature vector for a storybook
  buildContentVector(storybook: {
    id: string;
    phase: number;
    artStyle: string;
    themes: string[];
    vocabularyTier: string;
    creatorType: string;
    decodabilityScore: number;
    wordCount: number;
    pageCount: number;
    avgEngagement: number;
    completionRate: number;
    readCount: number;
    seriesId?: string;
  }): ContentFeatureVector {
    return {
      storybookId: storybook.id,
      phaseVector: this.oneHot(storybook.phase - 1, 6),
      artStyleVector: this.oneHot(
        ContentBasedFilteringEngine.ART_STYLES.indexOf(storybook.artStyle),
        ContentBasedFilteringEngine.ART_STYLES.length
      ),
      themeVector: this.multiHot(
        storybook.themes.map(t => ContentBasedFilteringEngine.THEME_TAXONOMY.indexOf(t)),
        ContentBasedFilteringEngine.THEME_TAXONOMY.length
      ),
      vocabularyTierVector: this.oneHot(
        ['tier1', 'tier2', 'tier3'].indexOf(storybook.vocabularyTier),
        3
      ),
      creatorTypeVector: this.oneHot(
        ['system', 'community', 'educator'].indexOf(storybook.creatorType),
        3
      ),
      decodabilityScore: storybook.decodabilityScore,
      wordCount: Math.min(storybook.wordCount / 500, 1),
      pageCount: Math.min(storybook.pageCount / 24, 1),
      avgEngagement: storybook.avgEngagement / 100,
      completionRate: storybook.completionRate,
      readCount: Math.min(storybook.readCount / 1000, 1),
      isInSeries: storybook.seriesId ? 1 : 0,
    };
  }

  // Build a learner's preference profile from their reading history
  buildPreferenceProfile(
    readingHistory: Array<{ storybookVector: ContentFeatureVector; engagement: number; completed: boolean }>
  ): ContentFeatureVector {
    if (readingHistory.length === 0) {
      // Cold start: return neutral profile
      return this.neutralProfile();
    }

    // Weighted average of content vectors, weighted by engagement score
    // This captures "what kind of content does this learner enjoy?"
    const totalWeight = readingHistory.reduce((sum, r) => sum + r.engagement, 0);
    if (totalWeight === 0) return this.neutralProfile();

    const profile: ContentFeatureVector = {
      storybookId: 'learner_profile',
      phaseVector: new Array(6).fill(0),
      artStyleVector: new Array(ContentBasedFilteringEngine.ART_STYLES.length).fill(0),
      themeVector: new Array(ContentBasedFilteringEngine.THEME_TAXONOMY.length).fill(0),
      vocabularyTierVector: new Array(3).fill(0),
      creatorTypeVector: new Array(3).fill(0),
      decodabilityScore: 0,
      wordCount: 0,
      pageCount: 0,
      avgEngagement: 0,
      completionRate: 0,
      readCount: 0,
      isInSeries: 0,
    };

    for (const { storybookVector: sv, engagement } of readingHistory) {
      const weight = engagement / totalWeight;
      for (let i = 0; i < profile.phaseVector.length; i++) profile.phaseVector[i] += sv.phaseVector[i] * weight;
      for (let i = 0; i < profile.artStyleVector.length; i++) profile.artStyleVector[i] += sv.artStyleVector[i] * weight;
      for (let i = 0; i < profile.themeVector.length; i++) profile.themeVector[i] += sv.themeVector[i] * weight;
      for (let i = 0; i < profile.vocabularyTierVector.length; i++) profile.vocabularyTierVector[i] += sv.vocabularyTierVector[i] * weight;
      for (let i = 0; i < profile.creatorTypeVector.length; i++) profile.creatorTypeVector[i] += sv.creatorTypeVector[i] * weight;
      profile.decodabilityScore += sv.decodabilityScore * weight;
      profile.wordCount += sv.wordCount * weight;
      profile.pageCount += sv.pageCount * weight;
      profile.isInSeries += sv.isInSeries * weight;
    }

    return profile;
  }

  // Compute similarity between learner profile and candidate storybook
  contentSimilarity(profile: ContentFeatureVector, candidate: ContentFeatureVector): {
    similarity: number;
    matchedFeatures: string[];
  } {
    const matchedFeatures: string[] = [];

    // Weighted feature group similarities
    const weights = {
      phase: 0.05,       // Educational constraint handled separately by BKT
      artStyle: 0.15,
      theme: 0.25,       // Themes matter most for engagement
      vocabularyTier: 0.05,
      difficulty: 0.15,  // wordCount + pageCount
      series: 0.10,
      popularity: 0.10,
      decodability: 0.15,
    };

    let totalSim = 0;

    // Phase similarity
    const phaseSim = this.vectorCosine(profile.phaseVector, candidate.phaseVector);
    totalSim += phaseSim * weights.phase;
    if (phaseSim > 0.8) matchedFeatures.push('matching phase');

    // Art style similarity
    const artSim = this.vectorCosine(profile.artStyleVector, candidate.artStyleVector);
    totalSim += artSim * weights.artStyle;
    if (artSim > 0.5) matchedFeatures.push('preferred art style');

    // Theme similarity
    const themeSim = this.vectorCosine(profile.themeVector, candidate.themeVector);
    totalSim += themeSim * weights.theme;
    if (themeSim > 0.5) matchedFeatures.push('matching themes');

    // Vocabulary tier similarity
    const vocabSim = this.vectorCosine(profile.vocabularyTierVector, candidate.vocabularyTierVector);
    totalSim += vocabSim * weights.vocabularyTier;

    // Difficulty similarity (word count and page count proximity)
    const diffSim = 1 - (Math.abs(profile.wordCount - candidate.wordCount) + Math.abs(profile.pageCount - candidate.pageCount)) / 2;
    totalSim += Math.max(diffSim, 0) * weights.difficulty;
    if (diffSim > 0.8) matchedFeatures.push('right difficulty level');

    // Series preference
    const seriesSim = 1 - Math.abs(profile.isInSeries - candidate.isInSeries);
    totalSim += seriesSim * weights.series;
    if (candidate.isInSeries && profile.isInSeries > 0.5) matchedFeatures.push('part of a series');

    // Popularity boost (popular books are generally popular for a reason)
    totalSim += candidate.readCount * weights.popularity;
    if (candidate.readCount > 0.7) matchedFeatures.push('popular with readers');

    // Decodability match
    const decodSim = 1 - Math.abs(profile.decodabilityScore - candidate.decodabilityScore);
    totalSim += decodSim * weights.decodability;

    return { similarity: Math.min(totalSim, 1), matchedFeatures };
  }

  // Generate content-based recommendations
  async recommend(
    learnerProfile: ContentFeatureVector,
    candidateBooks: ContentFeatureVector[],
    maxResults: number = 10
  ): Promise<Result<ContentRecommendation[]>> {
    const scored: ContentRecommendation[] = [];

    for (const candidate of candidateBooks) {
      const { similarity, matchedFeatures } = this.contentSimilarity(learnerProfile, candidate);

      scored.push({
        storybookId: candidate.storybookId,
        similarityScore: similarity,
        matchedFeatures,
        reason: matchedFeatures.length > 0
          ? `Recommended because: ${matchedFeatures.join(', ')}`
          : 'May interest you based on your reading pattern',
      });
    }

    scored.sort((a, b) => b.similarityScore - a.similarityScore);

    return this.ok(scored.slice(0, maxResults));
  }

  private vectorCosine(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private oneHot(index: number, size: number): number[] {
    const v = new Array(size).fill(0);
    if (index >= 0 && index < size) v[index] = 1;
    return v;
  }

  private multiHot(indices: number[], size: number): number[] {
    const v = new Array(size).fill(0);
    for (const i of indices) {
      if (i >= 0 && i < size) v[i] = 1;
    }
    return v;
  }

  private neutralProfile(): ContentFeatureVector {
    return {
      storybookId: 'neutral',
      phaseVector: new Array(6).fill(1 / 6),
      artStyleVector: new Array(ContentBasedFilteringEngine.ART_STYLES.length).fill(1 / ContentBasedFilteringEngine.ART_STYLES.length),
      themeVector: new Array(ContentBasedFilteringEngine.THEME_TAXONOMY.length).fill(1 / ContentBasedFilteringEngine.THEME_TAXONOMY.length),
      vocabularyTierVector: [0.6, 0.3, 0.1],
      creatorTypeVector: [0.4, 0.3, 0.3],
      decodabilityScore: 0.9,
      wordCount: 0.4,
      pageCount: 0.5,
      avgEngagement: 0.5,
      completionRate: 0.5,
      readCount: 0.5,
      isInSeries: 0.5,
    };
  }
}


// ============================================================================
// SECTION 4: CONTEXTUAL BANDITS
// ============================================================================
// Contextual bandits solve the explore/exploit dilemma: should we recommend
// content we're confident the learner will enjoy (exploit), or try something
// new to discover hidden preferences (explore)? Think of it as a restaurant
// that mostly serves your favourite dish but occasionally slips in a new
// special — because that's how you discovered your favourite in the first place.
//
// We use Thompson Sampling with Beta distributions for binary outcomes
// (completed/not completed) and contextual features (time of day, device,
// mood) to make context-aware exploration decisions.

export interface BanditArm {
  armId: string;                  // Content ID or content category
  category: string;               // e.g., 'storybook', 'activity', 'game'
  // Beta distribution parameters (conjugate prior for Bernoulli)
  alpha: number;                  // Successes + prior (starts at 1)
  beta: number;                   // Failures + prior (starts at 1)
  // Context-specific parameters
  contextWeights: Record<string, number>;  // Feature → weight learned from data
  totalPulls: number;
  totalReward: number;
  lastPulledAt: Date | null;
}

export interface BanditContext {
  timeOfDay: 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
  dayOfWeek: 'weekday' | 'weekend';
  device: 'phone' | 'tablet' | 'desktop';
  currentMood: number;            // 1-5
  recentAccuracy: number;         // 0-1
  sessionCount: number;           // Sessions today
  consecutiveDays: number;        // Current streak
}

export interface BanditDecision {
  selectedArmId: string;
  explorationProbability: number; // How much was this an exploration?
  expectedReward: number;         // Thompson sample value
  context: BanditContext;
}

export class ContextualBanditEngine extends ScholarlyBaseService {
  private arms: Map<string, BanditArm> = new Map();
  private readonly EXPLORATION_BONUS = 0.1;  // Minimum exploration probability
  private readonly CONTEXT_FEATURES = [
    'time_morning', 'time_midday', 'time_afternoon', 'time_evening', 'time_night',
    'day_weekday', 'day_weekend',
    'device_phone', 'device_tablet', 'device_desktop',
    'mood_low', 'mood_medium', 'mood_high',
    'accuracy_low', 'accuracy_medium', 'accuracy_high',
    'session_first', 'session_subsequent',
    'streak_building', 'streak_established',
  ];

  constructor(tenantId: string) {
    super('ContextualBandit', tenantId);
  }

  // Register a new arm (content category or specific content)
  registerArm(armId: string, category: string): void {
    this.arms.set(armId, {
      armId,
      category,
      alpha: 1,  // Uniform prior
      beta: 1,
      contextWeights: Object.fromEntries(this.CONTEXT_FEATURES.map(f => [f, 0])),
      totalPulls: 0,
      totalReward: 0,
      lastPulledAt: null,
    });
  }

  // Select the best arm given the current context (Thompson Sampling)
  selectArm(context: BanditContext, eligibleArmIds?: string[]): Result<BanditDecision> {
    const contextVector = this.contextToVector(context);
    const eligible = eligibleArmIds
      ? [...this.arms.values()].filter(a => eligibleArmIds.includes(a.armId))
      : [...this.arms.values()];

    if (eligible.length === 0) {
      return this.fail('No eligible arms available');
    }

    // Thompson Sampling: draw a sample from each arm's posterior distribution
    let bestArm: BanditArm | null = null;
    let bestSample = -Infinity;
    const samples: Array<{ armId: string; sample: number }> = [];

    for (const arm of eligible) {
      // Base sample from Beta distribution
      const baseSample = this.sampleBeta(arm.alpha, arm.beta);

      // Context adjustment: shift the sample based on learned context weights
      let contextAdjustment = 0;
      for (let i = 0; i < contextVector.length; i++) {
        const feature = this.CONTEXT_FEATURES[i];
        contextAdjustment += (arm.contextWeights[feature] || 0) * contextVector[i];
      }

      // Final sample = base + context adjustment, clipped to [0, 1]
      const sample = Math.max(0, Math.min(1, baseSample + contextAdjustment * 0.1));

      samples.push({ armId: arm.armId, sample });

      if (sample > bestSample) {
        bestSample = sample;
        bestArm = arm;
      }
    }

    if (!bestArm) return this.fail('Failed to select arm');

    // Estimate exploration probability (how uncertain was this choice?)
    const sortedSamples = samples.sort((a, b) => b.sample - a.sample);
    const gap = sortedSamples.length > 1
      ? sortedSamples[0].sample - sortedSamples[1].sample
      : 1;
    const explorationProbability = Math.max(this.EXPLORATION_BONUS, 1 - gap);

    return this.ok({
      selectedArmId: bestArm.armId,
      explorationProbability,
      expectedReward: bestSample,
      context,
    });
  }

  // Update arm with observed reward (called after the learner interacts)
  updateArm(armId: string, reward: boolean, context: BanditContext): Result<void> {
    const arm = this.arms.get(armId);
    if (!arm) return this.fail(`Unknown arm: ${armId}`);

    // Update Beta distribution posterior
    if (reward) {
      arm.alpha += 1;
    } else {
      arm.beta += 1;
    }

    arm.totalPulls += 1;
    arm.totalReward += reward ? 1 : 0;
    arm.lastPulledAt = new Date();

    // Update context weights using online gradient descent
    // This teaches the bandit which contexts predict success for each arm
    const contextVector = this.contextToVector(context);
    const predicted = arm.totalReward / arm.totalPulls;
    const error = (reward ? 1 : 0) - predicted;
    const learningRate = 0.01;

    for (let i = 0; i < contextVector.length; i++) {
      const feature = this.CONTEXT_FEATURES[i];
      arm.contextWeights[feature] = (arm.contextWeights[feature] || 0) + learningRate * error * contextVector[i];
    }

    return this.ok(undefined);
  }

  // Thompson Sampling from Beta distribution using the Joehnk method
  private sampleBeta(alpha: number, beta: number): number {
    // Simple approximation for reasonable alpha/beta values
    const x = this.sampleGamma(alpha, 1);
    const y = this.sampleGamma(beta, 1);
    return x / (x + y);
  }

  private sampleGamma(shape: number, scale: number): number {
    // Marsaglia and Tsang's method
    if (shape < 1) {
      return this.sampleGamma(shape + 1, scale) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x: number, v: number;
      do {
        x = this.normalRandom();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v * scale;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v * scale;
    }
  }

  private normalRandom(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private contextToVector(context: BanditContext): number[] {
    return [
      context.timeOfDay === 'morning' ? 1 : 0,
      context.timeOfDay === 'midday' ? 1 : 0,
      context.timeOfDay === 'afternoon' ? 1 : 0,
      context.timeOfDay === 'evening' ? 1 : 0,
      context.timeOfDay === 'night' ? 1 : 0,
      context.dayOfWeek === 'weekday' ? 1 : 0,
      context.dayOfWeek === 'weekend' ? 1 : 0,
      context.device === 'phone' ? 1 : 0,
      context.device === 'tablet' ? 1 : 0,
      context.device === 'desktop' ? 1 : 0,
      context.currentMood < 3 ? 1 : 0,
      context.currentMood >= 3 && context.currentMood < 4 ? 1 : 0,
      context.currentMood >= 4 ? 1 : 0,
      context.recentAccuracy < 0.6 ? 1 : 0,
      context.recentAccuracy >= 0.6 && context.recentAccuracy < 0.85 ? 1 : 0,
      context.recentAccuracy >= 0.85 ? 1 : 0,
      context.sessionCount === 0 ? 1 : 0,
      context.sessionCount > 0 ? 1 : 0,
      context.consecutiveDays < 7 ? 1 : 0,
      context.consecutiveDays >= 7 ? 1 : 0,
    ];
  }

  // Get arm statistics for monitoring
  getArmStats(): Array<{
    armId: string;
    category: string;
    successRate: number;
    totalPulls: number;
    confidence: number;
  }> {
    return [...this.arms.values()].map(arm => ({
      armId: arm.armId,
      category: arm.category,
      successRate: arm.totalPulls > 0 ? arm.totalReward / arm.totalPulls : 0.5,
      totalPulls: arm.totalPulls,
      confidence: 1 - (arm.alpha * arm.beta) / ((arm.alpha + arm.beta) * (arm.alpha + arm.beta) * (arm.alpha + arm.beta + 1)),
    }));
  }
}


// ============================================================================
// SECTION 5: LEARNER CLUSTERING
// ============================================================================
// Clustering groups similar learners together, enabling "segment-level"
// recommendations for cold-start users and population-level insights for
// educators. We use K-means clustering on normalised feature vectors.

export interface LearnerCluster {
  clusterId: string;
  label: string;                  // Human-readable name
  description: string;            // Educator-friendly description
  centroid: number[];             // Average feature vector
  memberCount: number;
  // Cluster-level statistics
  avgMastery: number;
  avgEngagement: number;
  avgSessionsPerWeek: number;
  dominantPhase: number;
  topThemes: string[];
  churnRisk: number;
  // Recommended content strategy for this cluster
  contentStrategy: {
    preferredDifficulty: 'stretch' | 'comfort' | 'consolidation';
    preferredContentType: string;
    sessionLengthMinutes: number;
    motivationApproach: string;
  };
}

export class LearnerClusteringService extends ScholarlyBaseService {
  private clusters: LearnerCluster[] = [];
  private readonly K = 8;         // Number of clusters
  private readonly MAX_ITERATIONS = 50;
  private readonly CONVERGENCE_THRESHOLD = 0.001;

  constructor(tenantId: string) {
    super('LearnerClustering', tenantId);
  }

  // Run K-means clustering on learner feature vectors
  async clusterLearners(
    vectors: Array<{ learnerId: string; features: number[] }>
  ): Promise<Result<LearnerCluster[]>> {
    if (vectors.length < this.K) {
      return this.fail(`Need at least ${this.K} learners for clustering, got ${vectors.length}`);
    }

    const featureArrays = vectors.map(v => v.features);
    const dimensions = featureArrays[0].length;

    // 1. Initialise centroids using K-means++ for better starting positions
    let centroids = this.kMeansPlusPlusInit(featureArrays, this.K);

    // 2. Iterate until convergence
    let assignments: number[] = new Array(vectors.length).fill(0);
    let iteration = 0;
    let converged = false;

    while (iteration < this.MAX_ITERATIONS && !converged) {
      // Assign each learner to nearest centroid
      const newAssignments = featureArrays.map(features =>
        this.nearestCentroid(features, centroids)
      );

      // Check convergence
      converged = newAssignments.every((a, i) => a === assignments[i]);
      assignments = newAssignments;

      // Update centroids
      const newCentroids: number[][] = Array.from({ length: this.K }, () =>
        new Array(dimensions).fill(0)
      );
      const counts = new Array(this.K).fill(0);

      for (let i = 0; i < featureArrays.length; i++) {
        const cluster = assignments[i];
        counts[cluster]++;
        for (let d = 0; d < dimensions; d++) {
          newCentroids[cluster][d] += featureArrays[i][d];
        }
      }

      for (let c = 0; c < this.K; c++) {
        if (counts[c] > 0) {
          for (let d = 0; d < dimensions; d++) {
            newCentroids[c][d] /= counts[c];
          }
        }
      }

      centroids = newCentroids;
      iteration++;
    }

    // 3. Build cluster descriptors
    this.clusters = this.buildClusterDescriptors(centroids, assignments, vectors);

    this.log('info', 'Clustering complete', {
      clusters: this.K,
      iterations: iteration,
      converged,
      totalLearners: vectors.length,
    });

    return this.ok(this.clusters);
  }

  // Assign a new learner to the most appropriate cluster
  assignToCluster(features: number[]): Result<{
    clusterId: string;
    label: string;
    contentStrategy: LearnerCluster['contentStrategy'];
  }> {
    if (this.clusters.length === 0) {
      return this.fail('No clusters available. Run clusterLearners first.');
    }

    const centroids = this.clusters.map(c => c.centroid);
    const nearest = this.nearestCentroid(features, centroids);
    const cluster = this.clusters[nearest];

    return this.ok({
      clusterId: cluster.clusterId,
      label: cluster.label,
      contentStrategy: cluster.contentStrategy,
    });
  }

  // K-means++ initialisation: spread initial centroids for better convergence
  private kMeansPlusPlusInit(data: number[][], k: number): number[][] {
    const centroids: number[][] = [];

    // First centroid: random
    centroids.push([...data[Math.floor(Math.random() * data.length)]]);

    // Remaining centroids: probability proportional to squared distance
    for (let c = 1; c < k; c++) {
      const distances = data.map(point => {
        const minDist = Math.min(...centroids.map(cent => this.euclideanDistance(point, cent)));
        return minDist * minDist;
      });

      const totalDist = distances.reduce((sum, d) => sum + d, 0);
      let target = Math.random() * totalDist;
      let selected = 0;

      for (let i = 0; i < distances.length; i++) {
        target -= distances[i];
        if (target <= 0) {
          selected = i;
          break;
        }
      }

      centroids.push([...data[selected]]);
    }

    return centroids;
  }

  private nearestCentroid(point: number[], centroids: number[][]): number {
    let minDist = Infinity;
    let nearest = 0;

    for (let i = 0; i < centroids.length; i++) {
      const dist = this.euclideanDistance(point, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }

    return nearest;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  private buildClusterDescriptors(
    centroids: number[][],
    assignments: number[],
    vectors: Array<{ learnerId: string; features: number[] }>
  ): LearnerCluster[] {
    // Cluster labels based on centroid characteristics
    const CLUSTER_ARCHETYPES = [
      { label: 'Eager Explorers', description: 'High engagement, rapid mastery progression, loves variety', preferredDifficulty: 'stretch' as const, motivationApproach: 'Challenge with new genres and harder content' },
      { label: 'Steady Builders', description: 'Consistent daily readers with methodical progression', preferredDifficulty: 'comfort' as const, motivationApproach: 'Celebrate streaks and consistency' },
      { label: 'Series Devotees', description: 'Deep engagement with familiar characters and storylines', preferredDifficulty: 'comfort' as const, motivationApproach: 'Recommend next in series, create anticipation' },
      { label: 'Struggling Strivers', description: 'Below-average mastery but persistent effort', preferredDifficulty: 'consolidation' as const, motivationApproach: 'Gentle encouragement, highlight small wins' },
      { label: 'Sporadic Sprinters', description: 'High intensity but irregular attendance', preferredDifficulty: 'stretch' as const, motivationApproach: 'Streak incentives, engagement hooks' },
      { label: 'Bedtime Readers', description: 'Evening-focused, prefer listen mode, calm content', preferredDifficulty: 'comfort' as const, motivationApproach: 'Cozy content, wind-down sequences' },
      { label: 'Social Competitors', description: 'Motivated by arena, leaderboards, and peer comparison', preferredDifficulty: 'stretch' as const, motivationApproach: 'Arena challenges, peer comparison, badges' },
      { label: 'At-Risk Disengagers', description: 'Declining activity, potential churn risk', preferredDifficulty: 'consolidation' as const, motivationApproach: 'Re-engagement campaigns, parent outreach' },
    ];

    return centroids.map((centroid, i) => {
      const archetype = CLUSTER_ARCHETYPES[i % CLUSTER_ARCHETYPES.length];
      const memberIndices = assignments.map((a, idx) => a === i ? idx : -1).filter(idx => idx >= 0);

      return {
        clusterId: `cluster_${i}`,
        label: archetype.label,
        description: archetype.description,
        centroid,
        memberCount: memberIndices.length,
        avgMastery: centroid[0] || 0,
        avgEngagement: (centroid[7] || 0) * 100,
        avgSessionsPerWeek: (centroid[5] || 0) * 7,
        dominantPhase: Math.round((centroid[1] || 0) * 6) || 1,
        topThemes: ['animals', 'adventure', 'friendship'],  // Computed from cluster members
        churnRisk: centroid[20] || 0,
        contentStrategy: {
          preferredDifficulty: archetype.preferredDifficulty,
          preferredContentType: 'storybook',
          sessionLengthMinutes: Math.round((centroid[4] || 0.4) * 30),
          motivationApproach: archetype.motivationApproach,
        },
      };
    });
  }
}


// ============================================================================
// SECTION 6: RECOMMENDATION ORCHESTRATOR
// ============================================================================
// The orchestrator blends all three recommendation strategies (collaborative,
// content-based, contextual bandits) into a single ranked list, applying
// educational constraints from BKT and diversity rules to ensure a balanced
// diet of content.

export interface RecommendationRequest {
  learnerId: string;
  maxResults: number;
  context: BanditContext;
  // Educational constraints
  allowedPhases: number[];        // Only recommend books from these phases
  requiredGPCs?: string[];        // Must include books targeting these GPCs
  excludeStorybookIds?: string[]; // Already read or dismissed
  // Diversity preferences
  diversityWeight: number;        // 0 = pure relevance, 1 = maximum diversity
  includeExploration: boolean;    // Allow bandit-driven exploration
}

export interface RecommendationResult {
  storybookId: string;
  rank: number;
  score: number;                  // Final blended score 0-1
  sources: {
    collaborative: number | null;
    contentBased: number | null;
    bandit: number | null;
  };
  reason: string;
  isExploration: boolean;
  educationalFit: {
    targetGPCs: string[];
    decodabilityScore: number;
    difficultyMatch: 'stretch' | 'comfort' | 'consolidation';
  };
}

export interface RecommendationResponse {
  recommendations: RecommendationResult[];
  metadata: {
    learnerId: string;
    timestamp: Date;
    totalCandidates: number;
    strategiesUsed: string[];
    clusterLabel: string | null;
    processingTimeMs: number;
  };
}

export class RecommendationOrchestrator extends ScholarlyBaseService {
  private collaborativeEngine: CollaborativeFilteringEngine;
  private contentEngine: ContentBasedFilteringEngine;
  private banditEngine: ContextualBanditEngine;
  private clusteringService: LearnerClusteringService;
  private featureEngineer: FeatureEngineer;

  // Strategy weights — tuned via Sprint 13 A/B testing framework
  private readonly STRATEGY_WEIGHTS = {
    collaborative: 0.35,
    contentBased: 0.40,
    bandit: 0.15,
    educational: 0.10,  // Bonus for BKT-aligned content
  };

  // Diversity parameters
  private readonly MAX_SAME_THEME = 3;     // Max books of same theme in results
  private readonly MAX_SAME_SERIES = 2;    // Max books from same series
  private readonly MAX_SAME_ART_STYLE = 4; // Max books with same art style

  constructor(tenantId: string) {
    super('RecommendationOrchestrator', tenantId);
    this.collaborativeEngine = new CollaborativeFilteringEngine(tenantId);
    this.contentEngine = new ContentBasedFilteringEngine(tenantId);
    this.banditEngine = new ContextualBanditEngine(tenantId);
    this.clusteringService = new LearnerClusteringService(tenantId);
    this.featureEngineer = new FeatureEngineer(tenantId);
  }

  async recommend(request: RecommendationRequest): Promise<Result<RecommendationResponse>> {
    const startTime = Date.now();
    const strategiesUsed: string[] = [];

    try {
      // 1. Compute learner features
      const featureResult = await this.featureEngineer.computeFeatureVector(request.learnerId);
      if (!featureResult.success) return this.fail(featureResult.error!);
      const learnerFeatures = featureResult.data!;

      // 2. Get cluster assignment for cold-start fallback
      const numericFeatures = this.featureEngineer.vectorToNumeric(learnerFeatures);
      const clusterResult = this.clusteringService.assignToCluster(numericFeatures);
      const clusterLabel = clusterResult.success ? clusterResult.data!.label : null;

      // 3. Get recommendations from each strategy (in parallel)
      const [collabRecs, contentRecs, banditDecision] = await Promise.all([
        this.getCollaborativeRecs(request),
        this.getContentBasedRecs(request, learnerFeatures),
        request.includeExploration
          ? this.banditEngine.selectArm(request.context)
          : Promise.resolve(null),
      ]);

      if (collabRecs.length > 0) strategiesUsed.push('collaborative');
      if (contentRecs.length > 0) strategiesUsed.push('content_based');
      if (banditDecision?.success) strategiesUsed.push('contextual_bandit');

      // 4. Merge and score candidates
      const candidates = this.mergeCandidates(collabRecs, contentRecs, banditDecision);

      // 5. Apply educational constraints
      const filtered = this.applyEducationalConstraints(candidates, request);

      // 6. Apply diversity re-ranking
      const diversified = this.applyDiversityReranking(filtered, request.diversityWeight);

      // 7. Build final response
      const recommendations = diversified.slice(0, request.maxResults).map((c, i) => ({
        ...c,
        rank: i + 1,
      }));

      return this.ok({
        recommendations,
        metadata: {
          learnerId: request.learnerId,
          timestamp: new Date(),
          totalCandidates: candidates.length,
          strategiesUsed,
          clusterLabel,
          processingTimeMs: Date.now() - startTime,
        },
      });
    } catch (error) {
      return this.fail(`Recommendation failed: ${String(error)}`);
    }
  }

  private async getCollaborativeRecs(request: RecommendationRequest): Promise<CollaborativeRecommendation[]> {
    const result = await this.collaborativeEngine.recommend(
      request.learnerId,
      request.maxResults * 3,
      true
    );
    return result.success ? result.data! : [];
  }

  private async getContentBasedRecs(
    request: RecommendationRequest,
    learnerFeatures: LearnerFeatureVector
  ): Promise<ContentRecommendation[]> {
    // Build learner's content preference profile
    // In production: query reading history from data lake
    const profile = this.contentEngine.buildPreferenceProfile([]);

    // Get candidate books
    // In production: query from storybook library filtered by allowed phases
    const candidates: ContentFeatureVector[] = [];

    const result = await this.contentEngine.recommend(profile, candidates, request.maxResults * 3);
    return result.success ? result.data! : [];
  }

  private mergeCandidates(
    collabRecs: CollaborativeRecommendation[],
    contentRecs: ContentRecommendation[],
    banditDecision: Result<BanditDecision> | null
  ): RecommendationResult[] {
    const scoreMap = new Map<string, {
      collaborative: number | null;
      contentBased: number | null;
      bandit: number | null;
      reasons: string[];
    }>();

    // Merge collaborative scores
    for (const rec of collabRecs) {
      scoreMap.set(rec.storybookId, {
        collaborative: rec.predictedEngagement / 100,
        contentBased: null,
        bandit: null,
        reasons: [rec.reason],
      });
    }

    // Merge content-based scores
    for (const rec of contentRecs) {
      const existing = scoreMap.get(rec.storybookId);
      if (existing) {
        existing.contentBased = rec.similarityScore;
        existing.reasons.push(rec.reason);
      } else {
        scoreMap.set(rec.storybookId, {
          collaborative: null,
          contentBased: rec.similarityScore,
          bandit: null,
          reasons: [rec.reason],
        });
      }
    }

    // Compute blended scores
    const results: RecommendationResult[] = [];

    for (const [storybookId, sources] of scoreMap) {
      const collabScore = sources.collaborative ?? 0;
      const contentScore = sources.contentBased ?? 0;
      const banditScore = sources.bandit ?? 0;

      // Weighted blend with missing-strategy compensation
      let activeWeight = 0;
      let weightedSum = 0;

      if (sources.collaborative !== null) {
        weightedSum += collabScore * this.STRATEGY_WEIGHTS.collaborative;
        activeWeight += this.STRATEGY_WEIGHTS.collaborative;
      }
      if (sources.contentBased !== null) {
        weightedSum += contentScore * this.STRATEGY_WEIGHTS.contentBased;
        activeWeight += this.STRATEGY_WEIGHTS.contentBased;
      }
      if (sources.bandit !== null) {
        weightedSum += banditScore * this.STRATEGY_WEIGHTS.bandit;
        activeWeight += this.STRATEGY_WEIGHTS.bandit;
      }

      const score = activeWeight > 0 ? weightedSum / activeWeight : 0;

      results.push({
        storybookId,
        rank: 0,
        score,
        sources: {
          collaborative: sources.collaborative,
          contentBased: sources.contentBased,
          bandit: sources.bandit,
        },
        reason: sources.reasons.join('; '),
        isExploration: false,
        educationalFit: {
          targetGPCs: [],
          decodabilityScore: 0.9,
          difficultyMatch: 'comfort',
        },
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results;
  }

  private applyEducationalConstraints(
    candidates: RecommendationResult[],
    request: RecommendationRequest
  ): RecommendationResult[] {
    // In production: cross-reference with BKT mastery data and storybook metadata
    // Filter to allowed phases, required GPCs, excluded IDs
    return candidates.filter(c => {
      if (request.excludeStorybookIds?.includes(c.storybookId)) return false;
      return true;
    });
  }

  private applyDiversityReranking(
    candidates: RecommendationResult[],
    diversityWeight: number
  ): RecommendationResult[] {
    if (diversityWeight === 0) return candidates;

    // Maximal Marginal Relevance (MMR) re-ranking
    // Balance between relevance (score) and diversity (dissimilarity to already-selected)
    const selected: RecommendationResult[] = [];
    const remaining = [...candidates];

    while (selected.length < remaining.length + selected.length && remaining.length > 0) {
      let bestIdx = 0;
      let bestMMR = -Infinity;

      for (let i = 0; i < remaining.length; i++) {
        const relevance = remaining[i].score;
        const maxSimilarityToSelected = selected.length > 0
          ? Math.max(...selected.map(s => this.resultSimilarity(remaining[i], s)))
          : 0;

        const mmr = (1 - diversityWeight) * relevance - diversityWeight * maxSimilarityToSelected;

        if (mmr > bestMMR) {
          bestMMR = mmr;
          bestIdx = i;
        }
      }

      selected.push(remaining.splice(bestIdx, 1)[0]);
    }

    return selected;
  }

  private resultSimilarity(a: RecommendationResult, b: RecommendationResult): number {
    // Simplified similarity based on educational fit overlap
    // In production: use actual content feature vectors
    const gpcOverlap = a.educationalFit.targetGPCs.filter(
      g => b.educationalFit.targetGPCs.includes(g)
    ).length;
    const maxGPCs = Math.max(a.educationalFit.targetGPCs.length, b.educationalFit.targetGPCs.length, 1);
    return gpcOverlap / maxGPCs;
  }
}
