import { PrismaMenuAnalyticsRepository } from '@/repositories/menu-analytics.repository';

const repository = new PrismaMenuAnalyticsRepository();

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tenantId = request.headers.get('x-tenant-id') ?? 'default';

  const events = await repository.getEventsSince(tenantId, startOfDay);

  let promotions = 0;
  let decays = 0;
  let seedsAccepted = 0;
  let seedsDismissed = 0;

  for (const event of events) {
    switch (event.eventType) {
      case 'navigation':
      case 'command_palette':
        promotions++;
        break;
      case 'seed_pin':
        seedsAccepted++;
        break;
      case 'seed_dismiss':
        seedsDismissed++;
        break;
      case 'decay':
        decays++;
        break;
    }
  }

  const aggregate = await repository.saveDailyAggregate({
    tenantId,
    date: startOfDay,
    totalEvents: events.length,
    promotions,
    decays,
    seedsAccepted,
    seedsDismissed,
    pushesCreated: 0,
    pushesExpired: 0,
    avgMenuSize: 0,
    topItems: [],
  });

  return Response.json(aggregate);
}
