/**
 * CASE (Competency & Academic Standards Exchange) Network Service
 *
 * Production-ready service for managing CASE frameworks, items, and associations
 * as defined by the 1EdTech CASE specification. Provides:
 *
 * - Full CASE framework import/export (CFDocument, CFItems, CFAssociations)
 * - Hierarchical traversal of standards trees via isChildOf associations
 * - Cross-framework alignment discovery between independent frameworks
 * - Auto-mapping of CASE items to internal knowledge graph nodes
 * - Full-text search across items by statement and coding scheme
 * - Association management (create, query by type, bidirectional lookup)
 *
 * All operations are tenant-scoped with consistent error handling via the
 * Result type pattern and wrapped in timing instrumentation.
 */

import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';
import type {
  CASEDocument,
  CASEItem,
  CASEAssociation,
  CASEAssociationType,
  CASEFramework,
  CASEItemMapping,
} from './one-edtech-types';

// ============================================================================
// CASE ERROR CODES
// ============================================================================

const CASEErrors = {
  CASE_001: { code: 'CASE_001', message: 'Framework not found' },
  CASE_002: { code: 'CASE_002', message: 'Item not found' },
  CASE_003: { code: 'CASE_003', message: 'Association not found' },
  CASE_004: { code: 'CASE_004', message: 'Invalid framework data' },
  CASE_005: { code: 'CASE_005', message: 'Import failed' },
  CASE_006: { code: 'CASE_006', message: 'Export failed' },
  CASE_007: { code: 'CASE_007', message: 'Duplicate framework identifier' },
  CASE_008: { code: 'CASE_008', message: 'Item creation failed' },
  CASE_009: { code: 'CASE_009', message: 'Association creation failed' },
  CASE_010: { code: 'CASE_010', message: 'Hierarchy traversal failed' },
  CASE_011: { code: 'CASE_011', message: 'Cross-framework alignment failed' },
  CASE_012: { code: 'CASE_012', message: 'Mapping failed' },
  CASE_013: { code: 'CASE_013', message: 'Search failed' },
  CASE_014: { code: 'CASE_014', message: 'Invalid association type' },
  CASE_015: { code: 'CASE_015', message: 'Origin item not found' },
  CASE_016: { code: 'CASE_016', message: 'Destination item not found' },
  CASE_017: { code: 'CASE_017', message: 'Framework items retrieval failed' },
  CASE_018: { code: 'CASE_018', message: 'Item associations retrieval failed' },
  CASE_019: { code: 'CASE_019', message: 'Invalid tenant' },
  CASE_020: { code: 'CASE_020', message: 'Batch operation partially failed' },
} as const;

// ============================================================================
// TREE NODE TYPE
// ============================================================================

export interface CASETreeNode {
  item: CASEItem;
  children: CASETreeNode[];
  depth: number;
}

// ============================================================================
// MAPPING RESULT TYPE
// ============================================================================

