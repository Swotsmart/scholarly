'use client';

/**
 * Data Lake Explorer
 * Visual ETL builder, data catalog, quality monitoring, and data source management
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Activity,
  TrendingUp,
  Clock,
  Server,
  Zap,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Filter,
  Download,
  Search,
  Layers,
  HardDrive,
  Cpu,
  Network,
  Play,
  Pause,
  Plus,
  GripVertical,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  XCircle,
  FileText,
  Table,
  BookOpen,
  Settings2,
  Eye,
  Trash2,
  Copy,
  Link,
  GitBranch,
  Box,
  Workflow,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// Types
interface LiveEvent {
  id: string;
  type: string;
  userId: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

interface DataSource {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'syncing' | 'error' | 'paused';
  lastSync: string;
  recordCount: number;
  growth: number;
  icon: typeof Database;
}

interface PipelineStage {
  id: string;
  type: 'source' | 'transform' | 'filter' | 'aggregate' | 'destination';
  name: string;
  config: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'error';
}

interface DataCatalogItem {
  id: string;
  name: string;
  schema: string;
  type: 'table' | 'view' | 'stream';
  columns: number;
  rows: number;
  lastUpdated: string;
  owner: string;
  tags: string[];
}

interface QualityMetric {
  name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  details: string;
}

// Demo event types
const EVENT_TYPES = [
  { type: 'session.started', color: 'bg-green-500', icon: Play },
  { type: 'session.completed', color: 'bg-blue-500', icon: CheckCircle2 },
  { type: 'assessment.submitted', color: 'bg-purple-500', icon: FileText },
  { type: 'content.viewed', color: 'bg-amber-500', icon: Eye },
  { type: 'vocabulary.reviewed', color: 'bg-indigo-500', icon: BookOpen },
  { type: 'achievement.unlocked', color: 'bg-yellow-500', icon: Zap },
];

// Data sources
const DATA_SOURCES: DataSource[] = [
  { id: 'ds1', name: 'Learning Sessions', type: 'PostgreSQL', status: 'active', lastSync: '2 min ago', recordCount: 1_245_832, growth: 12.5, icon: Database },
  { id: 'ds2', name: 'User Events', type: 'TimescaleDB', status: 'active', lastSync: '30 sec ago', recordCount: 45_892_103, growth: 28.3, icon: Activity },
  { id: 'ds3', name: 'Content Library', type: 'MongoDB', status: 'syncing', lastSync: '5 min ago', recordCount: 89_234, growth: 5.2, icon: FileText },
  { id: 'ds4', name: 'Assessment Results', type: 'PostgreSQL', status: 'active', lastSync: '1 min ago', recordCount: 567_891, growth: 15.7, icon: Table },
  { id: 'ds5', name: 'Blockchain Records', type: 'Polygon', status: 'active', lastSync: '45 sec ago', recordCount: 23_456, growth: 42.1, icon: Link },
  { id: 'ds6', name: 'AI Interactions', type: 'Vector DB', status: 'error', lastSync: '15 min ago', recordCount: 2_345_678, growth: 67.8, icon: Zap },
];

// Data catalog items
const CATALOG_ITEMS: DataCatalogItem[] = [
  { id: 'cat1', name: 'students', schema: 'public', type: 'table', columns: 24, rows: 15420, lastUpdated: '2 hours ago', owner: 'admin', tags: ['core', 'pii'] },
  { id: 'cat2', name: 'learning_sessions', schema: 'analytics', type: 'table', columns: 18, rows: 1245832, lastUpdated: '5 min ago', owner: 'data-team', tags: ['analytics', 'events'] },
  { id: 'cat3', name: 'assessment_scores', schema: 'public', type: 'table', columns: 12, rows: 567891, lastUpdated: '1 hour ago', owner: 'admin', tags: ['core', 'grades'] },
  { id: 'cat4', name: 'student_progress_view', schema: 'reports', type: 'view', columns: 8, rows: 15420, lastUpdated: '30 min ago', owner: 'analytics', tags: ['reporting'] },
  { id: 'cat5', name: 'content_interactions', schema: 'analytics', type: 'stream', columns: 6, rows: 89234567, lastUpdated: 'live', owner: 'data-team', tags: ['streaming', 'events'] },
  { id: 'cat6', name: 'curriculum_standards', schema: 'reference', type: 'table', columns: 15, rows: 2456, lastUpdated: '1 week ago', owner: 'curriculum', tags: ['reference', 'static'] },
];

// Quality metrics
const QUALITY_METRICS: QualityMetric[] = [
  { name: 'Completeness', score: 94, trend: 'up', details: '94% of required fields populated' },
  { name: 'Accuracy', score: 98, trend: 'stable', details: '98% pass validation rules' },
  { name: 'Consistency', score: 91, trend: 'up', details: '91% cross-source consistency' },
  { name: 'Timeliness', score: 89, trend: 'down', details: '89% within SLA window' },
  { name: 'Uniqueness', score: 99, trend: 'stable', details: '99% no duplicate records' },
];

// Pipeline stage types for ETL builder
const STAGE_TYPES = [
  { type: 'source', label: 'Source', icon: Database, color: 'bg-blue-500' },
  { type: 'transform', label: 'Transform', icon: GitBranch, color: 'bg-purple-500' },
  { type: 'filter', label: 'Filter', icon: Filter, color: 'bg-amber-500' },
  { type: 'aggregate', label: 'Aggregate', icon: Layers, color: 'bg-green-500' },
  { type: 'destination', label: 'Destination', icon: Box, color: 'bg-rose-500' },
];

// Metrics
const METRICS = [
  { label: 'Total Events Today', value: '2.4M', change: 12.5, icon: Activity },
  { label: 'Active Pipelines', value: '12', change: 0, icon: Workflow },
  { label: 'Data Quality Score', value: '94%', change: 2.1, icon: CheckCircle2 },
  { label: 'Avg Latency', value: '23ms', change: -5.2, icon: Clock },
];

export default function DataLakePage() {
  const [activeTab, setActiveTab] = useState('pipeline');
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogFilter, setCatalogFilter] = useState('all');

  // ETL Pipeline state
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([
    { id: 'stage1', type: 'source', name: 'User Events', config: { source: 'timescaledb' }, status: 'completed' },
    { id: 'stage2', type: 'filter', name: 'Active Users', config: { condition: 'last_login > 7 days' }, status: 'completed' },
    { id: 'stage3', type: 'transform', name: 'Enrich Data', config: { join: 'students' }, status: 'running' },
    { id: 'stage4', type: 'aggregate', name: 'Daily Summary', config: { groupBy: 'date' }, status: 'pending' },
    { id: 'stage5', type: 'destination', name: 'Analytics DB', config: { target: 'bigquery' }, status: 'pending' },
  ]);
  const [draggedStage, setDraggedStage] = useState<string | null>(null);

  // Simulate live event stream
  useEffect(() => {
    if (!isStreaming) return;

    const interval = setInterval(() => {
      const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];
      const newEvent: LiveEvent = {
        id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: eventType.type,
        userId: `user-${Math.floor(Math.random() * 10000)}`,
        timestamp: new Date(),
        metadata: {
          duration: Math.floor(Math.random() * 3600),
          score: Math.floor(Math.random() * 100),
          module: ['phonics', 'numeracy', 'vocabulary', 'grammar'][Math.floor(Math.random() * 4)],
        },
      };

      setLiveEvents((prev) => [newEvent, ...prev.slice(0, 49)]);
    }, 800);

    return () => clearInterval(interval);
  }, [isStreaming]);

  const filteredEvents = liveEvents.filter(
    (event) =>
      event.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.userId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCatalog = CATALOG_ITEMS.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = catalogFilter === 'all' || item.type === catalogFilter;
    return matchesSearch && matchesFilter;
  });

  // Drag and drop handlers for pipeline builder
  const handleDragStart = (stageId: string) => {
    setDraggedStage(stageId);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedStage || draggedStage === targetId) return;
  };

  const handleDrop = (targetId: string) => {
    if (!draggedStage || draggedStage === targetId) return;

    const dragIndex = pipelineStages.findIndex(s => s.id === draggedStage);
    const dropIndex = pipelineStages.findIndex(s => s.id === targetId);

    const newStages = [...pipelineStages];
    const [removed] = newStages.splice(dragIndex, 1);
    newStages.splice(dropIndex, 0, removed);

    setPipelineStages(newStages);
    setDraggedStage(null);
  };

  const addPipelineStage = (type: string) => {
    const stageType = STAGE_TYPES.find(s => s.type === type);
    if (!stageType) return;

    const newStage: PipelineStage = {
      id: `stage-${Date.now()}`,
      type: type as PipelineStage['type'],
      name: `New ${stageType.label}`,
      config: {},
      status: 'pending',
    };

    setPipelineStages([...pipelineStages, newStage]);
  };

  const removeStage = (stageId: string) => {
    setPipelineStages(pipelineStages.filter(s => s.id !== stageId));
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
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
            <Database className="w-8 h-8 text-blue-500" />
            Data Lake Explorer
          </h1>
          <p className="text-muted-foreground mt-1">
            Visual ETL builder, data catalog, and quality monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
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
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
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
            <TabsTrigger value="pipeline" className="flex items-center gap-2">
              <Workflow className="w-4 h-4" />
              ETL Pipeline
            </TabsTrigger>
            <TabsTrigger value="catalog" className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              Data Catalog
            </TabsTrigger>
            <TabsTrigger value="quality" className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Quality
            </TabsTrigger>
            <TabsTrigger value="sources" className="flex items-center gap-2">
              <Database className="w-4 h-4" />
              Sources
            </TabsTrigger>
          </TabsList>

          {/* ETL Pipeline Tab */}
          <TabsContent value="pipeline" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Workflow className="w-5 h-5" />
                      Visual ETL Builder
                    </CardTitle>
                    <CardDescription>Drag and drop stages to build your data pipeline</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Play className="w-4 h-4 mr-2" />
                      Run Pipeline
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Stage Palette */}
                <div className="flex items-center gap-2 mb-6 p-3 bg-muted rounded-lg">
                  <span className="text-sm font-medium mr-2">Add Stage:</span>
                  {STAGE_TYPES.map((stage) => {
                    const Icon = stage.icon;
                    return (
                      <Button
                        key={stage.type}
                        variant="outline"
                        size="sm"
                        onClick={() => addPipelineStage(stage.type)}
                        className="flex items-center gap-2"
                      >
                        <div className={cn('w-3 h-3 rounded-full', stage.color)} />
                        <Icon className="w-4 h-4" />
                        {stage.label}
                      </Button>
                    );
                  })}
                </div>

                {/* Pipeline Stages */}
                <div className="flex items-center gap-4 overflow-x-auto pb-4">
                  {pipelineStages.map((stage, index) => {
                    const stageType = STAGE_TYPES.find(s => s.type === stage.type);
                    const Icon = stageType?.icon || Box;
                    return (
                      <div key={stage.id} className="flex items-center">
                        <motion.div
                          draggable
                          onDragStart={() => handleDragStart(stage.id)}
                          onDragOver={(e) => handleDragOver(e, stage.id)}
                          onDrop={() => handleDrop(stage.id)}
                          layout
                          className={cn(
                            'relative min-w-[180px] p-4 rounded-lg border-2 cursor-move transition-all',
                            draggedStage === stage.id && 'opacity-50',
                            stage.status === 'running' && 'border-blue-500 bg-blue-50 dark:bg-blue-950',
                            stage.status === 'completed' && 'border-green-500 bg-green-50 dark:bg-green-950',
                            stage.status === 'error' && 'border-red-500 bg-red-50 dark:bg-red-950',
                            stage.status === 'pending' && 'border-muted-foreground/30'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-muted-foreground" />
                              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stageType?.color)}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => removeStage(stage.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </div>
                          <div className="font-medium text-sm">{stage.name}</div>
                          <div className="text-xs text-muted-foreground capitalize">{stage.type}</div>
                          <div className="flex items-center gap-1 mt-2">
                            {stage.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-500" />}
                            {stage.status === 'running' && <Activity className="w-3 h-3 text-blue-500 animate-pulse" />}
                            {stage.status === 'error' && <XCircle className="w-3 h-3 text-red-500" />}
                            {stage.status === 'pending' && <Clock className="w-3 h-3 text-muted-foreground" />}
                            <span className="text-xs capitalize">{stage.status}</span>
                          </div>
                        </motion.div>
                        {index < pipelineStages.length - 1 && (
                          <ArrowRight className="w-6 h-6 text-muted-foreground mx-2 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                  {pipelineStages.length === 0 && (
                    <div className="flex-1 flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
                      <div className="text-center text-muted-foreground">
                        <Plus className="w-8 h-8 mx-auto mb-2" />
                        <p>Add stages to build your pipeline</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pipeline Stats */}
                <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">5</div>
                    <div className="text-xs text-muted-foreground">Total Stages</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">2</div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-500">1</div>
                    <div className="text-xs text-muted-foreground">Running</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">2</div>
                    <div className="text-xs text-muted-foreground">Pending</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Catalog Tab */}
          <TabsContent value="catalog" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5" />
                      Data Dictionary
                    </CardTitle>
                    <CardDescription>Browse and search your data assets</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search tables, views..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 w-[250px]"
                      />
                    </div>
                    <Select value={catalogFilter} onValueChange={setCatalogFilter}>
                      <SelectTrigger className="w-[130px]">
                        <SelectValue placeholder="Filter by type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="table">Tables</SelectItem>
                        <SelectItem value="view">Views</SelectItem>
                        <SelectItem value="stream">Streams</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredCatalog.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center',
                          item.type === 'table' && 'bg-blue-100 dark:bg-blue-900/30',
                          item.type === 'view' && 'bg-purple-100 dark:bg-purple-900/30',
                          item.type === 'stream' && 'bg-green-100 dark:bg-green-900/30'
                        )}>
                          {item.type === 'table' && <Table className="w-5 h-5 text-blue-600" />}
                          {item.type === 'view' && <Eye className="w-5 h-5 text-purple-600" />}
                          {item.type === 'stream' && <Activity className="w-5 h-5 text-green-600" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.schema}.</span>
                            <span className="font-bold">{item.name}</span>
                            <Badge variant="outline" className="text-xs capitalize">{item.type}</Badge>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <span>{item.columns} columns</span>
                            <span>{item.rows.toLocaleString()} rows</span>
                            <span>Updated {item.lastUpdated}</span>
                            <span>Owner: {item.owner}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        <Button variant="ghost" size="sm">
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quality Tab */}
          <TabsContent value="quality" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Overall Quality Score */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Overall Data Quality
                  </CardTitle>
                  <CardDescription>Aggregate quality score across all data sources</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center py-8">
                    <div className="relative w-40 h-40">
                      <svg className="w-40 h-40 transform -rotate-90">
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          className="text-muted"
                        />
                        <circle
                          cx="80"
                          cy="80"
                          r="70"
                          stroke="currentColor"
                          strokeWidth="12"
                          fill="none"
                          strokeDasharray={440}
                          strokeDashoffset={440 * (1 - 0.94)}
                          className="text-green-500"
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold">94%</span>
                        <span className="text-sm text-muted-foreground">Quality Score</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quality Metrics */}
              <Card>
                <CardHeader>
                  <CardTitle>Quality Dimensions</CardTitle>
                  <CardDescription>Breakdown by quality dimension</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {QUALITY_METRICS.map((metric) => (
                    <div key={metric.name} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{metric.name}</span>
                          {metric.trend === 'up' && <TrendingUp className="w-4 h-4 text-green-500" />}
                          {metric.trend === 'down' && <ArrowDownRight className="w-4 h-4 text-red-500" />}
                          {metric.trend === 'stable' && <ArrowRight className="w-4 h-4 text-muted-foreground" />}
                        </div>
                        <Badge
                          variant={metric.score >= 95 ? 'default' : metric.score >= 90 ? 'secondary' : 'outline'}
                          className={cn(
                            metric.score >= 95 && 'bg-green-100 text-green-700 dark:bg-green-900/30',
                            metric.score >= 90 && metric.score < 95 && 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
                            metric.score < 90 && 'bg-red-100 text-red-700 dark:bg-red-900/30'
                          )}
                        >
                          {metric.score}%
                        </Badge>
                      </div>
                      <Progress value={metric.score} className="h-2" />
                      <p className="text-xs text-muted-foreground">{metric.details}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Quality Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Active Quality Issues
                </CardTitle>
                <CardDescription>Issues requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 p-3 border rounded-lg bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <div className="flex-1">
                      <div className="font-medium">Missing email addresses</div>
                      <div className="text-sm text-muted-foreground">142 student records have null email fields</div>
                    </div>
                    <Badge variant="outline">Medium</Badge>
                    <Button variant="outline" size="sm">Investigate</Button>
                  </div>
                  <div className="flex items-center gap-4 p-3 border rounded-lg bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <div className="flex-1">
                      <div className="font-medium">Data sync failure</div>
                      <div className="text-sm text-muted-foreground">AI Interactions source failed 15 min ago</div>
                    </div>
                    <Badge variant="outline" className="border-red-300 text-red-600">High</Badge>
                    <Button variant="outline" size="sm">Fix</Button>
                  </div>
                  <div className="flex items-center gap-4 p-3 border rounded-lg">
                    <AlertCircle className="w-5 h-5 text-blue-500" />
                    <div className="flex-1">
                      <div className="font-medium">Schema drift detected</div>
                      <div className="text-sm text-muted-foreground">New column added to content_library table</div>
                    </div>
                    <Badge variant="outline">Info</Badge>
                    <Button variant="outline" size="sm">Review</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data Sources Tab */}
          <TabsContent value="sources" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {DATA_SOURCES.map((source) => {
                const Icon = source.icon;
                return (
                  <Card key={source.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{source.name}</h3>
                            <p className="text-xs text-muted-foreground">{source.type}</p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            source.status === 'active'
                              ? 'default'
                              : source.status === 'syncing'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className={cn(
                            source.status === 'active' &&
                              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
                            source.status === 'syncing' &&
                              'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                            source.status === 'error' &&
                              'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          )}
                        >
                          {source.status === 'syncing' && <RefreshCw className="w-3 h-3 mr-1 animate-spin" />}
                          {source.status}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Records</span>
                          <span className="font-medium">
                            {source.recordCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last Sync</span>
                          <span className="font-medium">{source.lastSync}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Growth (30d)</span>
                          <span className="font-medium text-green-600 flex items-center gap-1">
                            <ArrowUpRight className="w-3 h-3" />
                            {source.growth}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                        <Button variant="outline" size="sm" className="flex-1">
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Sync
                        </Button>
                        <Button variant="outline" size="sm" className="flex-1">
                          <Settings2 className="w-4 h-4 mr-1" />
                          Config
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Add New Source */}
            <Card className="border-dashed">
              <CardContent className="p-6 flex items-center justify-center">
                <Button variant="outline" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Connect New Data Source
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
