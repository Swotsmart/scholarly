'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2, Clock, Shield, Users, BarChart3, BookOpen,
  Loader2, Star, AlertCircle, Sparkles, ArrowRight, Eye,
} from 'lucide-react';
import { storybookApi } from '@/lib/storybook-api';
import type { ReviewItem, ReviewStage, PeerReviewInput } from '@/types/storybook';

// ---------------------------------------------------------------------------
// Stage definitions — the 5-stage quality gate
// ---------------------------------------------------------------------------
const STAGES: Array<{
  key: ReviewStage;
  label: string;
  icon: typeof Shield;
  description: string;
  color: string;
}> = [
  { key: 'automated_validation', label: 'Automated Validation', icon: Shield, description: 'Decodability, vocabulary, safety, metadata checks', color: 'text-blue-600' },
  { key: 'ai_review', label: 'AI Review', icon: Sparkles, description: 'Claude reviews pedagogy, coherence, age-appropriateness', color: 'text-purple-600' },
  { key: 'peer_review', label: 'Peer Review', icon: Users, description: 'Verified educators review curriculum alignment', color: 'text-amber-600' },
  { key: 'pilot_testing', label: 'Pilot Testing', icon: BarChart3, description: 'Released to small cohort, analytics collected', color: 'text-green-600' },
  { key: 'published', label: 'Published', icon: CheckCircle2, description: 'Available in the main library', color: 'text-emerald-600' },
];

function stageIndex(stage: ReviewStage): number {
  const idx = STAGES.findIndex(s => s.key === stage);
  return idx >= 0 ? idx : 0;
}

