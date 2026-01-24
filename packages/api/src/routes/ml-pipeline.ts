/**
 * ML Pipeline Routes
 *
 * API endpoints for machine learning model management, training, and predictions
 */

import { Router } from 'express';
import { z } from 'zod';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { authMiddleware } from '../middleware/auth';
import { getMLPipelineService } from '../services';
import { log } from '../lib/logger';

export const mlPipelineRouter: Router = Router();

// All routes require authentication
mlPipelineRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

const createModelSchema = z.object({
  name: z.string(),
  description: z.string(),
  type: z.enum([
    'classification',
    'regression',
    'clustering',
    'recommendation',
    'time_series',
    'anomaly_detection',
    'nlp',
    'embedding',
  ]),
  framework: z.enum(['sklearn', 'tensorflow', 'pytorch', 'xgboost', 'lightgbm', 'prophet', 'custom']),
  hyperparameters: z.record(z.unknown()),
  featureConfig: z.object({
    features: z.array(z.object({
      name: z.string(),
      sourceField: z.string(),
      dataType: z.enum(['numeric', 'categorical', 'text', 'datetime', 'embedding']),
      required: z.boolean(),
      preprocessing: z.array(z.object({
        type: z.enum(['normalize', 'standardize', 'encode', 'impute', 'bin', 'log_transform', 'clip']),
        params: z.record(z.unknown()).optional(),
      })).optional(),
    })),
    featureEngineering: z.array(z.object({
      name: z.string(),
      type: z.enum(['derived', 'aggregated', 'windowed', 'interaction', 'embedding']),
      expression: z.string().optional(),
      config: z.record(z.unknown()),
    })),
    featureStore: z.string().optional(),
  }),
  targetConfig: z.object({
    field: z.string(),
    type: z.enum(['binary', 'multiclass', 'continuous', 'multilabel']),
    classes: z.array(z.string()).optional(),
    threshold: z.number().optional(),
  }),
  trainingConfig: z.object({
    datasetId: z.string(),
    trainTestSplit: z.number().min(0.1).max(0.9),
    validationSplit: z.number().min(0).max(0.5).optional(),
    crossValidation: z.object({
      strategy: z.enum(['kfold', 'stratified', 'time_series', 'group']),
      folds: z.number().min(2).max(20),
      groupColumn: z.string().optional(),
    }).optional(),
    maxEpochs: z.number().optional(),
    earlyStoppingPatience: z.number().optional(),
    batchSize: z.number().optional(),
    learningRate: z.number().optional(),
  }),
  tags: z.array(z.string()),
  owner: z.string(),
});

const deployModelSchema = z.object({
  endpoint: z.string(),
  replicas: z.number().min(1).max(10),
  minReplicas: z.number().optional(),
  maxReplicas: z.number().optional(),
  cpuLimit: z.string(),
  memoryLimit: z.string(),
  gpuEnabled: z.boolean(),
  batchingEnabled: z.boolean(),
  maxBatchSize: z.number().optional(),
  maxLatencyMs: z.number().optional(),
  caching: z.object({
    enabled: z.boolean(),
    ttlSeconds: z.number(),
    maxSize: z.number(),
  }),
  monitoring: z.object({
    enabled: z.boolean(),
    alertThresholds: z.array(z.object({
      metric: z.string(),
      operator: z.enum(['lt', 'gt', 'lte', 'gte']),
      value: z.number(),
      severity: z.enum(['warning', 'critical']),
    })),
    driftDetection: z.boolean(),
    driftThreshold: z.number().optional(),
  }),
});

const predictSchema = z.object({
  input: z.record(z.unknown()),
});

const autoMLSchema = z.object({
  datasetId: z.string(),
  targetColumn: z.string(),
  problemType: z.enum(['classification', 'regression']),
  optimizationMetric: z.string(),
  maxTrials: z.number().min(1).max(100),
  maxTimeMinutes: z.number().min(1).max(1440),
  excludeAlgorithms: z.array(z.string()).optional(),
  featureSelection: z.boolean(),
  hyperparameterTuning: z.boolean(),
});

const createFeatureStoreSchema = z.object({
  name: z.string(),
  description: z.string(),
  features: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    dataType: z.enum(['numeric', 'categorical', 'text', 'embedding']),
    entityType: z.enum(['student', 'teacher', 'course', 'school', 'content']),
    aggregationType: z.enum(['latest', 'sum', 'avg', 'count', 'max', 'min']).optional(),
    timeWindow: z.string().optional(),
    sourceQuery: z.string(),
  })),
  refreshSchedule: z.string().optional(),
});

// ============================================================================
// Model Management Routes
// ============================================================================

/**
 * GET /api/v1/ml/models
 * List ML models
 */
mlPipelineRouter.get('/models', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const type = req.query.type as string | undefined;
  const status = req.query.status as string | undefined;

  const mlService = getMLPipelineService();
  const result = await mlService.listModels(tenantId, {
    type: type as any,
    status: status as any,
  });

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { models: result.data },
  });
});

/**
 * GET /api/v1/ml/models/:id
 * Get specific model
 */
mlPipelineRouter.get('/models/:id', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const mlService = getMLPipelineService();
  const result = await mlService.getModel(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { model: result.data },
  });
});

/**
 * POST /api/v1/ml/models
 * Create new ML model
 */
