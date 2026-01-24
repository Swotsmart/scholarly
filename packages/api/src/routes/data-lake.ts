/**
 * Data Lake Routes
 *
 * API endpoints for data ingestion, ETL pipelines, and data catalog
 */

import { Router } from 'express';
import { z } from 'zod';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { authMiddleware } from '../middleware/auth';
import { getDataLakeService } from '../services';
import { log } from '../lib/logger';

export const dataLakeRouter: Router = Router();

// All routes require authentication
dataLakeRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

const registerDataSourceSchema = z.object({
  name: z.string(),
  type: z.enum([
    'lms_events',
    'assessment_results',
    'student_profiles',
    'attendance',
    'learning_analytics',
    'teacher_observations',
    'parent_engagement',
    'external_api',
    'file_upload',
    'iot_sensors',
    'video_analytics',
  ]),
  connectionConfig: z.object({
    type: z.enum(['database', 'api', 'file', 'stream', 'webhook']),
    host: z.string().optional(),
    port: z.number().optional(),
    database: z.string().optional(),
    baseUrl: z.string().optional(),
    authType: z.enum(['api_key', 'oauth2', 'basic']).optional(),
    storageType: z.enum(['s3', 'gcs', 'azure_blob', 'local']).optional(),
    bucket: z.string().optional(),
    path: z.string().optional(),
    streamType: z.enum(['kafka', 'rabbitmq', 'sqs', 'pubsub']).optional(),
    topic: z.string().optional(),
    credentialId: z.string().optional(),
  }),
  ingestionSchedule: z.object({
    type: z.enum(['realtime', 'batch']),
    cronExpression: z.string().optional(),
    batchSize: z.number().optional(),
  }).optional(),
});

const createPipelineSchema = z.object({
  name: z.string(),
  description: z.string(),
  sourceIds: z.array(z.string()),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum([
      'extract',
      'validate',
      'clean',
      'transform',
      'enrich',
      'aggregate',
      'filter',
      'join',
      'ai_enhance',
      'anonymize',
      'load',
    ]),
    config: z.record(z.unknown()),
    order: z.number(),
    dependencies: z.array(z.string()).optional(),
  })),
  destination: z.object({
    type: z.enum(['data_warehouse', 'data_mart', 'feature_store', 'ml_dataset', 'report_table']),
    tableName: z.string(),
  }),
  schedule: z.object({
    type: z.enum(['realtime', 'batch']),
    cronExpression: z.string().optional(),
  }).optional(),
});

const createCatalogEntrySchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum(['table', 'view', 'dataset', 'feature', 'metric']),
  tags: z.array(z.string()),
  owner: z.string(),
  schema: z.object({
    version: z.string(),
    fields: z.array(z.object({
      name: z.string(),
      type: z.enum(['string', 'integer', 'float', 'boolean', 'datetime', 'json', 'array']),
      nullable: z.boolean(),
      description: z.string().optional(),
      piiClassification: z.enum(['none', 'indirect', 'direct', 'sensitive']).optional(),
    })),
    primaryKey: z.array(z.string()).optional(),
  }),
});

const searchCatalogSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  owner: z.string().optional(),
});

const createStreamingPipelineSchema = z.object({
  name: z.string(),
  source: z.object({
    type: z.enum(['kafka', 'kinesis', 'pubsub', 'websocket', 'webhook']),
    config: z.record(z.unknown()),
    deserializer: z.enum(['json', 'avro', 'protobuf']),
  }),
  processors: z.array(z.object({
    id: z.string(),
    type: z.enum(['filter', 'map', 'aggregate', 'join', 'window', 'ai_inference']),
    config: z.record(z.unknown()),
  })),
  sinks: z.array(z.object({
    id: z.string(),
    type: z.enum(['database', 'warehouse', 'cache', 'webhook', 'alert']),
    config: z.record(z.unknown()),
  })),
  windowConfig: z.object({
    type: z.enum(['tumbling', 'sliding', 'session']),
    duration: z.number(),
    durationUnit: z.enum(['seconds', 'minutes', 'hours']),
    slide: z.number().optional(),
    slideUnit: z.enum(['seconds', 'minutes']).optional(),
  }),
  checkpointConfig: z.object({
    enabled: z.boolean(),
    intervalMs: z.number(),
    storage: z.enum(['s3', 'gcs', 'local']),
  }),
});

