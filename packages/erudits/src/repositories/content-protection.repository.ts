/**
 * ============================================================================
 * Content Protection Repositories — Persistence Layer
 * ============================================================================
 */

import type { ListFilter, PaginatedResult, StrictPartial,
} from '../types/erudits.types';
import type {
  ContentProtectionPolicy, DeviceRegistration, ContentSession,
  DownloadRecord, EncryptionKeyRecord, ContentViolation,
  ContentProtectionPolicyRepository, DeviceRegistrationRepository,
  ContentSessionRepository, DownloadRecordRepository,
  EncryptionKeyRepository, ContentViolationRepository,
} from '../types/content-protection.types';

interface PrismaDelegate<T> {
  create(args: { data: any }): Promise<T>;
  findUnique(args: { where: any }): Promise<T | null>;
  findFirst(args: { where: any; orderBy?: any }): Promise<T | null>;
  findMany(args: { where: any; skip?: number; take?: number; orderBy?: any }): Promise<T[]>;
  update(args: { where: any; data: any }): Promise<T>;
  count(args: { where: any }): Promise<number>;
}

function paginate<T>(items: T[], total: number, filter: ListFilter): PaginatedResult<T> {
  const ps = filter.pageSize || 20;
  return { items, total, page: filter.page || 1, pageSize: ps, totalPages: Math.ceil(total / ps) };
}

function skipTake(filter: ListFilter): { skip: number; take: number } {
  const ps = filter.pageSize || 20;
  return { skip: ((filter.page || 1) - 1) * ps, take: ps };
}

// ── Policy ──

export class PrismaContentProtectionPolicyRepository implements ContentProtectionPolicyRepository {
  constructor(private readonly delegate: PrismaDelegate<ContentProtectionPolicy>) {}

  async save(_tenantId: string, policy: ContentProtectionPolicy): Promise<ContentProtectionPolicy> {
    return this.delegate.create({ data: policy });
  }
  async findByResource(_tenantId: string, resourceId: string): Promise<ContentProtectionPolicy | null> {
    return this.delegate.findFirst({ where: { resourceId } });
  }
  async update(_tenantId: string, resourceId: string, updates: StrictPartial<ContentProtectionPolicy>): Promise<ContentProtectionPolicy> {
    const existing = await this.delegate.findFirst({ where: { resourceId } });
    if (!existing) throw new Error(`Policy not found for resource ${resourceId}`);
    return this.delegate.update({ where: { id: existing.id }, data: { ...updates, updatedAt: new Date() } });
  }
  async findByAuthor(tenantId: string, _authorId: string, filter: ListFilter): Promise<PaginatedResult<ContentProtectionPolicy>> {
    const where = { tenantId };
    const [items, total] = await Promise.all([
      this.delegate.findMany({ where, ...skipTake(filter), orderBy: { updatedAt: 'desc' } }),
      this.delegate.count({ where }),
    ]);
    return paginate(items, total, filter);
  }
}

// ── Device Registration ──

export class PrismaDeviceRegistrationRepository implements DeviceRegistrationRepository {
  constructor(private readonly delegate: PrismaDelegate<DeviceRegistration>) {}

  async save(_tenantId: string, device: DeviceRegistration): Promise<DeviceRegistration> {
    return this.delegate.create({ data: device });
  }
  async findById(tenantId: string, id: string): Promise<DeviceRegistration | null> {
    return this.delegate.findFirst({ where: { id, tenantId } });
  }
  async findByLicence(tenantId: string, licenceId: string): Promise<DeviceRegistration[]> {
    return this.delegate.findMany({ where: { tenantId, licenceId }, orderBy: { createdAt: 'desc' } });
  }
  async findByFingerprint(tenantId: string, licenceId: string, fingerprint: string): Promise<DeviceRegistration | null> {
    return this.delegate.findFirst({ where: { tenantId, licenceId, fingerprint } });
  }
  async countActiveByLicence(_tenantId: string, licenceId: string): Promise<number> {
    return this.delegate.count({ where: { licenceId, status: 'active' } });
  }
  async update(_tenantId: string, id: string, updates: StrictPartial<DeviceRegistration>): Promise<DeviceRegistration> {
    return this.delegate.update({ where: { id }, data: { ...updates, updatedAt: new Date() } });
  }
  async deactivate(_tenantId: string, id: string, reason: string, deregisteredBy: string): Promise<void> {
    await this.delegate.update({
      where: { id },
      data: { status: 'deregistered', deregisteredAt: new Date(), deregisteredBy, deregistrationReason: reason, updatedAt: new Date() },
    });
  }
}

// ── Content Session ──

export class PrismaContentSessionRepository implements ContentSessionRepository {
  constructor(private readonly delegate: PrismaDelegate<ContentSession>) {}

