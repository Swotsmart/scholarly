import { AnalyticsDashboard } from '@/components/analytics-dashboard';

export default function MenuAnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Menu Analytics</h1>
      <AnalyticsDashboard
        dateRange="last_30_days"
        roles={['teacher', 'parent', 'learner', 'tutor', 'admin']}
      />
    </div>
  );
}
