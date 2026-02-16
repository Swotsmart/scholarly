import {
  MenuSyncService,
  InMemoryMenuStateRepository,
  InMemoryLocalMenuStore,
  InMemorySyncEventEmitter,
} from '@/services/menu-sync.service';

const repository = new InMemoryMenuStateRepository();
const localStore = new InMemoryLocalMenuStore();
const events = new InMemorySyncEventEmitter();

function createService(): MenuSyncService {
  return new MenuSyncService(repository, localStore, events);
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = request.headers.get('x-user-id');
  const roleId = request.headers.get('x-role-id');
  if (!userId || !roleId) {
    return Response.json({ error: 'Missing user ID or role ID' }, { status: 400 });
  }

  const state = await repository.getMenuState(userId, roleId);
  return Response.json(state);
}

export async function PUT(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = request.headers.get('x-user-id');
  const roleId = request.headers.get('x-role-id');
  if (!userId || !roleId) {
    return Response.json({ error: 'Missing user ID or role ID' }, { status: 400 });
  }

  const service = createService();
  const result = await service.syncOnSessionStart(userId, roleId);
  return Response.json(result);
}