  async save(_tenantId: string, session: ContentSession): Promise<ContentSession> {
    return this.delegate.create({ data: session });
  }
  async findById(tenantId: string, id: string): Promise<ContentSession | null> {
    return this.delegate.findFirst({ where: { id, tenantId } });
  }
  async findActiveByLicence(tenantId: string, licenceId: string): Promise<ContentSession[]> {
    return this.delegate.findMany({ where: { tenantId, licenceId, status: 'active' }, orderBy: { startedAt: 'desc' } });
  }
  async findActiveByResource(tenantId: string, resourceId: string): Promise<ContentSession[]> {
    return this.delegate.findMany({ where: { tenantId, resourceId, status: 'active' }, orderBy: { startedAt: 'desc' } });
  }
  async countActiveByLicence(_tenantId: string, licenceId: string): Promise<number> {
    return this.delegate.count({ where: { licenceId, status: 'active' } });
  }
  async update(_tenantId: string, id: string, updates: StrictPartial<ContentSession>): Promise<ContentSession> {
    return this.delegate.update({ where: { id }, data: { ...updates, updatedAt: new Date() } });
  }
  async terminateExpired(_tenantId: string): Promise<number> {
    // Production: batch UPDATE ... WHERE expiresAt < NOW() AND status = 'active'
    return 0;
  }
}

// ── Download Record ──

export class PrismaDownloadRecordRepository implements DownloadRecordRepository {
  constructor(private readonly delegate: PrismaDelegate<DownloadRecord>) {}

  async save(_tenantId: string, record: DownloadRecord): Promise<DownloadRecord> {
    return this.delegate.create({ data: record });
  }
  async findById(tenantId: string, id: string): Promise<DownloadRecord | null> {
    return this.delegate.findFirst({ where: { id, tenantId } });
  }
  async findByFingerprint(fingerprint: string): Promise<DownloadRecord | null> {
    return this.delegate.findFirst({ where: { steganographicFingerprint: fingerprint } });
  }
  async findByResource(tenantId: string, resourceId: string, filter: ListFilter): Promise<PaginatedResult<DownloadRecord>> {
    const where = { tenantId, resourceId };
    const [items, total] = await Promise.all([
      this.delegate.findMany({ where, ...skipTake(filter), orderBy: { createdAt: 'desc' } }),
      this.delegate.count({ where }),
    ]);
    return paginate(items, total, filter);
  }
  async findByUser(tenantId: string, userId: string, filter: ListFilter): Promise<PaginatedResult<DownloadRecord>> {
    const where = { tenantId, userId };
    const [items, total] = await Promise.all([
      this.delegate.findMany({ where, ...skipTake(filter), orderBy: { createdAt: 'desc' } }),
      this.delegate.count({ where }),
    ]);
    return paginate(items, total, filter);
  }
  async countByDeviceAndResource(_tenantId: string, deviceId: string, resourceId: string): Promise<number> {
    return this.delegate.count({ where: { deviceRegistrationId: deviceId, resourceId } });
  }
}

// ── Encryption Key ──

export class PrismaEncryptionKeyRepository implements EncryptionKeyRepository {
  constructor(private readonly delegate: PrismaDelegate<EncryptionKeyRecord>) {}

  async save(_tenantId: string, key: EncryptionKeyRecord): Promise<EncryptionKeyRecord> {
    return this.delegate.create({ data: key });
  }
  async findActiveByResource(tenantId: string, resourceId: string): Promise<EncryptionKeyRecord | null> {
    return this.delegate.findFirst({ where: { tenantId, resourceId, isActive: true }, orderBy: { keyVersion: 'desc' } });
  }
  async findByVersion(tenantId: string, resourceId: string, version: number): Promise<EncryptionKeyRecord | null> {
    return this.delegate.findFirst({ where: { tenantId, resourceId, keyVersion: version } });
  }
  async deactivate(_tenantId: string, resourceId: string, version: number): Promise<void> {
    const key = await this.delegate.findFirst({ where: { resourceId, keyVersion: version } });
    if (key) await this.delegate.update({ where: { id: key.id }, data: { isActive: false, updatedAt: new Date() } });
  }
}

// ── Violation ──

export class PrismaContentViolationRepository implements ContentViolationRepository {
  constructor(private readonly delegate: PrismaDelegate<ContentViolation>) {}

  async save(_tenantId: string, violation: ContentViolation): Promise<ContentViolation> {
    return this.delegate.create({ data: violation });
  }
  async findById(tenantId: string, id: string): Promise<ContentViolation | null> {
    return this.delegate.findFirst({ where: { id, tenantId } });
  }
  async findByResource(tenantId: string, resourceId: string, filter: ListFilter): Promise<PaginatedResult<ContentViolation>> {
    const where = { tenantId, resourceId };
    const [items, total] = await Promise.all([
      this.delegate.findMany({ where, ...skipTake(filter), orderBy: { createdAt: 'desc' } }),
      this.delegate.count({ where }),
    ]);
    return paginate(items, total, filter);
  }
  async findUnresolved(tenantId: string, filter: ListFilter): Promise<PaginatedResult<ContentViolation>> {
    const where = { tenantId, isResolved: false };
    const [items, total] = await Promise.all([
      this.delegate.findMany({ where, ...skipTake(filter), orderBy: { createdAt: 'desc' } }),
      this.delegate.count({ where }),
    ]);
    return paginate(items, total, filter);
  }
  async update(_tenantId: string, id: string, updates: StrictPartial<ContentViolation>): Promise<ContentViolation> {
    return this.delegate.update({ where: { id }, data: { ...updates, updatedAt: new Date() } });
  }
}
