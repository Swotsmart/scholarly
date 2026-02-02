'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  ArrowUp,
  ArrowDown,
  Minus,
  Filter,
  Download,
  RefreshCw,
} from 'lucide-react';

const predictions = [
  {
    student: 'James Wilson',
    initials: 'JW',
    riskLevel: 'high',
    riskScore: 0.85,
    trend: 'declining',
    factors: ['Declining attendance', 'Low engagement', 'Missing assignments'],
    recommendation: 'Schedule parent meeting and provide additional support',
  },
  {
    student: 'Emma Thompson',
    initials: 'ET',
    riskLevel: 'medium',
    riskScore: 0.62,
    trend: 'stable',
    factors: ['Inconsistent participation', 'Below average quiz scores'],
    recommendation: 'Consider peer tutoring or study group',
  },
  {
    student: 'Liam Chen',
    initials: 'LC',
    riskLevel: 'medium',
    riskScore: 0.58,
    trend: 'improving',
    factors: ['Recent grade improvement', 'Still below class average'],
    recommendation: 'Continue current support strategies',
  },
  {
    student: 'Sophie Garcia',
    initials: 'SG',
    riskLevel: 'low',
    riskScore: 0.25,
    trend: 'stable',
    factors: ['Consistent performance'],
    recommendation: 'Consider advanced challenges',
  },
];

const getTrendIcon = (trend: string) => {
  switch (trend) {
    case 'improving':
      return <ArrowUp className="h-4 w-4 text-green-500" />;
    case 'declining':
      return <ArrowDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-gray-500" />;
  }
};

const getRiskBadge = (level: string) => {
  switch (level) {
    case 'high':
      return <Badge variant="destructive">High Risk</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-500">Medium Risk</Badge>;
    default:
      return <Badge className="bg-green-500">Low Risk</Badge>;
  }
};

export default function MLPredictionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            Student Predictions
          </h1>
          <p className="text-muted-foreground">
            AI-powered insights for your class
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm text-red-700">High Risk</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-red-700">1</div>
            <p className="text-sm text-red-600">student</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <span className="text-sm text-yellow-700">Medium Risk</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-yellow-700">2</div>
            <p className="text-sm text-yellow-600">students</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-700">Low Risk</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-700">21</div>
            <p className="text-sm text-green-600">students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Class Average</span>
            </div>
            <div className="mt-2 text-2xl font-bold">0.32</div>
            <p className="text-sm text-muted-foreground">risk score</p>
          </CardContent>
        </Card>
      </div>

      {/* Predictions List */}
      <Card>
        <CardHeader>
          <CardTitle>Student Risk Analysis</CardTitle>
          <CardDescription>
            Sorted by risk level - highest risk students first
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {predictions.map((prediction) => (
              <div key={prediction.student} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>{prediction.initials}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{prediction.student}</h4>
                        {getRiskBadge(prediction.riskLevel)}
                        <div className="flex items-center gap-1 text-sm">
                          {getTrendIcon(prediction.trend)}
                          <span className="capitalize">{prediction.trend}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {prediction.factors.map((factor) => (
                          <Badge key={factor} variant="outline" className="text-xs">
                            {factor}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        <span className="font-medium">Recommendation:</span> {prediction.recommendation}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">
                      {(prediction.riskScore * 100).toFixed(0)}%
                    </div>
                    <p className="text-sm text-muted-foreground">confidence</p>
                    <Progress
                      value={prediction.riskScore * 100}
                      className={`h-2 w-20 mt-2 ${
                        prediction.riskLevel === 'high' ? '[&>div]:bg-red-500' :
                        prediction.riskLevel === 'medium' ? '[&>div]:bg-yellow-500' : ''
                      }`}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button size="sm">View Profile</Button>
                  <Button variant="outline" size="sm">Contact Parent</Button>
                  <Button variant="outline" size="sm">Create Intervention Plan</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
