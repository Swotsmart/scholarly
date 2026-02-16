import { PushExpiryHandler, InMemoryExpiryLogger } from '@/services/push-expiry-handler';
import { AdminPushService, InMemoryPushRepository, InMemoryPushEventEmitter } from '@/services/admin-push.service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const repository = new InMemoryPushRepository();
  const eventEmitter = new InMemoryPushEventEmitter();
  const pushService = new AdminPushService(repository, eventEmitter);
  const logger = new InMemoryExpiryLogger();
  const handler = new PushExpiryHandler(pushService, logger);
  const result = await handler.runOnce();
  return Response.json(result);
}
