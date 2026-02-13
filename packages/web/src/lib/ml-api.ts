/**
 * ML Pipeline API Client
 * Handles all API interactions for machine learning pipeline management
 */

import type {
  MLModel,
  TrainingJob,
  PredictionResult,
} from '@/types/ml';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA
// =============================================================================

const demoModels: MLModel[] = [
  {
    id: 'model-1',
    name: 'Student Risk Predictor',
    type: 'classification',
    version: '3.2.1',
    accuracy: 94.2,
    status: 'deployed',
    lastTrained: '2024-01-18',
    predictions: 12847,
    framework: 'TensorFlow',
  },
  {
    id: 'model-2',
    name: 'Engagement Forecaster',
    type: 'regression',
    version: '2.1.0',
    accuracy: 89.7,
    status: 'deployed',
    lastTrained: '2024-01-15',
    predictions: 8923,
    framework: 'PyTorch',
  },
  {
    id: 'model-3',
    name: 'Content Recommender',
    type: 'recommendation',
    version: '4.0.0',
    accuracy: 91.5,
    status: 'deployed',
    lastTrained: '2024-01-20',
    predictions: 45210,
    framework: 'TensorFlow',
  },
  {
    id: 'model-4',
    name: 'Learning Style Classifier',
    type: 'clustering',
    version: '1.3.0',
    accuracy: 87.3,
    status: 'deployed',
    lastTrained: '2024-01-12',
    predictions: 6754,
    framework: 'Scikit-learn',
  },
  {
    id: 'model-5',
    name: 'Grade Predictor',
    type: 'regression',
    version: '2.0.1',
    accuracy: 86.8,
    status: 'deployed',
    lastTrained: '2024-01-14',
    predictions: 9312,
    framework: 'PyTorch',
  },
  {
    id: 'model-6',
    name: 'Dropout Detector',
    type: 'classification',
    version: '1.1.0',
    accuracy: 92.1,
    status: 'training',
    lastTrained: '2024-01-10',
    predictions: 3421,
    framework: 'TensorFlow',
  },
  {
    id: 'model-7',
    name: 'Curriculum Optimizer',
    type: 'recommendation',
    version: '1.0.0',
    accuracy: 78.5,
    status: 'training',
    lastTrained: '2024-01-05',
    predictions: 1203,
    framework: 'PyTorch',
  },
  {
    id: 'model-8',
    name: 'Peer Group Matcher',
    type: 'clustering',
    version: '0.9.0',
    accuracy: 72.4,
    status: 'archived',
    lastTrained: '2023-12-20',
    predictions: 542,
    framework: 'Scikit-learn',
  },
];

const demoTrainingJobs: TrainingJob[] = [
  {
    id: 'job-1',
    modelId: 'model-6',
    modelName: 'Dropout Detector',
    status: 'running',
    progress: 67,
    startedAt: '2024-01-20T08:30:00Z',
    duration: '2h 15m',
    metrics: [
      { name: 'Loss', value: 0.0342 },
      { name: 'Accuracy', value: 92.1 },
      { name: 'F1 Score', value: 0.91 },
    ],
  },
  {
    id: 'job-2',
    modelId: 'model-7',
    modelName: 'Curriculum Optimizer',
    status: 'running',
    progress: 34,
    startedAt: '2024-01-20T10:15:00Z',
    duration: '45m',
    metrics: [
      { name: 'Loss', value: 0.0891 },
      { name: 'Accuracy', value: 78.5 },
      { name: 'NDCG', value: 0.82 },
    ],
  },
  {
    id: 'job-3',
    modelId: 'model-1',
    modelName: 'Student Risk Predictor',
    status: 'completed',
    progress: 100,
    startedAt: '2024-01-18T06:00:00Z',
    duration: '4h 32m',
    metrics: [
      { name: 'Loss', value: 0.0215 },
      { name: 'Accuracy', value: 94.2 },
      { name: 'AUC', value: 0.97 },
    ],
  },
  {
    id: 'job-4',
    modelId: 'model-3',
    modelName: 'Content Recommender',
    status: 'completed',
    progress: 100,
    startedAt: '2024-01-20T02:00:00Z',
    duration: '3h 18m',
    metrics: [
      { name: 'Loss', value: 0.0178 },
      { name: 'Accuracy', value: 91.5 },
      { name: 'NDCG', value: 0.93 },
    ],
  },
];

