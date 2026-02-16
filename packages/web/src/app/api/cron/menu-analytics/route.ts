import { MenuAnalyticsService, InMemoryAnalyticsRepository } from '@/services/menu-analytics.service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const repository = new InMemoryAnalyticsRepository();
  const service = new MenuAnalyticsService(repository);
  const targetDate = new Date().toISOString().split('T')[0]!;
  const result = await service.runDailyAggregation(targetDate);
  return Response.json(result);
}
