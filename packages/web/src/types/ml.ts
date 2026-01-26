export interface MLModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'recommendation' | 'clustering';
  version: string;
  accuracy: number;
  status: 'training' | 'deployed' | 'archived' | 'failed';
  lastTrained: string;
  predictions: number;
  framework: string;
}

export interface TrainingJob {
  id: string;
  modelId: string;
  modelName: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startedAt: string;
  duration: string;
  metrics: { name: string; value: number }[];
}

export interface PredictionResult {
  id: string;
  modelName: string;
  entityName: string;
  prediction: string;
  confidence: number;
  timestamp: string;
  category: 'risk' | 'engagement' | 'performance';
}
