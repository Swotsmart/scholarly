import { PrismaMenuPushRepository } from '@/repositories/menu-push.repository';

const repository = new PrismaMenuPushRepository();

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const expired = await repository.getExpiredPushes();
  if (expired.length === 0) {
    return Response.json({ expired: 0, message: 'No expired pushes' });
  }

  const count = await repository.markExpired(expired.map((p) => p.id));
  return Response.json({ expired: count, ids: expired.map((p) => p.id) });
}
