'use client';

/**
 * ML Pipeline Dashboard
 * Model management, training jobs, predictions, and deployment status
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Activity,
  TrendingUp,
  TrendingDown,
  Clock,
  Cpu,
  Zap,
  Play,
  Pause,
  RefreshCw,
  Settings2,
  Download,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Target,
  Users,
  BookOpen,
  GraduationCap,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  MoreHorizontal,
  Eye,
  Trash2,
  Copy,
  Rocket,
  Server,
  GitBranch,
  History,
  FlaskConical,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

// Types
interface MLModel {
  id: string;
  name: string;
  version: string;
  status: 'deployed' | 'training' | 'ready' | 'failed' | 'archived';
  accuracy: number;
  type: 'classification' | 'regression' | 'recommendation';
  lastUpdated: string;
  deployedAt?: string;
  trainingTime?: string;
}

interface TrainingJob {
  id: string;
  modelName: string;
  status: 'running' | 'completed' | 'failed' | 'queued';
  progress: number;
  startedAt: string;
  duration: string;
  epoch: number;
  totalEpochs: number;
  loss: number;
  accuracy: number;
}

interface Prediction {
  studentId: string;
  studentName: string;
  prediction: string;
  confidence: number;
  factors: string[];
  recommendedActions: string[];
}

// Sample models data
const MODELS: MLModel[] = [
  {
    id: 'model1',
    name: 'Student Risk Predictor',
    version: 'v2.3.1',
    status: 'deployed',
    accuracy: 94.2,
    type: 'classification',
    lastUpdated: '2 hours ago',
    deployedAt: 'Jan 28, 2026',
    trainingTime: '4h 23m',
  },
  {
    id: 'model2',
    name: 'Engagement Scorer',
    version: 'v1.8.0',
    status: 'deployed',
    accuracy: 91.8,
    type: 'regression',
    lastUpdated: '1 day ago',
    deployedAt: 'Jan 25, 2026',
    trainingTime: '2h 45m',
  },
  {
    id: 'model3',
    name: 'Performance Predictor',
    version: 'v3.0.0',
    status: 'training',
    accuracy: 89.5,
    type: 'regression',
    lastUpdated: '30 min ago',
    trainingTime: '1h 12m',
  },
  {
    id: 'model4',
    name: 'Content Recommender',
    version: 'v2.1.0',
    status: 'ready',
    accuracy: 87.3,
    type: 'recommendation',
    lastUpdated: '3 days ago',
    trainingTime: '6h 15m',
  },
  {
    id: 'model5',
    name: 'Dropout Predictor',
    version: 'v1.5.2',
    status: 'failed',
    accuracy: 82.1,
    type: 'classification',
    lastUpdated: '5 hours ago',
    trainingTime: '3h 45m',
  },
  {
    id: 'model6',
    name: 'Learning Path Optimizer',
    version: 'v1.0.0',
    status: 'archived',
    accuracy: 78.9,
    type: 'recommendation',
    lastUpdated: '2 weeks ago',
    trainingTime: '8h 30m',
  },
];

// Sample training jobs
const TRAINING_JOBS: TrainingJob[] = [
  {
    id: 'job1',
    modelName: 'Performance Predictor v3.0.0',
    status: 'running',
    progress: 67,
    startedAt: '2 hours ago',
    duration: '2h 15m',
    epoch: 67,
    totalEpochs: 100,
    loss: 0.0342,
    accuracy: 91.2,
  },
  {
    id: 'job2',
    modelName: 'Student Risk Predictor v2.4.0',
    status: 'queued',
    progress: 0,
    startedAt: 'Waiting',
    duration: '-',
    epoch: 0,
    totalEpochs: 150,
    loss: 0,
    accuracy: 0,
  },
  {
    id: 'job3',
    modelName: 'Engagement Scorer v1.9.0',
    status: 'completed',
    progress: 100,
    startedAt: '1 day ago',
    duration: '3h 45m',
    epoch: 100,
    totalEpochs: 100,
    loss: 0.0218,
    accuracy: 93.5,
  },
  {
    id: 'job4',
    modelName: 'Dropout Predictor v1.5.2',
    status: 'failed',
    progress: 45,
    startedAt: '5 hours ago',
    duration: '1h 30m',
    epoch: 45,
    totalEpochs: 100,
    loss: 0.8921,
    accuracy: 45.2,
  },
];

// Sample predictions - Student Risk
const RISK_PREDICTIONS: Prediction[] = [
  {
    studentId: 'STU001',
    studentName: 'Emma Thompson',
    prediction: 'High Risk',
    confidence: 87,
    factors: ['Declining attendance', 'Missed assignments', 'Low engagement'],
    recommendedActions: ['Schedule parent meeting', 'Assign mentor', 'Weekly check-ins'],
  },
  {
    studentId: 'STU002',
    studentName: 'James Wilson',
    prediction: 'Medium Risk',
    confidence: 72,
    factors: ['Grade fluctuations', 'Inconsistent participation'],
    recommendedActions: ['Peer tutoring', 'Study skills workshop'],
  },
  {
    studentId: 'STU003',
    studentName: 'Sophie Chen',
    prediction: 'Low Risk',
    confidence: 94,
    factors: ['Consistent performance', 'Active participation'],
    recommendedActions: ['Continue monitoring'],
  },
];

// Sample predictions - Engagement
const ENGAGEMENT_PREDICTIONS: Prediction[] = [
  {
    studentId: 'STU004',
    studentName: 'Oliver Brown',
    prediction: 'Declining',
    confidence: 81,
    factors: ['Reduced login frequency', 'Shorter session durations'],
    recommendedActions: ['Personalized content recommendations', 'Gamification elements'],
  },
  {
    studentId: 'STU005',
    studentName: 'Ava Martinez',
    prediction: 'Stable',
    confidence: 88,
    factors: ['Consistent usage patterns', 'Regular submissions'],
    recommendedActions: ['Maintain current approach'],
  },
];

// Sample predictions - Performance
const PERFORMANCE_PREDICTIONS: Prediction[] = [
  {
    studentId: 'STU006',
    studentName: 'Liam Johnson',
    prediction: 'Expected: B+',
    confidence: 79,
    factors: ['Current grade trajectory', 'Assignment completion rate'],
    recommendedActions: ['Focus on weak areas', 'Practice assessments'],
  },
  {
    studentId: 'STU007',
    studentName: 'Isabella Garcia',
    prediction: 'Expected: A',
    confidence: 92,
    factors: ['High performance', 'Consistent improvement'],
    recommendedActions: ['Challenge with extension work'],
  },
];

// Training metrics over time
const trainingMetricsData = [
  { epoch: 10, loss: 0.45, accuracy: 72, valLoss: 0.52, valAccuracy: 68 },
  { epoch: 20, loss: 0.32, accuracy: 78, valLoss: 0.38, valAccuracy: 74 },
  { epoch: 30, loss: 0.24, accuracy: 83, valLoss: 0.29, valAccuracy: 79 },
  { epoch: 40, loss: 0.18, accuracy: 86, valLoss: 0.23, valAccuracy: 82 },
  { epoch: 50, loss: 0.12, accuracy: 89, valLoss: 0.18, valAccuracy: 85 },
  { epoch: 60, loss: 0.08, accuracy: 91, valLoss: 0.14, valAccuracy: 88 },
  { epoch: 67, loss: 0.06, accuracy: 92, valLoss: 0.11, valAccuracy: 90 },
];

// Key metrics
const METRICS = [
  { label: 'Active Models', value: '4', change: 0, icon: Brain },
  { label: 'Avg Accuracy', value: '91.2%', change: 2.3, icon: Target },
  { label: 'Predictions Today', value: '12.4K', change: 15.2, icon: Zap },
  { label: 'Training Jobs', value: '2', change: 0, icon: Cpu },
];

export default function MLPipelinePage() {
  const [activeTab, setActiveTab] = useState('models');
  const [predictionTab, setPredictionTab] = useState('risk');

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'training':
      case 'running':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'ready':
      case 'completed':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'queued':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'archived':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'deployed':
        return <Rocket className="w-3 h-3 mr-1" />;
      case 'training':
      case 'running':
        return <Activity className="w-3 h-3 mr-1 animate-pulse" />;
      case 'ready':
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'failed':
        return <XCircle className="w-3 h-3 mr-1" />;
      case 'queued':
        return <Clock className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  const getRiskColor = (prediction: string) => {
    if (prediction.includes('High')) return 'text-red-500';
    if (prediction.includes('Medium') || prediction.includes('Declining')) return 'text-amber-500';
    return 'text-green-500';
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Brain className="w-8 h-8 text-purple-500" />
            ML Pipeline
          </h1>
          <p className="text-muted-foreground mt-1">
            Model management, training, and predictive analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Upload Model
          </Button>
          <Button size="sm">
            <Play className="w-4 h-4 mr-2" />
            New Training Job
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-purple-600" />
                  </div>
                  {metric.change !== 0 && (
                    <Badge
                      variant="secondary"
                      className={cn(
                        'text-xs',
                        metric.change > 0
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      )}
                    >
                      {metric.change > 0 ? (
                        <ArrowUpRight className="w-3 h-3 mr-1" />
                      ) : (
                        <ArrowDownRight className="w-3 h-3 mr-1" />
                      )}
                      {Math.abs(metric.change)}%
                    </Badge>
                  )}
                </div>
                <div className="mt-4">
                  <p className="text-3xl font-bold">{metric.value}</p>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="models" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <FlaskConical className="w-4 h-4" />
              Training
            </TabsTrigger>
            <TabsTrigger value="predictions" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Predictions
            </TabsTrigger>
            <TabsTrigger value="deploy" className="flex items-center gap-2">
              <Rocket className="w-4 h-4" />
              Deployment
            </TabsTrigger>
          </TabsList>

          {/* Models Tab */}
          <TabsContent value="models" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Model Registry</CardTitle>
                    <CardDescription>All registered ML models</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Model Name</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Accuracy</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {MODELS.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{model.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{model.version}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{model.type}</TableCell>
                        <TableCell>
                          <Badge className={cn('capitalize', getStatusColor(model.status))}>
                            {getStatusIcon(model.status)}
                            {model.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              'font-medium',
                              model.accuracy >= 90 ? 'text-green-500' :
                              model.accuracy >= 80 ? 'text-amber-500' : 'text-red-500'
                            )}>
                              {model.accuracy}%
                            </span>
                            <Progress value={model.accuracy} className="w-16 h-2" />
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{model.lastUpdated}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <GitBranch className="w-4 h-4 mr-2" />
                                View Versions
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Play className="w-4 h-4 mr-2" />
                                Retrain
                              </DropdownMenuItem>
                              {model.status === 'ready' && (
                                <DropdownMenuItem>
                                  <Rocket className="w-4 h-4 mr-2" />
                                  Deploy
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-500">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Archive
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Training Jobs */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FlaskConical className="w-5 h-5" />
                    Training Jobs
                  </CardTitle>
                  <CardDescription>Active and recent training runs</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {TRAINING_JOBS.map((job) => (
                    <div key={job.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{job.modelName}</span>
                        </div>
                        <Badge className={cn('capitalize', getStatusColor(job.status))}>
                          {getStatusIcon(job.status)}
                          {job.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span>{job.epoch}/{job.totalEpochs} epochs ({job.progress}%)</span>
                        </div>
                        <Progress value={job.progress} className="h-2" />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Loss</span>
                          <p className="font-medium">{job.loss.toFixed(4)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Accuracy</span>
                          <p className="font-medium">{job.accuracy}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Duration</span>
                          <p className="font-medium">{job.duration}</p>
                        </div>
                      </div>
                      {job.status === 'running' && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="flex-1">
                            <Pause className="w-4 h-4 mr-1" />
                            Pause
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <XCircle className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Training Metrics Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Training Metrics</CardTitle>
                  <CardDescription>Performance Predictor v3.0.0 - Live Training</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={trainingMetricsData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="epoch" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="accuracy"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Training Accuracy"
                        dot={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="valAccuracy"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Validation Accuracy"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="mt-4">
                    <ResponsiveContainer width="100%" height={150}>
                      <AreaChart data={trainingMetricsData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="epoch" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="loss"
                          stroke="#ef4444"
                          fill="#ef4444"
                          fillOpacity={0.2}
                          name="Training Loss"
                        />
                        <Area
                          type="monotone"
                          dataKey="valLoss"
                          stroke="#f59e0b"
                          fill="#f59e0b"
                          fillOpacity={0.2}
                          name="Validation Loss"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Predictions Tab */}
          <TabsContent value="predictions" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Student Predictions
                    </CardTitle>
                    <CardDescription>ML-powered insights for student support</CardDescription>
                  </div>
                  <Tabs value={predictionTab} onValueChange={setPredictionTab}>
                    <TabsList>
                      <TabsTrigger value="risk" className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Risk
                      </TabsTrigger>
                      <TabsTrigger value="engagement" className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        Engagement
                      </TabsTrigger>
                      <TabsTrigger value="performance" className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Performance
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {predictionTab === 'risk' && (
                  <div className="space-y-4">
                    {RISK_PREDICTIONS.map((pred) => (
                      <div key={pred.studentId} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-medium">{pred.studentName}</div>
                              <div className="text-sm text-muted-foreground">{pred.studentId}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn('font-bold', getRiskColor(pred.prediction))}>
                              {pred.prediction}
                            </div>
                            <div className="text-sm text-muted-foreground">{pred.confidence}% confidence</div>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Contributing Factors</div>
                            <div className="flex flex-wrap gap-1">
                              {pred.factors.map((factor) => (
                                <Badge key={factor} variant="outline" className="text-xs">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-2">Recommended Actions</div>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {pred.recommendedActions.map((action, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <ArrowRight className="w-3 h-3" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t">
                          <Button variant="outline" size="sm">View Profile</Button>
                          <Button variant="outline" size="sm">Create Intervention</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {predictionTab === 'engagement' && (
                  <div className="space-y-4">
                    {ENGAGEMENT_PREDICTIONS.map((pred) => (
                      <div key={pred.studentId} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-medium">{pred.studentName}</div>
                              <div className="text-sm text-muted-foreground">{pred.studentId}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className={cn('font-bold', getRiskColor(pred.prediction))}>
                              {pred.prediction}
                            </div>
                            <div className="text-sm text-muted-foreground">{pred.confidence}% confidence</div>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Indicators</div>
                            <div className="flex flex-wrap gap-1">
                              {pred.factors.map((factor) => (
                                <Badge key={factor} variant="outline" className="text-xs">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-2">Recommendations</div>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {pred.recommendedActions.map((action, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <ArrowRight className="w-3 h-3" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {predictionTab === 'performance' && (
                  <div className="space-y-4">
                    {PERFORMANCE_PREDICTIONS.map((pred) => (
                      <div key={pred.studentId} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                              <Users className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="font-medium">{pred.studentName}</div>
                              <div className="text-sm text-muted-foreground">{pred.studentId}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-500">
                              {pred.prediction}
                            </div>
                            <div className="text-sm text-muted-foreground">{pred.confidence}% confidence</div>
                          </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Prediction Factors</div>
                            <div className="flex flex-wrap gap-1">
                              {pred.factors.map((factor) => (
                                <Badge key={factor} variant="outline" className="text-xs">
                                  {factor}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm font-medium mb-2">Recommendations</div>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {pred.recommendedActions.map((action, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <ArrowRight className="w-3 h-3" />
                                  {action}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Deployment Tab */}
          <TabsContent value="deploy" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Deployment Status */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5" />
                    Deployment Status
                  </CardTitle>
                  <CardDescription>Currently deployed models</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {MODELS.filter(m => m.status === 'deployed').map((model) => (
                      <div key={model.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <Rocket className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <div className="font-bold">{model.name}</div>
                              <div className="text-sm text-muted-foreground">{model.version}</div>
                            </div>
                          </div>
                          <Badge className={getStatusColor('deployed')}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Live
                          </Badge>
                        </div>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Accuracy</span>
                            <p className="font-bold text-green-500">{model.accuracy}%</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Deployed</span>
                            <p className="font-medium">{model.deployedAt}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Requests/day</span>
                            <p className="font-medium">4.2K</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Avg Latency</span>
                            <p className="font-medium">45ms</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-4">
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4 mr-1" />
                            Monitor
                          </Button>
                          <Button variant="outline" size="sm">
                            <History className="w-4 h-4 mr-1" />
                            Rollback
                          </Button>
                          <Button variant="outline" size="sm">
                            <Settings2 className="w-4 h-4 mr-1" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Ready for Deployment */}
              <Card>
                <CardHeader>
                  <CardTitle>Ready for Deployment</CardTitle>
                  <CardDescription>Models pending deployment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {MODELS.filter(m => m.status === 'ready').map((model) => (
                    <div key={model.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{model.name}</div>
                          <div className="text-sm text-muted-foreground">{model.version}</div>
                        </div>
                        <Badge variant="outline" className="text-purple-600">Ready</Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-medium">{model.accuracy}%</span>
                      </div>
                      <Button className="w-full" size="sm">
                        <Rocket className="w-4 h-4 mr-2" />
                        Deploy Now
                      </Button>
                    </div>
                  ))}
                  {MODELS.filter(m => m.status === 'ready').length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No models ready for deployment
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Deployment History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Deployment History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Student Risk Predictor v2.3.1 deployed</div>
                      <div className="text-sm text-muted-foreground">Jan 28, 2026 at 10:32 AM</div>
                    </div>
                    <Badge variant="outline" className="text-green-600">Success</Badge>
                  </div>
                  <div className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Engagement Scorer v1.8.0 deployed</div>
                      <div className="text-sm text-muted-foreground">Jan 25, 2026 at 3:15 PM</div>
                    </div>
                    <Badge variant="outline" className="text-green-600">Success</Badge>
                  </div>
                  <div className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-amber-600" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">Student Risk Predictor v2.3.0 rolled back</div>
                      <div className="text-sm text-muted-foreground">Jan 27, 2026 at 11:45 AM</div>
                    </div>
                    <Badge variant="outline" className="text-amber-600">Rollback</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
