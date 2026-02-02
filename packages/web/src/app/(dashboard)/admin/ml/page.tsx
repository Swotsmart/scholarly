'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Activity,
  Cpu,
  Database,
  RefreshCw,
  Play,
  Pause,
  Settings,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const models = [
  {
    name: 'Student Risk Predictor',
    version: 'v2.3.1',
    status: 'deployed',
    accuracy: 94.2,
    predictions: 12400,
    lastTrained: '3 days ago',
  },
  {
    name: 'Engagement Scorer',
    version: 'v1.8.0',
    status: 'deployed',
    accuracy: 91.8,
    predictions: 45600,
    lastTrained: '1 week ago',
  },
  {
    name: 'Performance Forecaster',
    version: 'v1.2.0',
    status: 'training',
    accuracy: 88.5,
    predictions: 8900,
    lastTrained: 'In progress',
  },
  {
    name: 'Dropout Predictor',
    version: 'v3.0.0',
    status: 'deployed',
    accuracy: 96.1,
    predictions: 3200,
    lastTrained: '2 weeks ago',
  },
  {
    name: 'Content Recommender',
    version: 'v2.1.0',
    status: 'deployed',
    accuracy: 89.3,
    predictions: 78900,
    lastTrained: '5 days ago',
  },
];

const pipelines = [
  { name: 'Daily Feature Extraction', status: 'running', progress: 67, nextRun: 'In 8 hours' },
  { name: 'Weekly Model Retraining', status: 'scheduled', progress: 0, nextRun: 'In 3 days' },
  { name: 'Real-time Inference', status: 'running', progress: 100, nextRun: 'Continuous' },
];

export default function MLPipelinePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8" />
            ML Pipeline Administration
          </h1>
          <p className="text-muted-foreground">
            Manage machine learning models and data pipelines
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button>
            <Play className="mr-2 h-4 w-4" />
            Run Pipeline
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Models</span>
            </div>
            <div className="mt-2 text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground mt-1">4 deployed, 1 training</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Predictions Today</span>
            </div>
            <div className="mt-2 text-2xl font-bold">149K</div>
            <p className="text-xs text-emerald-600 mt-1">+12% vs yesterday</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Avg. Accuracy</span>
            </div>
            <div className="mt-2 text-2xl font-bold">92.0%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Training Data</span>
            </div>
            <div className="mt-2 text-2xl font-bold">2.4M</div>
            <p className="text-xs text-muted-foreground mt-1">records</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="models" className="space-y-4">
        <TabsList>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="pipelines">Pipelines</TabsTrigger>
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-4">
          {models.map((model) => (
            <Card key={model.name}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Brain className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{model.name}</h3>
                        <Badge variant="outline">{model.version}</Badge>
                        <Badge variant={model.status === 'deployed' ? 'default' : 'secondary'}>
                          {model.status === 'deployed' ? (
                            <><CheckCircle2 className="mr-1 h-3 w-3" /> Deployed</>
                          ) : (
                            <><RefreshCw className="mr-1 h-3 w-3 animate-spin" /> Training</>
                          )}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Accuracy: {model.accuracy}%</span>
                        <span>•</span>
                        <span>{model.predictions.toLocaleString()} predictions</span>
                        <span>•</span>
                        <span>Last trained: {model.lastTrained}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">View Metrics</Button>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Retrain
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="pipelines">
          <Card>
            <CardHeader>
              <CardTitle>Data Pipelines</CardTitle>
              <CardDescription>ETL and model training pipelines</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pipelines.map((pipeline) => (
                  <div key={pipeline.name} className="p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${
                          pipeline.status === 'running' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                        }`} />
                        <span className="font-medium">{pipeline.name}</span>
                        <Badge variant="secondary">{pipeline.status}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Next: {pipeline.nextRun}</span>
                        {pipeline.status === 'running' ? (
                          <Button size="icon" variant="outline">
                            <Pause className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button size="icon" variant="outline">
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {pipeline.progress > 0 && (
                      <Progress value={pipeline.progress} className="h-2" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monitoring">
          <Card>
            <CardHeader>
              <CardTitle>Model Monitoring</CardTitle>
              <CardDescription>Performance metrics and drift detection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { metric: 'Prediction Latency', value: '23ms', status: 'healthy', threshold: '<100ms' },
                  { metric: 'Model Drift', value: '2.1%', status: 'healthy', threshold: '<5%' },
                  { metric: 'Feature Coverage', value: '98.5%', status: 'healthy', threshold: '>95%' },
                  { metric: 'Error Rate', value: '0.3%', status: 'healthy', threshold: '<1%' },
                ].map((item) => (
                  <div key={item.metric} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">{item.metric}</p>
                        <p className="text-sm text-muted-foreground">Threshold: {item.threshold}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{item.value}</p>
                      <Badge variant="secondary" className="text-green-600">{item.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