mlPipelineRouter.post('/models', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = createModelSchema.parse(req.body);

    const mlService = getMLPipelineService();
    const result = await mlService.createModel(tenantId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, modelId: result.data.id }, 'ML model created');

    res.status(201).json({
      success: true,
      data: { model: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

// ============================================================================
// Model Training Routes
// ============================================================================

/**
 * POST /api/v1/ml/models/:id/train
 * Start model training
 */
mlPipelineRouter.post('/models/:id/train', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const mlService = getMLPipelineService();
  const result = await mlService.trainModel(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  log.info({ tenantId, modelId: id, jobId: result.data.id }, 'Model training started');

  res.json({
    success: true,
    data: { job: result.data },
  });
});

/**
 * GET /api/v1/ml/training-jobs/:id
 * Get training job status
 */
mlPipelineRouter.get('/training-jobs/:id', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const mlService = getMLPipelineService();
  const result = await mlService.getTrainingJob(tenantId, id);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { job: result.data },
  });
});

// ============================================================================
// AutoML Routes
// ============================================================================

/**
 * POST /api/v1/ml/automl
 * Run AutoML
 */
mlPipelineRouter.post('/automl', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = autoMLSchema.parse(req.body);

    const mlService = getMLPipelineService();
    const result = await mlService.runAutoML(tenantId, data.datasetId, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, bestModelId: result.data.bestModel.id }, 'AutoML completed');

    res.json({
      success: true,
      data: result.data,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

// ============================================================================
// Model Deployment Routes
// ============================================================================

/**
 * POST /api/v1/ml/models/:id/deploy
 * Deploy model
 */
mlPipelineRouter.post('/models/:id/deploy', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  try {
    const data = deployModelSchema.parse(req.body);

    const mlService = getMLPipelineService();
    const result = await mlService.deployModel(tenantId, id, data);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, modelId: id, endpoint: data.endpoint }, 'Model deployed');

    res.json({
      success: true,
      data: { model: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

// ============================================================================
// Prediction Routes
// ============================================================================

/**
 * POST /api/v1/ml/models/:id/predict
 * Make prediction
 */
mlPipelineRouter.post('/models/:id/predict', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  try {
    const data = predictSchema.parse(req.body);

    const mlService = getMLPipelineService();
    const result = await mlService.predict(tenantId, id, data.input);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { prediction: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

// ============================================================================
// Education-Specific Prediction Routes
// ============================================================================

/**
 * GET /api/v1/ml/predictions/student-risk/:studentId
 * Predict student risk
 */
mlPipelineRouter.get('/predictions/student-risk/:studentId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { studentId } = req.params;

  const mlService = getMLPipelineService();
  const result = await mlService.predictStudentRisk(tenantId, studentId);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { prediction: result.data },
  });
});

/**
 * GET /api/v1/ml/predictions/performance/:entityId
 * Predict performance
 */
mlPipelineRouter.get('/predictions/performance/:entityId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { entityId } = req.params;
  const entityType = (req.query.entityType as 'student' | 'class' | 'school') || 'student';
  const metric = (req.query.metric as string) || 'academic_score';
  const forecastPeriods = parseInt(req.query.forecastPeriods as string) || 6;

  const mlService = getMLPipelineService();
  const result = await mlService.predictPerformance(tenantId, entityId, entityType, metric, forecastPeriods);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { prediction: result.data },
  });
});

/**
 * GET /api/v1/ml/predictions/engagement/:userId
 * Predict engagement
 */
mlPipelineRouter.get('/predictions/engagement/:userId', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { userId } = req.params;
  const userType = (req.query.userType as 'student' | 'teacher' | 'parent') || 'student';

  const mlService = getMLPipelineService();
  const result = await mlService.predictEngagement(tenantId, userId, userType);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { prediction: result.data },
  });
});

/**
 * POST /api/v1/ml/predictions/learning-path
 * Recommend learning path
 */
mlPipelineRouter.post('/predictions/learning-path', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  const schema = z.object({
    studentId: z.string(),
    targetSkills: z.array(z.string()),
  });

  try {
    const data = schema.parse(req.body);

    const mlService = getMLPipelineService();
    const result = await mlService.recommendLearningPath(tenantId, data.studentId, data.targetSkills);

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    res.json({
      success: true,
      data: { recommendation: result.data },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const apiError = ScholarlyApiError.validationError(error.errors);
      return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
    }
    throw error;
  }
});

// ============================================================================
// Feature Store Routes
// ============================================================================

/**
 * POST /api/v1/ml/feature-stores
 * Create feature store
 */
mlPipelineRouter.post('/feature-stores', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = createFeatureStoreSchema.parse(req.body);

    const mlService = getMLPipelineService();
    const result = await mlService.createFeatureStore(tenantId, {
      name: data.name,
      description: data.description,
      features: data.features.map(f => ({
        ...f,
        statistics: {
          count: 0,
          nullCount: 0,
        },
      })),
      refreshSchedule: data.refreshSchedule,
    });

    if (!result.success) {
      const error = new ScholarlyApiError('SYS_001');
      return res.status(error.statusCode).json(error.toResponse(requestId));
    }

    log.info({ tenantId, featureStoreId: result.data.id }, 'Feature store created');

    res.status(201).json({
      success: true,
      data: { featureStore: result.data },
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
 * GET /api/v1/ml/feature-stores/:id/features
 * Get feature vector for entity
 */
mlPipelineRouter.get('/feature-stores/:id/features', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const entityId = req.query.entityId as string;
  const featureNames = ((req.query.features as string) || '').split(',').filter(Boolean);

  if (!entityId) {
    const apiError = ScholarlyApiError.validationError([{ path: ['entityId'], message: 'entityId is required' }]);
    return res.status(apiError.statusCode).json(apiError.toResponse(requestId));
  }

  const mlService = getMLPipelineService();
  const result = await mlService.getFeatureVector(tenantId, id, entityId, featureNames);

  if (!result.success) {
    const error = new ScholarlyApiError('SYS_001');
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  res.json({
    success: true,
    data: { features: result.data },
  });
});
