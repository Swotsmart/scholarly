/**
 * MathCanvas Scoring Methods
 *
 * Extracted into standalone file to avoid pulling in arena-competition-engine.ts
 * and its unresolved sprint blueprint imports (../shared/types, ../tokenomics/).
 */

export class MathScoringMethods {
  static calculateMathScore(
    submission: {
      round: number; accuracy: number; timeSeconds: number;
      visualisationScore?: number; constructionScore?: number;
      eleganceScore?: number; curriculumHits?: number;
      stepsToSolution?: number; collaborationScore?: number;
    },
    config: { format: string; scoringModel: string },
    participant: { handicapFactor: number },
  ) {
    const vis = submission.visualisationScore ?? 0;
    const constr = submission.constructionScore ?? 0;
    const eleg = submission.eleganceScore ?? 0;
    const curHits = submission.curriculumHits ?? 0;
    const steps = submission.stepsToSolution ?? 10;
    const collab = submission.collaborationScore ?? 0;

    const weights =
      config.format === 'MATH_CONSTRUCTION' ? { vis: 0.25, constr: 0.50, eleg: 0.25 } :
      config.format === 'MATH_RELAY' ? { vis: 0.30, constr: 0.50, eleg: 0.20 } :
      { vis: 0.40, constr: 0.40, eleg: 0.20 };

    let rawScore = Math.round(
      vis * weights.vis * 100 + constr * weights.constr * 100 + eleg * weights.eleg * 100,
    ) / 100;
    rawScore = Math.min(100, Math.max(0, rawScore));

    let bonusPoints = 0;
    bonusPoints += Math.min(15, curHits * 3);
    if (steps <= 3) bonusPoints += 10;
    else if (steps <= 5) bonusPoints += 5;
    if ((config.format === 'MATH_CHALLENGE' || config.format === 'MATH_RELAY') && submission.timeSeconds < 60) {
      bonusPoints += 8;
    } else if (submission.timeSeconds < 120) {
      bonusPoints += 4;
    }
    if (config.format === 'MATH_CONSTRUCTION') {
      bonusPoints += Math.round(collab * 0.1);
    }

    let totalPoints = rawScore + bonusPoints;
    if (config.scoringModel === 'HANDICAPPED') {
      totalPoints = Math.round(totalPoints * participant.handicapFactor);
    }

    return {
      round: submission.round, accuracy: submission.accuracy,
      wordsCorrect: 0, wordsAttempted: 0, wcpm: 0,
      comprehensionScore: constr,
      timeSeconds: submission.timeSeconds,
      growthPoints: Math.round(rawScore), bonusPoints, totalPoints,
      submittedAt: new Date(),
    };
  }

  static calculateMathHandicap(domainMasteryAvg: number, isTeacher: boolean = false): number {
    if (isTeacher) return 0.6;
    const pct = domainMasteryAvg * 100;
    if (pct < 40) return 1.30;
    if (pct < 60) return 1.15;
    if (pct < 80) return 1.05;
    if (pct < 90) return 1.00;
    return 0.90;
  }
}

export function isMathFormat(format: string): boolean {
  return format === 'MATH_CHALLENGE' || format === 'MATH_CONSTRUCTION' || format === 'MATH_RELAY';
}
