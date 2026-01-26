'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  Brain,
  Cpu,
  Activity,
  Zap,
  Play,
  Rocket,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Server,
} from 'lucide-react';

const stats = [
  { label: 'Models', value: '8', icon: Brain, color: 'purple' },
  { label: 'Deployed', value: '5', icon: Rocket, color: 'green' },
  { label: 'Training Jobs', value: '3', description: 'active', icon: Cpu, color: 'blue' },
  { label: 'Predictions Today', value: '1,247', icon: Zap, color: 'orange' },
];

const systemMetrics = [
  { name: 'GPU Utilization', value: 73, color: 'blue' },
  { name: 'Memory Usage', value: 58, color: 'purple' },
];

const recentJobs = [
  { id: 'job-1', model: 'Dropout Detector', status: 'running' as const, progress: 67, duration: '2h 15m' },
  { id: 'job-2', model: 'Curriculum Optimizer', status: 'running' as const, progress: 34, duration: '45m' },
  { id: 'job-3', model: 'Student Risk Predictor', status: 'completed' as const, progress: 100, duration: '4h 32m' },
  { id: 'job-4', model: 'Content Recommender', status: 'completed' as const, progress: 100, duration: '3h 18m' },
];

const activeModels = [
  { id: 'model-1', name: 'Student Risk Predictor', type: 'Classification', accuracy: 94.2, predictions: 12847 },
  { id: 'model-2', name: 'Engagement Forecaster', type: 'Regression', accuracy: 89.7, predictions: 8923 },
  { id: 'model-3', name: 'Content Recommender', type: 'Recommendation', accuracy: 91.5, predictions: 45210 },
  { id: 'model-4', name: 'Learning Style Classifier', type: 'Clustering', accuracy: 87.3, predictions: 6754 },
  { id: 'model-5', name: 'Grade Predictor', type: 'Regression', accuracy: 86.8, predictions: 9312 },
];

const jobStatusConfig = {
  running: { label: 'Running', icon: Activity, className: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-green-500/10 text-green-700 border-green-200' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  failed: { label: 'Failed', icon: AlertCircle, className: 'bg-red-500/10 text-red-700 border-red-200' },
};

const typeColors: Record<string, string> = {
  Classification: 'bg-purple-500/10 text-purple-700 border-purple-200',
  Regression: 'bg-blue-500/10 text-blue-700 border-blue-200',
  Recommendation: 'bg-green-500/10 text-green-700 border-green-200',
  Clustering: 'bg-orange-500/10 text-orange-700 border-orange-200',
};

export default function MLPipelinePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">ML Pipeline</h1>
          <p className="text-muted-foreground">
            Machine learning model management and predictions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/ml/models">
              <Brain className="mr-2 h-4 w-4" />
              Manage Models
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ml/predictions">
              <BarChart3 className="mr-2 h-4 w-4" />
              View Predictions
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                      {stat.description && <span className="ml-1">({stat.description})</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            System Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            {systemMetrics.map((metric) => (
              <div key={metric.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{metric.name}</span>
                  <span className="font-medium">{metric.value}%</span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            ))}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Inference Latency</span>
                <span className="font-medium">12ms</span>
              </div>
              <div className="flex h-2 items-center">
                <div className="h-2 w-full rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-green-500"
                    style={{ width: '12%' }}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Target: &lt;100ms</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Training Jobs */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Recent Training Jobs
              </CardTitle>
              <CardDescription>Latest model training activity</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Play className="mr-2 h-4 w-4" />
              Train Model
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentJobs.map((job) => {
              const config = jobStatusConfig[job.status];
              const StatusIcon = config.icon;
              return (
                <div
                  key={job.id}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="flex-1">
                    <p className="font-medium">{job.model}</p>
                    <p className="text-sm text-muted-foreground">Duration: {job.duration}</p>
                  </div>
                  <div className="w-32">
                    <Progress value={job.progress} className="h-2" />
                    <p className="mt-1 text-xs text-right text-muted-foreground">{job.progress}%</p>
                  </div>
                  <Badge className={config.className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Active Models */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Active Models
              </CardTitle>
              <CardDescription>Currently deployed models</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/ml/models">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {activeModels.map((model) => (
              <div
                key={model.id}
                className="rounded-lg border p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{model.name}</p>
                  <Badge className={typeColors[model.type]}>
                    {model.type}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Accuracy</span>
                  <span className="font-bold text-green-600">{model.accuracy}%</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Predictions</span>
                  <span className="font-medium">{model.predictions.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Play className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Train Model</h3>
              <p className="text-sm text-muted-foreground">
                Start a new training job
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Rocket className="h-6 w-6 text-green-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Deploy Model</h3>
              <p className="text-sm text-muted-foreground">
                Deploy a trained model
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>

        <Link href="/ml/predictions">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <BarChart3 className="h-6 w-6 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">View Predictions</h3>
                <p className="text-sm text-muted-foreground">
                  Explore prediction results
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
