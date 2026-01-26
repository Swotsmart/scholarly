'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Brain,
  Search,
  Plus,
  Rocket,
  Archive,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Activity,
  TrendingUp,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const models = [
  { id: 'model-1', name: 'Student Risk Predictor', type: 'classification' as const, version: '3.2.1', accuracy: 94.2, status: 'deployed' as const, lastTrained: '18 Jan 2024', predictions: 12847, framework: 'TensorFlow' },
  { id: 'model-2', name: 'Engagement Forecaster', type: 'regression' as const, version: '2.1.0', accuracy: 89.7, status: 'deployed' as const, lastTrained: '15 Jan 2024', predictions: 8923, framework: 'PyTorch' },
  { id: 'model-3', name: 'Content Recommender', type: 'recommendation' as const, version: '4.0.0', accuracy: 91.5, status: 'deployed' as const, lastTrained: '20 Jan 2024', predictions: 45210, framework: 'TensorFlow' },
  { id: 'model-4', name: 'Learning Style Classifier', type: 'clustering' as const, version: '1.3.0', accuracy: 87.3, status: 'deployed' as const, lastTrained: '12 Jan 2024', predictions: 6754, framework: 'Scikit-learn' },
  { id: 'model-5', name: 'Grade Predictor', type: 'regression' as const, version: '2.0.1', accuracy: 86.8, status: 'deployed' as const, lastTrained: '14 Jan 2024', predictions: 9312, framework: 'PyTorch' },
  { id: 'model-6', name: 'Dropout Detector', type: 'classification' as const, version: '1.1.0', accuracy: 92.1, status: 'training' as const, lastTrained: '10 Jan 2024', predictions: 3421, framework: 'TensorFlow' },
  { id: 'model-7', name: 'Curriculum Optimizer', type: 'recommendation' as const, version: '1.0.0', accuracy: 78.5, status: 'training' as const, lastTrained: '5 Jan 2024', predictions: 1203, framework: 'PyTorch' },
  { id: 'model-8', name: 'Peer Group Matcher', type: 'clustering' as const, version: '0.9.0', accuracy: 72.4, status: 'archived' as const, lastTrained: '20 Dec 2023', predictions: 542, framework: 'Scikit-learn' },
];

const selectedModelMetrics = [
  { metric: 'Accuracy', v1: 88.3, v2: 91.7, v3: 94.2 },
  { metric: 'Precision', v1: 86.5, v2: 90.2, v3: 93.8 },
  { metric: 'Recall', v1: 84.1, v2: 89.4, v3: 92.5 },
  { metric: 'F1 Score', v1: 85.3, v2: 89.8, v3: 93.1 },
  { metric: 'AUC', v1: 90.2, v2: 93.5, v3: 96.8 },
];

const statusConfig = {
  deployed: { label: 'Deployed', icon: CheckCircle2, className: 'bg-green-500/10 text-green-700 border-green-200' },
  training: { label: 'Training', icon: Activity, className: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  archived: { label: 'Archived', icon: Archive, className: 'bg-gray-500/10 text-gray-700 border-gray-200' },
  failed: { label: 'Failed', icon: AlertCircle, className: 'bg-red-500/10 text-red-700 border-red-200' },
};

const typeConfig: Record<string, { label: string; className: string }> = {
  classification: { label: 'Classification', className: 'bg-purple-500/10 text-purple-700 border-purple-200' },
  regression: { label: 'Regression', className: 'bg-blue-500/10 text-blue-700 border-blue-200' },
  recommendation: { label: 'Recommendation', className: 'bg-green-500/10 text-green-700 border-green-200' },
  clustering: { label: 'Clustering', className: 'bg-orange-500/10 text-orange-700 border-orange-200' },
};

export default function MLModelsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedModel, setSelectedModel] = useState<string | null>('model-1');

  const filteredModels = models.filter((model) => {
    const matchesSearch = model.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || model.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const activeModel = models.find((m) => m.id === selectedModel);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Model Management</h1>
          <p className="text-muted-foreground">
            Manage and monitor machine learning models
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Model
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="classification">Classification</SelectItem>
            <SelectItem value="regression">Regression</SelectItem>
            <SelectItem value="recommendation">Recommendation</SelectItem>
            <SelectItem value="clustering">Clustering</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Model Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Models
          </CardTitle>
          <CardDescription>
            {filteredModels.length} models found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Name</th>
                  <th className="pb-3 pr-4 font-medium">Type</th>
                  <th className="pb-3 pr-4 font-medium">Version</th>
                  <th className="pb-3 pr-4 font-medium text-center">Accuracy</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium">Last Trained</th>
                  <th className="pb-3 pr-4 font-medium text-right">Predictions</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredModels.map((model) => {
                  const sConfig = statusConfig[model.status];
                  const tConfig = typeConfig[model.type];
                  const StatusIcon = sConfig.icon;
                  const isSelected = selectedModel === model.id;

                  return (
                    <tr
                      key={model.id}
                      className={`cursor-pointer text-sm transition-colors ${
                        isSelected ? 'bg-muted/50' : 'hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedModel(model.id)}
                    >
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-2">
                          <Brain className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">{model.name}</p>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge className={tConfig.className}>
                          {tConfig.label}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="font-mono text-xs">{model.version}</span>
                      </td>
                      <td className="py-4 pr-4 text-center">
                        <span className={`font-bold ${
                          model.accuracy >= 90 ? 'text-green-600' :
                          model.accuracy >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {model.accuracy}%
                        </span>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge className={sConfig.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {sConfig.label}
                        </Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <span className="text-muted-foreground">{model.lastTrained}</span>
                      </td>
                      <td className="py-4 pr-4 text-right">
                        <span className="font-medium">{model.predictions.toLocaleString()}</span>
                      </td>
                      <td className="py-4">
                        <div className="flex items-center gap-1">
                          {model.status !== 'deployed' && model.status !== 'training' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <Rocket className="mr-1 h-3 w-3" />
                              Deploy
                            </Button>
                          )}
                          {model.status === 'deployed' && (
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              <Archive className="mr-1 h-3 w-3" />
                              Archive
                            </Button>
                          )}
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            <RefreshCw className="mr-1 h-3 w-3" />
                            Retrain
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Selected Model Detail */}
      {activeModel && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {activeModel.name} - Version History Metrics
                </CardTitle>
                <CardDescription>
                  Performance metrics across model versions ({activeModel.framework})
                </CardDescription>
              </div>
              <Badge className={statusConfig[activeModel.status].className}>
                {activeModel.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={selectedModelMetrics}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="metric" className="text-xs" />
                  <YAxis domain={[70, 100]} className="text-xs" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="v1" name="v1.x" fill="hsl(var(--muted-foreground))" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="v2" name="v2.x" fill="hsl(220 70% 60%)" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="v3" name="v3.x (current)" fill="hsl(142 70% 45%)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