const demoPredictions: PredictionResult[] = [
  // Risk predictions
  { id: 'pred-1', modelName: 'Student Risk Predictor', entityName: 'Tyler Morrison', prediction: 'High Risk', confidence: 92, timestamp: '2024-01-20T11:30:00Z', category: 'risk' },
  { id: 'pred-2', modelName: 'Student Risk Predictor', entityName: 'Bella Thompson', prediction: 'High Risk', confidence: 87, timestamp: '2024-01-20T11:28:00Z', category: 'risk' },
  { id: 'pred-3', modelName: 'Student Risk Predictor', entityName: 'Jake Reynolds', prediction: 'Medium Risk', confidence: 74, timestamp: '2024-01-20T11:25:00Z', category: 'risk' },
  { id: 'pred-4', modelName: 'Student Risk Predictor', entityName: 'Sophie Walsh', prediction: 'Medium Risk', confidence: 68, timestamp: '2024-01-20T11:22:00Z', category: 'risk' },
  { id: 'pred-5', modelName: 'Student Risk Predictor', entityName: 'Ethan Clarke', prediction: 'Low Risk', confidence: 95, timestamp: '2024-01-20T11:20:00Z', category: 'risk' },
  // Engagement predictions
  { id: 'pred-6', modelName: 'Engagement Forecaster', entityName: 'Mia Patterson', prediction: 'Declining', confidence: 81, timestamp: '2024-01-20T10:45:00Z', category: 'engagement' },
  { id: 'pred-7', modelName: 'Engagement Forecaster', entityName: 'Noah Henderson', prediction: 'Declining', confidence: 76, timestamp: '2024-01-20T10:42:00Z', category: 'engagement' },
  { id: 'pred-8', modelName: 'Engagement Forecaster', entityName: 'Chloe Murray', prediction: 'Stable', confidence: 89, timestamp: '2024-01-20T10:40:00Z', category: 'engagement' },
  { id: 'pred-9', modelName: 'Engagement Forecaster', entityName: 'Liam Foster', prediction: 'Declining', confidence: 72, timestamp: '2024-01-20T10:38:00Z', category: 'engagement' },
  // Performance predictions
  { id: 'pred-10', modelName: 'Grade Predictor', entityName: 'Charlotte Webb', prediction: 'A', confidence: 88, timestamp: '2024-01-20T09:30:00Z', category: 'performance' },
  { id: 'pred-11', modelName: 'Grade Predictor', entityName: 'Oliver Bennett', prediction: 'B+', confidence: 82, timestamp: '2024-01-20T09:28:00Z', category: 'performance' },
  { id: 'pred-12', modelName: 'Grade Predictor', entityName: 'Amelia Stewart', prediction: 'C', confidence: 71, timestamp: '2024-01-20T09:25:00Z', category: 'performance' },
  { id: 'pred-13', modelName: 'Grade Predictor', entityName: 'Jack Nguyen', prediction: 'B', confidence: 79, timestamp: '2024-01-20T09:22:00Z', category: 'performance' },
  { id: 'pred-14', modelName: 'Grade Predictor', entityName: 'Isla Campbell', prediction: 'A-', confidence: 85, timestamp: '2024-01-20T09:20:00Z', category: 'performance' },
];

// =============================================================================
// API FUNCTIONS
// =============================================================================

export async function getModels(): Promise<MLModel[]> {
  if (DEMO_MODE) return demoModels;

  const res = await fetch(`${API_BASE}/ml/models`);
  if (!res.ok) throw new Error('Failed to fetch models');
  return res.json();
}

export async function getModelById(id: string): Promise<MLModel | undefined> {
  if (DEMO_MODE) return demoModels.find((m) => m.id === id);

  const res = await fetch(`${API_BASE}/ml/models/${id}`);
  if (!res.ok) throw new Error('Failed to fetch model');
  return res.json();
}

export async function getTrainingJobs(): Promise<TrainingJob[]> {
  if (DEMO_MODE) return demoTrainingJobs;

  const res = await fetch(`${API_BASE}/ml/training-jobs`);
  if (!res.ok) throw new Error('Failed to fetch training jobs');
  return res.json();
}

export async function getPredictions(category?: string): Promise<PredictionResult[]> {
  if (DEMO_MODE) {
    if (category) return demoPredictions.filter((p) => p.category === category);
    return demoPredictions;
  }

  const url = category
    ? `${API_BASE}/ml/predictions?category=${category}`
    : `${API_BASE}/ml/predictions`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch predictions');
  return res.json();
}

export async function trainModel(modelId: string): Promise<TrainingJob> {
  if (DEMO_MODE) {
    const model = demoModels.find((m) => m.id === modelId);
    return {
      id: `job-new-${Date.now()}`,
      modelId,
      modelName: model?.name || 'Unknown',
      status: 'pending',
      progress: 0,
      startedAt: new Date().toISOString(),
      duration: '0m',
      metrics: [],
    };
  }

  const res = await fetch(`${API_BASE}/ml/models/${modelId}/train`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to start training');
  return res.json();
}

export async function deployModel(modelId: string): Promise<MLModel> {
  if (DEMO_MODE) {
    const model = demoModels.find((m) => m.id === modelId);
    if (model) return { ...model, status: 'deployed' };
    throw new Error('Model not found');
  }

  const res = await fetch(`${API_BASE}/ml/models/${modelId}/deploy`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to deploy model');
  return res.json();
}