// ============================================================================
// Data Source Routes
// ============================================================================

/**
 * GET /api/v1/data-lake/sources
 * List data sources
 */
dataLakeRouter.get('/sources', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const dataLakeService = getDataLakeService();
  const result = await dataLakeService.getDataSources(tenantId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { sources: result.data },
  });
});

/**
 * POST /api/v1/data-lake/sources
 * Register new data source
 */
dataLakeRouter.post('/sources', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = registerDataSourceSchema.parse(req.body);

    const dataLakeService = getDataLakeService();
    const result = await dataLakeService.registerDataSource(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Data source registered', { tenantId, sourceId: result.data.id });

    res.status(201).json({
      success: true,
      data: { source: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/data-lake/sources/:id/validate
 * Validate data source connection
 */
dataLakeRouter.post('/sources/:id/validate', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const dataLakeService = getDataLakeService();
  const sources = await dataLakeService.getDataSources(tenantId);

  if (!sources.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  const source = sources.data.find(s => s.id === id);
  if (!source) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  const result = await dataLakeService.validateConnection(source);

  res.json({
    success: true,
    data: { valid: result.success },
  });
});

/**
 * POST /api/v1/data-lake/sources/:id/infer-schema
 * Infer schema from data source
 */
dataLakeRouter.post('/sources/:id/infer-schema', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const dataLakeService = getDataLakeService();
  const sources = await dataLakeService.getDataSources(tenantId);

  if (!sources.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  const source = sources.data.find(s => s.id === id);
  if (!source) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  const result = await dataLakeService.inferSchema(source);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { schema: result.data },
  });
});

// ============================================================================
// ETL Pipeline Routes
// ============================================================================

/**
 * GET /api/v1/data-lake/pipelines
 * List ETL pipelines
 */
dataLakeRouter.get('/pipelines', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const dataLakeService = getDataLakeService();
  const result = await dataLakeService.getPipelines(tenantId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { pipelines: result.data },
  });
});

/**
 * POST /api/v1/data-lake/pipelines
 * Create ETL pipeline
 */
dataLakeRouter.post('/pipelines', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = createPipelineSchema.parse(req.body);

    const dataLakeService = getDataLakeService();
    const result = await dataLakeService.createPipeline(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('ETL pipeline created', { tenantId, pipelineId: result.data.id });

    res.status(201).json({
      success: true,
      data: { pipeline: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/data-lake/pipelines/:id/run
 * Run ETL pipeline
 */
dataLakeRouter.post('/pipelines/:id/run', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const dataLakeService = getDataLakeService();
  const result = await dataLakeService.runPipeline(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  log.info('ETL pipeline executed', { tenantId, pipelineId: id, runResult: result.data.status });

  res.json({
    success: true,
    data: { run: result.data },
  });
});

// ============================================================================
// Data Catalog Routes
// ============================================================================

/**
 * GET /api/v1/data-lake/catalog
 * Search data catalog
 */
dataLakeRouter.get('/catalog', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const filters = searchCatalogSchema.parse(req.query);

    const dataLakeService = getDataLakeService();
    const result = await dataLakeService.searchCatalog(
      tenantId,
      filters.q || '',
      {
        type: filters.type,
        tags: filters.tags,
        owner: filters.owner,
      }
    );

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { entries: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/data-lake/catalog
 * Create catalog entry
 */
dataLakeRouter.post('/catalog', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = createCatalogEntrySchema.parse(req.body);

    const dataLakeService = getDataLakeService();
    const result = await dataLakeService.createCatalogEntry(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Catalog entry created', { tenantId, entryId: result.data.id });

    res.status(201).json({
      success: true,
      data: { entry: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * GET /api/v1/data-lake/catalog/:id/lineage
 * Get data lineage
 */
dataLakeRouter.get('/catalog/:id/lineage', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const dataLakeService = getDataLakeService();
  const result = await dataLakeService.getDataLineage(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { lineage: result.data },
  });
});

/**
 * POST /api/v1/data-lake/catalog/:id/assess-quality
 * Assess data quality
 */
dataLakeRouter.post('/catalog/:id/assess-quality', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const dataLakeService = getDataLakeService();
  const result = await dataLakeService.assessDataQuality(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { quality: result.data },
  });
});

// ============================================================================
// Streaming Pipeline Routes
// ============================================================================

/**
 * POST /api/v1/data-lake/streaming
 * Create streaming pipeline
 */
dataLakeRouter.post('/streaming', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = createStreamingPipelineSchema.parse(req.body);

    const dataLakeService = getDataLakeService();
    const result = await dataLakeService.createStreamingPipeline(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info('Streaming pipeline created', { tenantId, pipelineId: result.data.id });

    res.status(201).json({
      success: true,
      data: { pipeline: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/data-lake/streaming/:id/start
 * Start streaming pipeline
 */
dataLakeRouter.post('/streaming/:id/start', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const dataLakeService = getDataLakeService();
  const result = await dataLakeService.startStreamingPipeline(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  log.info('Streaming pipeline started', { tenantId, pipelineId: id });

  res.json({
    success: true,
    data: { pipeline: result.data },
  });
});

/**
 * POST /api/v1/data-lake/streaming/:id/stop
 * Stop streaming pipeline
 */
dataLakeRouter.post('/streaming/:id/stop', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const dataLakeService = getDataLakeService();
  const result = await dataLakeService.stopStreamingPipeline(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  log.info('Streaming pipeline stopped', { tenantId, pipelineId: id });

  res.json({
    success: true,
    data: { pipeline: result.data },
  });
});

// ============================================================================
// AI-Powered Features Routes
// ============================================================================

/**
 * POST /api/v1/data-lake/ai/generate-schema
 * Generate schema from sample data using AI
 */
dataLakeRouter.post('/ai/generate-schema', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const schema = z.object({
    sampleData: z.array(z.record(z.unknown())),
  });

  try {
    const data = schema.parse(req.body);

    const dataLakeService = getDataLakeService();
    const result = await dataLakeService.generateAISchema(tenantId, data.sampleData);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { schema: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/data-lake/ai/suggest-transformations
 * Suggest ETL transformations using AI
 */
dataLakeRouter.post('/ai/suggest-transformations', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const schema = z.object({
    sourceSchema: z.object({
      version: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.enum(['string', 'integer', 'float', 'boolean', 'datetime', 'json', 'array']),
        nullable: z.boolean(),
      })),
    }),
    targetDescription: z.string(),
  });

  try {
    const data = schema.parse(req.body);

    const dataLakeService = getDataLakeService();
    const result = await dataLakeService.suggestTransformations(
      tenantId,
      data.sourceSchema,
      data.targetDescription
    );

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { stages: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

/**
 * POST /api/v1/data-lake/ai/detect-anomalies
 * Detect anomalies in data using AI
 */
dataLakeRouter.post('/ai/detect-anomalies', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const schema = z.object({
    tableId: z.string(),
    sensitivityLevel: z.enum(['low', 'medium', 'high']).optional(),
  });

  try {
    const data = schema.parse(req.body);

    const dataLakeService = getDataLakeService();
    const result = await dataLakeService.detectAnomalies(tenantId, data.tableId, {
      sensitivityLevel: data.sensitivityLevel,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { anomalies: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});