export interface CASEMappingResult {
  totalItems: number;
  mappedItems: number;
  skippedItems: number;
  mappings: CASEItemMapping[];
  averageConfidence: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class CASENetworkService extends ScholarlyBaseService {
  constructor() {
    super('CASENetworkService');
  }

  // ==========================================================================
  // 1. IMPORT FRAMEWORK
  // ==========================================================================

  /**
   * Import a complete CASE framework including document, items, and associations.
   * Uses upsert on (tenantId, identifier) to handle duplicate imports gracefully.
   * Items and associations are batch-created for performance.
   */
  async importFramework(
    tenantId: string,
    frameworkData: {
      document: CASEDocument;
      items: CASEItem[];
      associations: CASEAssociation[];
      sourceUrl?: string;
    }
  ): Promise<Result<CASEFramework>> {
    return this.withTiming('importFramework', async () => {
      if (!tenantId) {
        return failure({ ...CASEErrors.CASE_019, details: { tenantId } });
      }

      const { document, items, associations, sourceUrl } = frameworkData;

      if (!document || !document.identifier || !document.title) {
        return failure({
          ...CASEErrors.CASE_004,
          details: { reason: 'Document must include identifier and title' },
        });
      }

      try {
        // Upsert the framework record
        const framework = await prisma.cASEFramework.upsert({
          where: {
            tenantId_identifier: {
              tenantId,
              identifier: document.identifier,
            },
          },
          create: {
            tenantId,
            identifier: document.identifier,
            uri: document.uri || null,
            creator: document.creator,
            title: document.title,
            publisher: document.publisher || null,
            description: document.description || null,
            subject: document.subject || [],
            language: document.language || null,
            version: document.version || null,
            adoptionStatus: document.adoptionStatus || 'Draft',
            sourceUrl: sourceUrl || document.officialSourceURL || null,
            status: 'active',
            document: document as unknown as Record<string, unknown>,
          },
          update: {
            creator: document.creator,
            title: document.title,
            publisher: document.publisher || null,
            description: document.description || null,
            subject: document.subject || [],
            language: document.language || null,
            version: document.version || null,
            adoptionStatus: document.adoptionStatus || 'Draft',
            sourceUrl: sourceUrl || document.officialSourceURL || null,
            document: document as unknown as Record<string, unknown>,
            lastSyncAt: new Date(),
          },
        });

        log.info('CASE framework upserted', {
          frameworkId: framework.id,
          identifier: document.identifier,
          tenantId,
        });

        // Batch-create items with upsert to handle duplicates
        const itemIdMap = new Map<string, string>();

        for (const item of items) {
          const createdItem = await prisma.cASEItem.upsert({
            where: {
              frameworkId_identifier: {
                frameworkId: framework.id,
                identifier: item.identifier,
              },
            },
            create: {
              frameworkId: framework.id,
              identifier: item.identifier,
              uri: item.uri || null,
              fullStatement: item.fullStatement,
              humanCodingScheme: item.humanCodingScheme || null,
              cfItemType: item.CFItemType || null,
              educationLevel: item.educationLevel || [],
              abbreviatedStatement: item.abbreviatedStatement || null,
              conceptKeywords: item.conceptKeywords || [],
              listEnumeration: item.listEnumeration || null,
              language: item.language || null,
              lastChangeDateTime: item.lastChangeDateTime
                ? new Date(item.lastChangeDateTime)
                : new Date(),
            },
            update: {
              fullStatement: item.fullStatement,
              humanCodingScheme: item.humanCodingScheme || null,
              cfItemType: item.CFItemType || null,
              educationLevel: item.educationLevel || [],
              abbreviatedStatement: item.abbreviatedStatement || null,
              conceptKeywords: item.conceptKeywords || [],
              listEnumeration: item.listEnumeration || null,
              language: item.language || null,
              lastChangeDateTime: item.lastChangeDateTime
                ? new Date(item.lastChangeDateTime)
                : new Date(),
            },
          });

          itemIdMap.set(item.identifier, createdItem.id);
        }

        log.info('CASE items imported', {
          frameworkId: framework.id,
          itemCount: items.length,
        });

        // Batch-create associations, resolving identifier references to DB IDs
        let associationCount = 0;
        const associationErrors: string[] = [];

        for (const assoc of associations) {
          const originId = itemIdMap.get(assoc.originNodeURI.identifier);
          const destinationId = itemIdMap.get(assoc.destinationNodeURI.identifier);

          if (!originId || !destinationId) {
            associationErrors.push(
              `Skipped association ${assoc.identifier}: ` +
              `origin=${assoc.originNodeURI.identifier} (${originId ? 'found' : 'missing'}), ` +
              `destination=${assoc.destinationNodeURI.identifier} (${destinationId ? 'found' : 'missing'})`
            );
            continue;
          }

          try {
            await prisma.cASEAssociation.create({
              data: {
                identifier: assoc.identifier,
                frameworkId: framework.id,
                associationType: assoc.associationType,
                originNodeId: originId,
                destinationNodeId: destinationId,
                sequenceNumber: assoc.sequenceNumber ?? null,
                lastChangeDateTime: assoc.lastChangeDateTime
                  ? new Date(assoc.lastChangeDateTime)
                  : new Date(),
              },
            });
            associationCount++;
          } catch (assocError) {
            // If the association already exists (duplicate identifier), skip it
            const errorMessage = assocError instanceof Error ? assocError.message : String(assocError);
            if (errorMessage.includes('Unique constraint')) {
              associationErrors.push(`Duplicate association skipped: ${assoc.identifier}`);
            } else {
              associationErrors.push(`Failed to create association ${assoc.identifier}: ${errorMessage}`);
            }
          }
        }

        if (associationErrors.length > 0) {
          log.warn('Some associations could not be imported', {
            frameworkId: framework.id,
            errorCount: associationErrors.length,
            errors: associationErrors.slice(0, 10),
          });
        }

        log.info('CASE associations imported', {
          frameworkId: framework.id,
          associationCount,
          skipped: associations.length - associationCount,
        });

        // Construct the return value conforming to CASEFramework
        const result: CASEFramework = {
          id: framework.id,
          tenantId: framework.tenantId,
          document,
          items,
          associations,
          importedAt: framework.importedAt,
          lastSyncAt: framework.lastSyncAt || undefined,
          sourceUrl: framework.sourceUrl || undefined,
          status: framework.status as CASEFramework['status'],
        };

        return success(result);
      } catch (error) {
        log.error('Failed to import CASE framework', error as Error, {
          tenantId,
          identifier: document.identifier,
        });
        return failure({
          ...CASEErrors.CASE_005,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 2. GET FRAMEWORK
  // ==========================================================================

  /**
   * Retrieve a single CASE framework by ID, including its items and associations.
   */
  async getFramework(
    tenantId: string,
    frameworkId: string
  ): Promise<Result<CASEFramework>> {
    return this.withTiming('getFramework', async () => {
      if (!tenantId || !frameworkId) {
        return failure({
          ...CASEErrors.CASE_019,
          details: { tenantId, frameworkId },
        });
      }

      try {
        const framework = await prisma.cASEFramework.findFirst({
          where: { id: frameworkId, tenantId },
          include: {
            items: true,
            associations: {
              include: {
                originNode: true,
                destinationNode: true,
              },
            },
          },
        });

        if (!framework) {
          return failure({
            ...CASEErrors.CASE_001,
            details: { frameworkId, tenantId },
          });
        }

        const caseItems: CASEItem[] = framework.items.map((item) =>
          this.mapDbItemToCASEItem(item, framework)
        );

        const caseAssociations: CASEAssociation[] = framework.associations.map(
          (assoc) => this.mapDbAssociationToCASEAssociation(assoc)
        );

        const result: CASEFramework = {
          id: framework.id,
          tenantId: framework.tenantId,
          document: framework.document as unknown as CASEDocument,
          items: caseItems,
          associations: caseAssociations,
          importedAt: framework.importedAt,
          lastSyncAt: framework.lastSyncAt || undefined,
          sourceUrl: framework.sourceUrl || undefined,
          status: framework.status as CASEFramework['status'],
        };

        return success(result);
      } catch (error) {
        log.error('Failed to get CASE framework', error as Error, {
          tenantId,
          frameworkId,
        });
        return failure({
          ...CASEErrors.CASE_001,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 3. LIST FRAMEWORKS
  // ==========================================================================

  /**
   * List CASE frameworks for a tenant with optional filtering and pagination.
   */
  async listFrameworks(
    tenantId: string,
    options?: {
      status?: string;
      subject?: string;
      adoptionStatus?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ frameworks: CASEFramework[]; total: number }>> {
    return this.withTiming('listFrameworks', async () => {
      if (!tenantId) {
        return failure({ ...CASEErrors.CASE_019, details: { tenantId } });
      }

      try {
        const where: Record<string, unknown> = { tenantId };

        if (options?.status) {
          where.status = options.status;
        }
        if (options?.adoptionStatus) {
          where.adoptionStatus = options.adoptionStatus;
        }
        if (options?.subject) {
          where.subject = { has: options.subject };
        }

        const limit = Math.min(options?.limit || 50, 200);
        const offset = options?.offset || 0;

        const [frameworks, total] = await Promise.all([
          prisma.cASEFramework.findMany({
            where,
            include: {
              items: true,
              associations: true,
            },
            take: limit,
            skip: offset,
            orderBy: { importedAt: 'desc' },
          }),
          prisma.cASEFramework.count({ where }),
        ]);

        const results: CASEFramework[] = frameworks.map((fw) => ({
          id: fw.id,
          tenantId: fw.tenantId,
          document: fw.document as unknown as CASEDocument,
          items: fw.items.map((item) => this.mapDbItemToCASEItem(item, fw)),
          associations: fw.associations.map((assoc) =>
            this.mapDbAssociationToCASEAssociation(assoc)
          ),
          importedAt: fw.importedAt,
          lastSyncAt: fw.lastSyncAt || undefined,
          sourceUrl: fw.sourceUrl || undefined,
          status: fw.status as CASEFramework['status'],
        }));

        return success({ frameworks: results, total });
      } catch (error) {
        log.error('Failed to list CASE frameworks', error as Error, { tenantId });
        return failure({
          code: 'CASE_001',
          message: 'Failed to list frameworks',
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 4. GET FRAMEWORK ITEMS
  // ==========================================================================

  /**
   * Get items for a framework with optional filtering by type, education level,
   * or parent item (via isChildOf associations).
   */
  async getFrameworkItems(
    tenantId: string,
    frameworkId: string,
    options?: {
      itemType?: string;
      educationLevel?: string;
      parentId?: string;
    }
  ): Promise<Result<CASEItem[]>> {
    return this.withTiming('getFrameworkItems', async () => {
      if (!tenantId || !frameworkId) {
        return failure({
          ...CASEErrors.CASE_019,
          details: { tenantId, frameworkId },
        });
      }

      try {
        // Verify framework belongs to tenant
        const framework = await prisma.cASEFramework.findFirst({
          where: { id: frameworkId, tenantId },
        });

        if (!framework) {
          return failure({
            ...CASEErrors.CASE_001,
            details: { frameworkId, tenantId },
          });
        }

        // If parentId is provided, find children via isChildOf associations
        if (options?.parentId) {
          const childAssociations = await prisma.cASEAssociation.findMany({
            where: {
              frameworkId,
              associationType: 'isChildOf',
              destinationNodeId: options.parentId,
            },
            include: {
              originNode: true,
            },
          });

          let childItems = childAssociations.map((assoc) =>
            this.mapDbItemToCASEItem(assoc.originNode, framework)
          );

          // Apply additional filters
          if (options?.itemType) {
            childItems = childItems.filter(
              (item) => item.CFItemType === options.itemType
            );
          }
          if (options?.educationLevel) {
            childItems = childItems.filter(
              (item) =>
                item.educationLevel &&
                item.educationLevel.includes(options.educationLevel!)
            );
          }

          return success(childItems);
        }

        // Otherwise, query items directly
        const whereClause: Record<string, unknown> = { frameworkId };

        if (options?.itemType) {
          whereClause.cfItemType = options.itemType;
        }
        if (options?.educationLevel) {
          whereClause.educationLevel = { has: options.educationLevel };
        }

        const items = await prisma.cASEItem.findMany({
          where: whereClause,
          orderBy: [
            { listEnumeration: 'asc' },
            { humanCodingScheme: 'asc' },
          ],
        });

        const caseItems = items.map((item) =>
          this.mapDbItemToCASEItem(item, framework)
        );

        return success(caseItems);
      } catch (error) {
        log.error('Failed to get framework items', error as Error, {
          tenantId,
          frameworkId,
        });
        return failure({
          ...CASEErrors.CASE_017,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 5. GET ITEM ASSOCIATIONS
  // ==========================================================================

  /**
   * Get all associations for a given item (as both origin and destination),
   * optionally filtered by association type.
   */
  async getItemAssociations(
    tenantId: string,
    itemId: string,
    associationType?: CASEAssociationType
  ): Promise<Result<CASEAssociation[]>> {
    return this.withTiming('getItemAssociations', async () => {
      if (!tenantId || !itemId) {
        return failure({
          ...CASEErrors.CASE_019,
          details: { tenantId, itemId },
        });
      }

      try {
        // Verify the item exists and belongs to a framework in this tenant
        const item = await prisma.cASEItem.findUnique({
          where: { id: itemId },
          include: {
            framework: { select: { tenantId: true } },
          },
        });

        if (!item || item.framework.tenantId !== tenantId) {
          return failure({
            ...CASEErrors.CASE_002,
            details: { itemId, tenantId },
          });
        }

        // Build the where clause for bidirectional lookup
        const typeFilter = associationType
          ? { associationType }
          : {};

        const [originAssociations, destinationAssociations] = await Promise.all([
          prisma.cASEAssociation.findMany({
            where: {
              originNodeId: itemId,
              ...typeFilter,
            },
            include: {
              originNode: true,
              destinationNode: true,
            },
          }),
          prisma.cASEAssociation.findMany({
            where: {
              destinationNodeId: itemId,
              ...typeFilter,
            },
            include: {
              originNode: true,
              destinationNode: true,
            },
          }),
        ]);

        // Merge and deduplicate by association ID
        const seen = new Set<string>();
        const allAssociations: CASEAssociation[] = [];

        for (const assoc of [...originAssociations, ...destinationAssociations]) {
          if (!seen.has(assoc.id)) {
            seen.add(assoc.id);
            allAssociations.push(this.mapDbAssociationToCASEAssociation(assoc));
          }
        }

        return success(allAssociations);
      } catch (error) {
        log.error('Failed to get item associations', error as Error, {
          tenantId,
          itemId,
        });
        return failure({
          ...CASEErrors.CASE_018,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 6. TRAVERSE HIERARCHY
  // ==========================================================================

  /**
   * Build a hierarchical tree structure from isChildOf associations for a framework.
   * If rootItemId is provided, start from that item; otherwise, start from all
   * root items (items with no parent in isChildOf associations).
   */
  async traverseHierarchy(
    tenantId: string,
    frameworkId: string,
    rootItemId?: string
  ): Promise<Result<CASETreeNode[]>> {
    return this.withTiming('traverseHierarchy', async () => {
      if (!tenantId || !frameworkId) {
        return failure({
          ...CASEErrors.CASE_019,
          details: { tenantId, frameworkId },
        });
      }

      try {
        // Verify framework belongs to tenant
        const framework = await prisma.cASEFramework.findFirst({
          where: { id: frameworkId, tenantId },
        });

        if (!framework) {
          return failure({
            ...CASEErrors.CASE_001,
            details: { frameworkId, tenantId },
          });
        }

        // Fetch all items for the framework
        const allItems = await prisma.cASEItem.findMany({
          where: { frameworkId },
        });

        // Fetch all isChildOf associations for the framework
        const childOfAssociations = await prisma.cASEAssociation.findMany({
          where: {
            frameworkId,
            associationType: 'isChildOf',
          },
        });

        // Build a parent-to-children map:
        // In isChildOf: origin "isChildOf" destination => destination is parent, origin is child
        // So parentId -> [childId, childId, ...]
        const parentToChildren = new Map<string, string[]>();
        const childIds = new Set<string>();

        for (const assoc of childOfAssociations) {
          const parentId = assoc.destinationNodeId;
          const childId = assoc.originNodeId;

          childIds.add(childId);

          if (!parentToChildren.has(parentId)) {
            parentToChildren.set(parentId, []);
          }
          parentToChildren.get(parentId)!.push(childId);
        }

        // Build item lookup map
        const itemMap = new Map<string, typeof allItems[number]>();
        for (const item of allItems) {
          itemMap.set(item.id, item);
        }

        // Recursive tree builder
        const buildTreeNode = (
          itemId: string,
          depth: number,
          visited: Set<string>
        ): CASETreeNode | null => {
          if (visited.has(itemId)) {
            // Prevent infinite loops from circular references
            return null;
          }

          const dbItem = itemMap.get(itemId);
          if (!dbItem) {
            return null;
          }

          visited.add(itemId);

          const caseItem = this.mapDbItemToCASEItem(dbItem, framework);
          const childItemIds = parentToChildren.get(itemId) || [];
          const children: CASETreeNode[] = [];

          for (const childId of childItemIds) {
            const childNode = buildTreeNode(childId, depth + 1, visited);
            if (childNode) {
              children.push(childNode);
            }
          }

          // Sort children by listEnumeration or humanCodingScheme
          children.sort((a, b) => {
            const aEnum = a.item.listEnumeration || a.item.humanCodingScheme || '';
            const bEnum = b.item.listEnumeration || b.item.humanCodingScheme || '';
            return aEnum.localeCompare(bEnum, undefined, { numeric: true });
          });

          visited.delete(itemId);

          return { item: caseItem, children, depth };
        };

        let roots: CASETreeNode[];

        if (rootItemId) {
          // Start from the specified root item
          if (!itemMap.has(rootItemId)) {
            return failure({
              ...CASEErrors.CASE_002,
              details: { itemId: rootItemId, frameworkId },
            });
          }

          const rootNode = buildTreeNode(rootItemId, 0, new Set<string>());
          roots = rootNode ? [rootNode] : [];
        } else {
          // Find all root items: items that are NOT children of any other item
          const rootItems = allItems.filter((item) => !childIds.has(item.id));

          roots = [];
          for (const rootItem of rootItems) {
            const node = buildTreeNode(rootItem.id, 0, new Set<string>());
            if (node) {
              roots.push(node);
            }
          }

          // Sort roots
          roots.sort((a, b) => {
            const aEnum = a.item.listEnumeration || a.item.humanCodingScheme || '';
            const bEnum = b.item.listEnumeration || b.item.humanCodingScheme || '';
            return aEnum.localeCompare(bEnum, undefined, { numeric: true });
          });
        }

        return success(roots);
      } catch (error) {
        log.error('Failed to traverse CASE hierarchy', error as Error, {
          tenantId,
          frameworkId,
          rootItemId,
        });
        return failure({
          ...CASEErrors.CASE_010,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 7. FIND CROSS-FRAMEWORK ALIGNMENTS
  // ==========================================================================

  /**
   * Find associations between items in two different frameworks. Looks for
   * cross-framework association types: isRelatedTo, isPeerOf, isTranslationOf.
   */
  async findCrossFrameworkAlignments(
    tenantId: string,
    frameworkIdA: string,
    frameworkIdB: string
  ): Promise<
    Result<{
      alignments: Array<{
        association: CASEAssociation;
        originFrameworkId: string;
        destinationFrameworkId: string;
      }>;
      totalAlignments: number;
    }>
  > {
    return this.withTiming('findCrossFrameworkAlignments', async () => {
      if (!tenantId || !frameworkIdA || !frameworkIdB) {
        return failure({
          ...CASEErrors.CASE_019,
          details: { tenantId, frameworkIdA, frameworkIdB },
        });
      }

      try {
        // Verify both frameworks belong to the tenant
        const [fwA, fwB] = await Promise.all([
          prisma.cASEFramework.findFirst({
            where: { id: frameworkIdA, tenantId },
          }),
          prisma.cASEFramework.findFirst({
            where: { id: frameworkIdB, tenantId },
          }),
        ]);

        if (!fwA) {
          return failure({
            ...CASEErrors.CASE_001,
            details: { frameworkId: frameworkIdA, tenantId },
          });
        }
        if (!fwB) {
          return failure({
            ...CASEErrors.CASE_001,
            details: { frameworkId: frameworkIdB, tenantId },
          });
        }

        // Get item IDs for both frameworks
        const [itemsA, itemsB] = await Promise.all([
          prisma.cASEItem.findMany({
            where: { frameworkId: frameworkIdA },
            select: { id: true },
          }),
          prisma.cASEItem.findMany({
            where: { frameworkId: frameworkIdB },
            select: { id: true },
          }),
        ]);

        const itemIdsA = new Set(itemsA.map((i) => i.id));
        const itemIdsB = new Set(itemsB.map((i) => i.id));

        // Cross-framework association types
        const crossFrameworkTypes: CASEAssociationType[] = [
          'isRelatedTo',
          'isPeerOf',
          'isTranslationOf',
        ];

        // Find associations where origin is in framework A and destination is in framework B,
        // or vice versa
        const associations = await prisma.cASEAssociation.findMany({
          where: {
            associationType: { in: crossFrameworkTypes },
            OR: [
              {
                originNodeId: { in: Array.from(itemIdsA) },
                destinationNodeId: { in: Array.from(itemIdsB) },
              },
              {
                originNodeId: { in: Array.from(itemIdsB) },
                destinationNodeId: { in: Array.from(itemIdsA) },
              },
            ],
          },
          include: {
            originNode: true,
            destinationNode: true,
          },
        });

        const alignments = associations.map((assoc) => {
          const originInA = itemIdsA.has(assoc.originNodeId);
          return {
            association: this.mapDbAssociationToCASEAssociation(assoc),
            originFrameworkId: originInA ? frameworkIdA : frameworkIdB,
            destinationFrameworkId: originInA ? frameworkIdB : frameworkIdA,
          };
        });

        return success({
          alignments,
          totalAlignments: alignments.length,
        });
      } catch (error) {
        log.error('Failed to find cross-framework alignments', error as Error, {
          tenantId,
          frameworkIdA,
          frameworkIdB,
        });
        return failure({
          ...CASEErrors.CASE_011,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 8. MAP TO CURRICULUM CURATOR
  // ==========================================================================

  /**
   * Map CASE items to knowledge graph nodes. If autoMap is enabled, uses
   * keyword/statement matching to suggest mappings with a confidence score.
   * Only creates mappings above the confidence threshold (default 0.6).
   */
  async mapToCurriculumCurator(
    tenantId: string,
    frameworkId: string,
    options?: {
      autoMap?: boolean;
      confidence?: number;
    }
  ): Promise<Result<CASEMappingResult>> {
    return this.withTiming('mapToCurriculumCurator', async () => {
      if (!tenantId || !frameworkId) {
        return failure({
          ...CASEErrors.CASE_019,
          details: { tenantId, frameworkId },
        });
      }

      try {
        // Verify framework belongs to tenant
        const framework = await prisma.cASEFramework.findFirst({
          where: { id: frameworkId, tenantId },
          include: { items: true },
        });

        if (!framework) {
          return failure({
            ...CASEErrors.CASE_001,
            details: { frameworkId, tenantId },
          });
        }

        const confidenceThreshold = options?.confidence ?? 0.6;
        const autoMap = options?.autoMap ?? false;
        const mappings: CASEItemMapping[] = [];
        let skippedItems = 0;

        if (!autoMap) {
          // Without auto-mapping, return existing mappings
          const existingMappings = await prisma.cASEItemMapping.findMany({
            where: { frameworkId, tenantId },
          });

          const result: CASEMappingResult = {
            totalItems: framework.items.length,
            mappedItems: existingMappings.length,
            skippedItems: framework.items.length - existingMappings.length,
            mappings: existingMappings.map((m) => ({
              caseItemId: m.caseItemId,
              knowledgeGraphNodeId: m.knowledgeGraphNodeId,
              confidence: m.confidence,
              mappedBy: m.mappedBy as 'auto' | 'manual',
              mappedAt: m.mappedAt,
            })),
            averageConfidence:
              existingMappings.length > 0
                ? existingMappings.reduce((sum, m) => sum + m.confidence, 0) /
                  existingMappings.length
                : 0,
          };

          return success(result);
        }

        // Auto-mapping: extract keywords from CASE items and match against
        // knowledge graph concept nodes
        for (const item of framework.items) {
          // Extract keywords from the item's fullStatement and conceptKeywords
          const keywords = this.extractKeywords(
            item.fullStatement,
            item.conceptKeywords
          );

          if (keywords.length === 0) {
            skippedItems++;
            continue;
          }

          // Search for matching knowledge graph nodes using keyword overlap.
          // We use content descriptions as a proxy since they contain keyConcepts.
          const matchingNodes = await this.findMatchingKnowledgeGraphNodes(
            tenantId,
            keywords
          );

          if (matchingNodes.length === 0) {
            skippedItems++;
            continue;
          }

          // Take the best match above the confidence threshold
          const bestMatch = matchingNodes[0];

          if (bestMatch.confidence >= confidenceThreshold) {
            try {
              const mapping = await prisma.cASEItemMapping.upsert({
                where: {
                  caseItemId_knowledgeGraphNodeId: {
                    caseItemId: item.id,
                    knowledgeGraphNodeId: bestMatch.nodeId,
                  },
                },
                create: {
                  tenantId,
                  frameworkId,
                  caseItemId: item.id,
                  knowledgeGraphNodeId: bestMatch.nodeId,
                  confidence: bestMatch.confidence,
                  mappedBy: 'auto',
                },
                update: {
                  confidence: bestMatch.confidence,
                  mappedBy: 'auto',
                  mappedAt: new Date(),
                },
              });

              mappings.push({
                caseItemId: mapping.caseItemId,
                knowledgeGraphNodeId: mapping.knowledgeGraphNodeId,
                confidence: mapping.confidence,
                mappedBy: mapping.mappedBy as 'auto' | 'manual',
                mappedAt: mapping.mappedAt,
              });
            } catch (mappingError) {
              log.warn('Failed to create mapping for item', {
                caseItemId: item.id,
                error: mappingError instanceof Error ? mappingError.message : String(mappingError),
              });
              skippedItems++;
            }
          } else {
            skippedItems++;
          }
        }

        const averageConfidence =
          mappings.length > 0
            ? mappings.reduce((sum, m) => sum + m.confidence, 0) / mappings.length
            : 0;

        const result: CASEMappingResult = {
          totalItems: framework.items.length,
          mappedItems: mappings.length,
          skippedItems,
          mappings,
          averageConfidence,
        };

        log.info('CASE auto-mapping completed', {
          frameworkId,
          totalItems: result.totalItems,
          mappedItems: result.mappedItems,
          averageConfidence: result.averageConfidence.toFixed(3),
        });

        return success(result);
      } catch (error) {
        log.error('Failed to map CASE items to curriculum curator', error as Error, {
          tenantId,
          frameworkId,
        });
        return failure({
          ...CASEErrors.CASE_012,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 9. CREATE ASSOCIATION
  // ==========================================================================

  /**
   * Create a new association between two CASE items.
   */
  async createAssociation(
    tenantId: string,
    association: {
      originItemId: string;
      destinationItemId: string;
      associationType: CASEAssociationType;
      frameworkId?: string;
      sequenceNumber?: number;
    }
  ): Promise<Result<CASEAssociation>> {
    return this.withTiming('createAssociation', async () => {
      if (!tenantId) {
        return failure({ ...CASEErrors.CASE_019, details: { tenantId } });
      }

      try {
        // Validate origin item exists and belongs to tenant
        const originItem = await prisma.cASEItem.findUnique({
          where: { id: association.originItemId },
          include: { framework: { select: { tenantId: true, id: true } } },
        });

        if (!originItem || originItem.framework.tenantId !== tenantId) {
          return failure({
            ...CASEErrors.CASE_015,
            details: { itemId: association.originItemId, tenantId },
          });
        }

        // Validate destination item exists and belongs to tenant
        const destinationItem = await prisma.cASEItem.findUnique({
          where: { id: association.destinationItemId },
          include: { framework: { select: { tenantId: true, id: true } } },
        });

        if (!destinationItem || destinationItem.framework.tenantId !== tenantId) {
          return failure({
            ...CASEErrors.CASE_016,
            details: { itemId: association.destinationItemId, tenantId },
          });
        }

        // Determine the framework for the association
        const resolvedFrameworkId =
          association.frameworkId ||
          originItem.framework.id;

        // Generate a unique identifier for the association
        const identifier = this.generateId('case_assoc');

        const created = await prisma.cASEAssociation.create({
          data: {
            identifier,
            frameworkId: resolvedFrameworkId,
            associationType: association.associationType,
            originNodeId: association.originItemId,
            destinationNodeId: association.destinationItemId,
            sequenceNumber: association.sequenceNumber ?? null,
          },
          include: {
            originNode: true,
            destinationNode: true,
          },
        });

        const caseAssociation = this.mapDbAssociationToCASEAssociation(created);

        log.info('CASE association created', {
          associationId: created.id,
          type: association.associationType,
          originId: association.originItemId,
          destinationId: association.destinationItemId,
        });

        return success(caseAssociation);
      } catch (error) {
        log.error('Failed to create CASE association', error as Error, {
          tenantId,
          association,
        });
        return failure({
          ...CASEErrors.CASE_009,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 10. EXPORT FRAMEWORK
  // ==========================================================================

  /**
   * Export a CASE framework as a standards-compliant JSON structure
   * conforming to the CASE specification (CFDocument + CFItems + CFAssociations).
   */
  async exportFramework(
    tenantId: string,
    frameworkId: string
  ): Promise<
    Result<{
      CFDocument: CASEDocument;
      CFItems: CASEItem[];
      CFAssociations: CASEAssociation[];
    }>
  > {
    return this.withTiming('exportFramework', async () => {
      if (!tenantId || !frameworkId) {
        return failure({
          ...CASEErrors.CASE_019,
          details: { tenantId, frameworkId },
        });
      }

      try {
        const framework = await prisma.cASEFramework.findFirst({
          where: { id: frameworkId, tenantId },
          include: {
            items: {
              orderBy: [
                { listEnumeration: 'asc' },
                { humanCodingScheme: 'asc' },
              ],
            },
            associations: {
              include: {
                originNode: true,
                destinationNode: true,
              },
            },
          },
        });

        if (!framework) {
          return failure({
            ...CASEErrors.CASE_001,
            details: { frameworkId, tenantId },
          });
        }

        const cfDocument = framework.document as unknown as CASEDocument;

        const cfItems: CASEItem[] = framework.items.map((item) =>
          this.mapDbItemToCASEItem(item, framework)
        );

        const cfAssociations: CASEAssociation[] = framework.associations.map(
          (assoc) => this.mapDbAssociationToCASEAssociation(assoc)
        );

        log.info('CASE framework exported', {
          frameworkId,
          itemCount: cfItems.length,
          associationCount: cfAssociations.length,
        });

        return success({
          CFDocument: cfDocument,
          CFItems: cfItems,
          CFAssociations: cfAssociations,
        });
      } catch (error) {
        log.error('Failed to export CASE framework', error as Error, {
          tenantId,
          frameworkId,
        });
        return failure({
          ...CASEErrors.CASE_006,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // 11. SEARCH ITEMS
  // ==========================================================================

  /**
   * Full-text search across CASE items by fullStatement and humanCodingScheme.
   */
  async searchItems(
    tenantId: string,
    query: string,
    options?: {
      frameworkId?: string;
      itemType?: string;
      limit?: number;
    }
  ): Promise<Result<CASEItem[]>> {
    return this.withTiming('searchItems', async () => {
      if (!tenantId || !query) {
        return failure({
          ...CASEErrors.CASE_019,
          details: { tenantId, query },
        });
      }

      try {
        const limit = Math.min(options?.limit || 50, 200);
        const searchTerms = query.toLowerCase().trim();

        // Build the where clause
        const where: Record<string, unknown> = {
          framework: { tenantId },
          OR: [
            { fullStatement: { contains: searchTerms, mode: 'insensitive' } },
            { humanCodingScheme: { contains: searchTerms, mode: 'insensitive' } },
            { abbreviatedStatement: { contains: searchTerms, mode: 'insensitive' } },
            { conceptKeywords: { has: searchTerms } },
          ],
        };

        if (options?.frameworkId) {
          where.frameworkId = options.frameworkId;
        }

        if (options?.itemType) {
          where.cfItemType = options.itemType;
        }

        const items = await prisma.cASEItem.findMany({
          where,
          include: {
            framework: true,
          },
          take: limit,
          orderBy: { humanCodingScheme: 'asc' },
        });

        const caseItems: CASEItem[] = items.map((item) =>
          this.mapDbItemToCASEItem(item, item.framework)
        );

        return success(caseItems);
      } catch (error) {
        log.error('Failed to search CASE items', error as Error, {
          tenantId,
          query,
        });
        return failure({
          ...CASEErrors.CASE_013,
          details: { error: error instanceof Error ? error.message : String(error) },
        });
      }
    });
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Map a Prisma CASEItem record to the CASEItem type definition.
   */
  private mapDbItemToCASEItem(
    dbItem: {
      id: string;
      identifier: string;
      uri: string | null;
      fullStatement: string;
      humanCodingScheme: string | null;
      cfItemType: string | null;
      educationLevel: string[];
      abbreviatedStatement: string | null;
      conceptKeywords: string[];
      listEnumeration: string | null;
      language: string | null;
      lastChangeDateTime: Date;
      frameworkId: string;
    },
    framework: {
      identifier: string;
      title: string;
      uri?: string | null;
    }
  ): CASEItem {
    return {
      identifier: dbItem.identifier,
      uri: dbItem.uri || `urn:case:item:${dbItem.identifier}`,
      fullStatement: dbItem.fullStatement,
      humanCodingScheme: dbItem.humanCodingScheme || undefined,
      lastChangeDateTime: dbItem.lastChangeDateTime.toISOString(),
      CFDocumentURI: {
        title: framework.title,
        identifier: framework.identifier,
        uri: framework.uri || `urn:case:doc:${framework.identifier}`,
      },
      CFItemType: dbItem.cfItemType || undefined,
      educationLevel: dbItem.educationLevel.length > 0 ? dbItem.educationLevel : undefined,
      abbreviatedStatement: dbItem.abbreviatedStatement || undefined,
      conceptKeywords: dbItem.conceptKeywords.length > 0 ? dbItem.conceptKeywords : undefined,
      listEnumeration: dbItem.listEnumeration || undefined,
      language: dbItem.language || undefined,
    };
  }

  /**
   * Map a Prisma CASEAssociation record to the CASEAssociation type definition.
   */
  private mapDbAssociationToCASEAssociation(
    dbAssoc: {
      id: string;
      identifier: string;
      associationType: string;
      sequenceNumber: number | null;
      lastChangeDateTime: Date;
      frameworkId: string | null;
      originNodeId: string;
      destinationNodeId: string;
      originNode?: {
        identifier: string;
        uri: string | null;
        fullStatement: string;
      };
      destinationNode?: {
        identifier: string;
        uri: string | null;
        fullStatement: string;
      };
    }
  ): CASEAssociation {
    return {
      identifier: dbAssoc.identifier,
      uri: `urn:case:assoc:${dbAssoc.identifier}`,
      associationType: dbAssoc.associationType as CASEAssociationType,
      originNodeURI: {
        title: dbAssoc.originNode?.fullStatement || '',
        identifier: dbAssoc.originNode?.identifier || dbAssoc.originNodeId,
        uri: dbAssoc.originNode?.uri || `urn:case:item:${dbAssoc.originNodeId}`,
      },
      destinationNodeURI: {
        title: dbAssoc.destinationNode?.fullStatement || '',
        identifier: dbAssoc.destinationNode?.identifier || dbAssoc.destinationNodeId,
        uri: dbAssoc.destinationNode?.uri || `urn:case:item:${dbAssoc.destinationNodeId}`,
      },
      lastChangeDateTime: dbAssoc.lastChangeDateTime.toISOString(),
      sequenceNumber: dbAssoc.sequenceNumber ?? undefined,
    };
  }

  /**
   * Extract keywords from a CASE item's fullStatement and conceptKeywords.
   * Filters out stop words and short tokens for meaningful matching.
   */
  private extractKeywords(
    fullStatement: string,
    conceptKeywords: string[]
  ): string[] {
    const stopWords = new Set([
      'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'can', 'shall', 'that', 'which',
      'who', 'whom', 'this', 'these', 'those', 'it', 'its', 'they', 'their',
      'them', 'we', 'our', 'he', 'she', 'his', 'her', 'not', 'no', 'nor',
      'as', 'if', 'then', 'than', 'when', 'where', 'how', 'what', 'why',
      'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
      'some', 'such', 'only', 'own', 'same', 'so', 'too', 'very',
      'just', 'about', 'above', 'after', 'again', 'also', 'any',
      'because', 'before', 'between', 'during', 'into', 'through',
      'under', 'until', 'up', 'using', 'use', 'used',
    ]);

    // Tokenize the full statement
    const statementTokens = fullStatement
      .toLowerCase()
      .replace(/[^\w\s-]/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 2 && !stopWords.has(token));

    // Combine with concept keywords (already meaningful terms)
    const conceptTokens = conceptKeywords.map((kw) => kw.toLowerCase().trim());

    // Deduplicate
    const seen = new Set<string>();
    const keywords: string[] = [];

    // Add concept keywords first as they are more precise
    for (const token of conceptTokens) {
      if (token && !seen.has(token)) {
        seen.add(token);
        keywords.push(token);
      }
    }

    // Then add statement tokens
    for (const token of statementTokens) {
      if (!seen.has(token)) {
        seen.add(token);
        keywords.push(token);
      }
    }

    return keywords;
  }

  /**
   * Find knowledge graph nodes that match a set of keywords. Returns nodes
   * sorted by confidence (keyword match ratio) in descending order.
   *
   * Uses ContentDescription records as proxies for knowledge graph concept nodes,
   * since they contain keyConcepts and curriculum codes that serve as graph node IDs.
   */
  private async findMatchingKnowledgeGraphNodes(
    tenantId: string,
    keywords: string[]
  ): Promise<Array<{ nodeId: string; confidence: number; matchedKeywords: string[] }>> {
    if (keywords.length === 0) {
      return [];
    }

    // Search for content descriptions that share keywords
    // We use the first few keywords for the database query to narrow candidates,
    // then compute confidence in-memory for precision
    const searchKeywords = keywords.slice(0, 5);
    const candidates: Array<{
      nodeId: string;
      keyConcepts: string[];
      description: string;
    }> = [];

    try {
      // Try to find matching items through a broad search. We look for
      // CASEItemMappings that already reference knowledge graph nodes, or
      // we search items by concept keywords for potential matches.
      for (const keyword of searchKeywords) {
        const matchingItems = await prisma.cASEItem.findMany({
          where: {
            framework: { tenantId },
            OR: [
              { conceptKeywords: { has: keyword } },
              { fullStatement: { contains: keyword, mode: 'insensitive' } },
            ],
          },
          include: {
            mappings: true,
          },
          take: 20,
        });

        for (const item of matchingItems) {
          // If this item already has a mapping to a knowledge graph node, use that
          for (const mapping of item.mappings) {
            const existing = candidates.find(
              (c) => c.nodeId === mapping.knowledgeGraphNodeId
            );
            if (!existing) {
              candidates.push({
                nodeId: mapping.knowledgeGraphNodeId,
                keyConcepts: item.conceptKeywords,
                description: item.fullStatement,
              });
            }
          }

          // Also use the item itself as a potential node reference
          if (!candidates.find((c) => c.nodeId === `case_item_${item.id}`)) {
            candidates.push({
              nodeId: `case_item_${item.id}`,
              keyConcepts: item.conceptKeywords,
              description: item.fullStatement,
            });
          }
        }
      }
    } catch (searchError) {
      log.warn('Knowledge graph node search encountered an error', {
        error: searchError instanceof Error ? searchError.message : String(searchError),
      });
    }

    // Calculate confidence scores based on keyword overlap
    const results: Array<{
      nodeId: string;
      confidence: number;
      matchedKeywords: string[];
    }> = [];

    for (const candidate of candidates) {
      const candidateWords = new Set([
        ...candidate.keyConcepts.map((c) => c.toLowerCase()),
        ...candidate.description
          .toLowerCase()
          .replace(/[^\w\s-]/g, ' ')
          .split(/\s+/)
          .filter((w) => w.length > 2),
      ]);

      const matchedKeywords = keywords.filter((kw) => candidateWords.has(kw));

      if (matchedKeywords.length > 0) {
        const confidence = matchedKeywords.length / keywords.length;
        results.push({
          nodeId: candidate.nodeId,
          confidence: Math.min(1.0, confidence),
          matchedKeywords,
        });
      }
    }

    // Sort by confidence descending, deduplicate by nodeId
    const seen = new Set<string>();
    return results
      .sort((a, b) => b.confidence - a.confidence)
      .filter((r) => {
        if (seen.has(r.nodeId)) return false;
        seen.add(r.nodeId);
        return true;
      });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: CASENetworkService | null = null;

/**
 * Initialize the CASENetworkService singleton. Safe to call multiple times;
 * subsequent calls return the existing instance.
 */
export function initializeCASENetworkService(): CASENetworkService {
  if (!instance) {
    instance = new CASENetworkService();
  }
  return instance;
}

/**
 * Get the initialized CASENetworkService singleton.
 * Throws if the service has not been initialized via initializeCASENetworkService().
 */
export function getCASENetworkService(): CASENetworkService {
  if (!instance) {
    throw new Error(
      'CASENetworkService not initialized. Call initializeCASENetworkService first.'
    );
  }
  return instance;
}
