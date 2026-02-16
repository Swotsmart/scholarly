import { MenuAnalyticsService } from '@/services/menu-analytics.service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = new MenuAnalyticsService();
  const result = await service.aggregateDaily(new Date());
  return Response.json(result);
}
