import { PrismaMenuStateRepository } from '@/repositories/menu-state.repository';

const repository = new PrismaMenuStateRepository();

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = request.headers.get('x-user-id');
  const tenantId = request.headers.get('x-tenant-id');
  const role = request.headers.get('x-role-id');
  if (!userId || !tenantId || !role) {
    return Response.json({ error: 'Missing user ID, tenant ID, or role' }, { status: 400 });
  }

  const state = await repository.getMenuState(userId, tenantId, role);
  return Response.json(state);
}

export async function PUT(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = request.headers.get('x-user-id');
  const tenantId = request.headers.get('x-tenant-id');
  const role = request.headers.get('x-role-id');
  if (!userId || !tenantId || !role) {
    return Response.json({ error: 'Missing user ID, tenant ID, or role' }, { status: 400 });
  }

  const body = await request.json();
  const { items, version } = body as { items: unknown; version: number };

  const result = await repository.saveMenuState(userId, tenantId, role, items, version);
  return Response.json(result);
}