// ---------------------------------------------------------------------------
// Fallback review items (DEMO_MODE)
// ---------------------------------------------------------------------------
const DEMO_REVIEWS: ReviewItem[] = [
  { id: 'rev-001', contentId: 'story-001', tenantId: 'tenant-001', currentStage: 'peer_review', automatedScore: 94, aiReviewScore: 88, peerReviewScore: null, pilotMetrics: null, status: 'in_review', createdAt: '2026-02-20T00:00:00Z', updatedAt: '2026-02-22T00:00:00Z' },
  { id: 'rev-002', contentId: 'story-002', tenantId: 'tenant-001', currentStage: 'pilot_testing', automatedScore: 96, aiReviewScore: 91, peerReviewScore: 4.5, pilotMetrics: { completionRate: 0.87, avgAccuracy: 0.82 }, status: 'testing', createdAt: '2026-02-10T00:00:00Z', updatedAt: '2026-02-25T00:00:00Z' },
  { id: 'rev-003', contentId: 'story-003', tenantId: 'tenant-001', currentStage: 'automated_validation', automatedScore: null, aiReviewScore: null, peerReviewScore: null, pilotMetrics: null, status: 'pending', createdAt: '2026-03-01T00:00:00Z', updatedAt: '2026-03-01T00:00:00Z' },
  { id: 'rev-004', contentId: 'story-004', tenantId: 'tenant-001', currentStage: 'published', automatedScore: 98, aiReviewScore: 95, peerReviewScore: 4.8, pilotMetrics: { completionRate: 0.92, avgAccuracy: 0.89 }, status: 'published', createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-02-01T00:00:00Z' },
];

// ---------------------------------------------------------------------------
// Peer Review Form (inline component)
// ---------------------------------------------------------------------------
function PeerReviewForm({ reviewId, onSubmitted }: { reviewId: string; onSubmitted: () => void }) {
  const [rating, setRating] = useState(4);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await storybookApi.review.submitPeerReview(reviewId, { rating, comment: comment || undefined, wouldRecommend: rating >= 3 });
      onSubmitted();
    } catch {
      // graceful degradation
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3 mt-4 p-4 rounded-lg border bg-muted/30">
      <p className="text-sm font-medium">Submit Your Review</p>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rating:</span>
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} onClick={() => setRating(n)} className="focus:outline-none">
            <Star className={`h-5 w-5 ${n <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
          </button>
        ))}
        <span className="text-sm font-medium ml-1">{rating}/5</span>
      </div>
      <Input
        placeholder="Comments on curriculum alignment, quality, engagement..."
        value={comment}
        onChange={e => setComment(e.target.value)}
      />
      <Button onClick={handleSubmit} disabled={submitting} size="sm">
        {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
        Submit Review
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function StorybookReviewPage() {
  const [reviews, setReviews] = useState<ReviewItem[]>(DEMO_REVIEWS);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);

  const filtered = filter === 'all'
    ? reviews
    : reviews.filter(r => r.currentStage === filter);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Review Pipeline</h1>
          <p className="text-muted-foreground">
            Five-stage quality gate ensuring every storybook meets educational standards
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {reviews.length} in pipeline
        </Badge>
      </div>

      {/* Stage progress overview */}
      <div className="grid gap-3 md:grid-cols-5">
        {STAGES.map((stage, i) => {
          const count = reviews.filter(r => r.currentStage === stage.key).length;
          const Icon = stage.icon;
          return (
            <Card key={stage.key} className={`cursor-pointer transition-shadow hover:shadow-md ${filter === stage.key ? 'ring-2 ring-primary' : ''}`} onClick={() => setFilter(filter === stage.key ? 'all' : stage.key)}>
              <CardContent className="p-4 text-center">
                <Icon className={`h-6 w-6 mx-auto mb-2 ${stage.color}`} />
                <p className="text-xs font-medium">{stage.label}</p>
                <p className="text-2xl font-bold mt-1">{count}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Review items */}
      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No items at this stage</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map(review => {
            const current = stageIndex(review.currentStage);
            const progressPct = Math.round(((current + 1) / STAGES.length) * 100);
            const isExpanded = expandedReview === review.id;
            const Stage = STAGES[current];

            return (
              <Card key={review.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">Content: {review.contentId}</h3>
                        <Badge variant="secondary" className="text-xs capitalize">
                          <Stage.icon className={`h-3 w-3 mr-1 ${Stage.color}`} />
                          {Stage.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Submitted {new Date(review.createdAt).toLocaleDateString()} · Last updated {new Date(review.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setExpandedReview(isExpanded ? null : review.id)}>
                      <Eye className="h-4 w-4 mr-1" />
                      {isExpanded ? 'Collapse' : 'Details'}
                    </Button>
                  </div>

                  {/* Stage progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Pipeline Progress</span>
                      <span>{progressPct}%</span>
                    </div>
                    <Progress value={progressPct} className="h-2" />
                    <div className="flex justify-between mt-2">
                      {STAGES.map((s, i) => {
                        const passed = i <= current;
                        return (
                          <div key={s.key} className={`flex items-center gap-0.5 text-[10px] ${passed ? s.color : 'text-muted-foreground/40'}`}>
                            {passed ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            <span className="hidden md:inline">{s.label.split(' ')[0]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs text-muted-foreground">Automated Score</p>
                          <p className="text-lg font-bold">{review.automatedScore != null ? `${review.automatedScore}%` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">AI Review Score</p>
                          <p className="text-lg font-bold">{review.aiReviewScore != null ? `${review.aiReviewScore}%` : '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Peer Review</p>
                          <p className="text-lg font-bold">{review.peerReviewScore != null ? `${review.peerReviewScore}/5` : '—'}</p>
                        </div>
                      </div>

                      {review.pilotMetrics && (
                        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3">
                          <p className="text-xs font-medium text-green-800 dark:text-green-400 mb-1">Pilot Testing Metrics</p>
                          <div className="flex gap-4 text-sm">
                            <span>Completion: {Math.round((review.pilotMetrics as Record<string, number>).completionRate * 100)}%</span>
                            <span>Accuracy: {Math.round((review.pilotMetrics as Record<string, number>).avgAccuracy * 100)}%</span>
                          </div>
                        </div>
                      )}

                      {/* Show peer review form if at peer_review stage */}
                      {review.currentStage === 'peer_review' && (
                        <PeerReviewForm reviewId={review.id} onSubmitted={() => setExpandedReview(null)} />
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
