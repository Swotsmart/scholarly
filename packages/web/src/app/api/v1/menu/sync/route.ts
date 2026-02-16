import { MenuSyncService } from '@/services/menu-sync.service';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = new MenuSyncService();
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Missing user ID' }, { status: 400 });
  }

  const state = await service.getMenuState(userId);
  return Response.json(state);
}

export async function PUT(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return Response.json({ error: 'Missing user ID' }, { status: 400 });
  }

  const body = await request.json();
  const service = new MenuSyncService();
  const result = await service.syncMenuState(userId, body);
  return Response.json(result);
}
