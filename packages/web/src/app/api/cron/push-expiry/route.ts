import { PushExpiryHandler } from '@/services/push-expiry-handler';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const handler = new PushExpiryHandler();
  const result = await handler.processExpiredPushes();
  return Response.json(result);
}
