'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Info,
} from 'lucide-react';

const models = [
  {
    name: 'Student Risk Predictor',
    description: 'Identifies students at risk of falling behind',
    accuracy: 94.2,
    status: 'active',
    lastPrediction: '5 min ago',
    predictions: 156,
  },
  {
    name: 'Engagement Analyzer',
    description: 'Analyzes student engagement patterns',
    accuracy: 91.8,
    status: 'active',
    lastPrediction: '12 min ago',
    predictions: 243,
  },
  {
    name: 'Learning Style Classifier',
    description: 'Identifies preferred learning modalities',
    accuracy: 87.5,
    status: 'active',
    lastPrediction: '1 hour ago',
    predictions: 89,
  },
  {
    name: 'Performance Forecaster',
    description: 'Predicts future academic performance',
    accuracy: 88.9,
    status: 'active',
    lastPrediction: '30 min ago',
    predictions: 178,
  },
];

export default function MLModelsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Brain className="h-8 w-8" />
            ML Models
          </h1>
          <p className="text-muted-foreground">
            Machine learning models powering your classroom insights
          </p>
        </div>
        <Button variant="outline">
          <Info className="mr-2 h-4 w-4" />
          How It Works
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Active Models</span>
            </div>
            <div className="mt-2 text-2xl font-bold">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Predictions Today</span>
            </div>
            <div className="mt-2 text-2xl font-bold">666</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Avg Accuracy</span>
            </div>
            <div className="mt-2 text-2xl font-bold">90.6%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Students Analyzed</span>
            </div>
            <div className="mt-2 text-2xl font-bold">124</div>
          </CardContent>
        </Card>
      </div>

      {/* Models */}
      <div className="grid gap-4">
        {models.map((model) => (
          <Card key={model.name}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                    <Brain className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{model.name}</h3>
                      <Badge className="bg-green-500">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{model.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{model.predictions} predictions for your class</span>
                      <span>•</span>
                      <span>Last: {model.lastPrediction}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">{model.accuracy}%</div>
                  <p className="text-sm text-muted-foreground">accuracy</p>
                  <Progress value={model.accuracy} className="h-2 w-24 mt-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900">How ML Models Help You</h4>
              <p className="text-sm text-blue-800 mt-1">
                These models analyze student behavior, performance, and engagement patterns to provide
                actionable insights. They help identify students who may need extra support before
                problems become serious, and suggest personalized learning paths.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
