'use client';

/**
 * Data Lake Dashboard
 * Real-time analytics and event streaming visualization
 */

import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

// Demo event types
const EVENT_TYPES = [
  { type: 'session.started', color: 'bg-green-500', icon: '▶️' },
  { type: 'session.completed', color: 'bg-blue-500', icon: '✅' },
  { type: 'assessment.submitted', color: 'bg-purple-500', icon: '📝' },
  { type: 'content.viewed', color: 'bg-amber-500', icon: '👁️' },
  { type: 'vocabulary.reviewed', color: 'bg-indigo-500', icon: '🔤' },
  { type: 'achievement.unlocked', color: 'bg-yellow-500', icon: '🏆' },
  { type: 'tutor.booked', color: 'bg-pink-500', icon: '📅' },
  { type: 'payment.completed', color: 'bg-emerald-500', icon: '💳' },
];

interface LiveEvent {
  id: string;
  type: string;
  userId: string;
  timestamp: Date;
  metadata: Record<string, unknown>;
}

interface DataSource {
  name: string;
  type: string;
  status: 'active' | 'syncing' | 'error';
  lastSync: string;
  recordCount: number;
  growth: number;
}

const DATA_SOURCES: DataSource[] = [
  { name: 'Learning Sessions', type: 'PostgreSQL', status: 'active', lastSync: '2 min ago', recordCount: 1_245_832, growth: 12.5 },
  { name: 'User Events', type: 'TimescaleDB', status: 'active', lastSync: '30 sec ago', recordCount: 45_892_103, growth: 28.3 },
  { name: 'Content Library', type: 'MongoDB', status: 'syncing', lastSync: '5 min ago', recordCount: 89_234, growth: 5.2 },
  { name: 'Assessment Results', type: 'PostgreSQL', status: 'active', lastSync: '1 min ago', recordCount: 567_891, growth: 15.7 },
  { name: 'Blockchain Transactions', type: 'Polygon', status: 'active', lastSync: '45 sec ago', recordCount: 23_456, growth: 42.1 },
  { name: 'AI Interactions', type: 'Vector DB', status: 'active', lastSync: '15 sec ago', recordCount: 2_345_678, growth: 67.8 },
];

const METRICS = [
  { label: 'Total Events Today', value: '2.4M', change: 12.5, icon: Activity },
  { label: 'Active Sessions', value: '3,847', change: 8.2, icon: Zap },
  { label: 'Data Ingested', value: '847 GB', change: 15.3, icon: HardDrive },
  { label: 'Query Latency', value: '23ms', change: -5.2, icon: Clock },
];

export default function DataLakePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Data Lake</h1>
          <p className="text-muted-foreground">
            Real-time analytics and event streaming platform
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((metric) => (
          <Card key={metric.label}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <metric.icon className="w-8 h-8 text-muted-foreground" />
                <Badge
                  variant={metric.change >= 0 ? 'default' : 'secondary'}
                  className={cn(
                    'text-xs',
                    metric.change >= 0
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  )}
                >
                  {metric.change >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 mr-1" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 mr-1" />
                  )}
                  {Math.abs(metric.change)}%
                </Badge>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold">{metric.value}</p>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="events">Live Events</TabsTrigger>
          <TabsTrigger value="sources">Data Sources</TabsTrigger>
          <TabsTrigger value="queries">Query Explorer</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Event Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Event Distribution
                </CardTitle>
                <CardDescription>Last 24 hours by event type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {EVENT_TYPES.map((event, index) => {
                    const percentage = Math.floor(Math.random() * 30) + 5;
                    return (
                      <div key={event.type} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span>{event.icon}</span>
                            <span className="font-medium">{event.type}</span>
                          </div>
                          <span className="text-muted-foreground">{percentage}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Throughput Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Ingestion Throughput
                </CardTitle>
                <CardDescription>Events per minute over last hour</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-end justify-between gap-1">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const height = Math.floor(Math.random() * 80) + 20;
                    return (
                      <motion.div
                        key={i}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ duration: 0.5, delay: i * 0.02 }}
                        className="flex-1 bg-primary/80 rounded-t hover:bg-primary transition-colors"
                        title={`${height * 50} events/min`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-xs text-muted-foreground mt-2">
                  <span>60 min ago</span>
                  <span>30 min ago</span>
                  <span>Now</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="w-5 h-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Cpu className="w-4 h-4" />
                      CPU Usage
                    </span>
                    <span className="font-medium">42%</span>
                  </div>
                  <Progress value={42} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <HardDrive className="w-4 h-4" />
                      Storage
                    </span>
                    <span className="font-medium">67%</span>
                  </div>
                  <Progress value={67} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      <Network className="w-4 h-4" />
                      Network I/O
                    </span>
                    <span className="font-medium">28%</span>
                  </div>
                  <Progress value={28} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search events..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={isStreaming ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsStreaming(!isStreaming)}
              >
                {isStreaming ? (
                  <>
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-2" />
                    Live
                  </>
                ) : (
                  <>
                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2" />
                    Paused
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y max-h-[600px] overflow-y-auto">
                <AnimatePresence initial={false}>
                  {filteredEvents.map((event) => {
                    const eventType = EVENT_TYPES.find((e) => e.type === event.type);
                    return (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, height: 0 }}
                        className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div
                          className={cn(
                            'w-2 h-2 rounded-full',
                            eventType?.color || 'bg-gray-500'
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">{event.type}</span>
                            <Badge variant="outline" className="text-xs">
                              {event.userId}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {JSON.stringify(event.metadata)}
                          </p>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">
                          {event.timestamp.toLocaleTimeString()}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DATA_SOURCES.map((source) => (
              <Card key={source.name}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="w-5 h-5 text-primary" />
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
                          'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      )}
                    >
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
                      <span className="font-medium text-green-600">+{source.growth}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Query Explorer</CardTitle>
              <CardDescription>
                Run SQL queries against the data lake
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <textarea
                  className="w-full h-32 p-4 font-mono text-sm bg-muted rounded-lg border resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="SELECT * FROM events WHERE type = 'session.completed' LIMIT 100"
                  defaultValue={`SELECT
  event_type,
  COUNT(*) as event_count,
  AVG(duration_seconds) as avg_duration
FROM learning_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY event_type
ORDER BY event_count DESC
LIMIT 10;`}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Query will run against 45.8M events
                </div>
                <Button>
                  <Zap className="w-4 h-4 mr-2" />
                  Execute Query
                </Button>
              </div>

              {/* Sample Results */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-4 py-2 text-sm font-medium">
                  Results (10 rows, 23ms)
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">event_type</th>
                        <th className="px-4 py-2 text-left font-medium">event_count</th>
                        <th className="px-4 py-2 text-left font-medium">avg_duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr className="hover:bg-muted/50">
                        <td className="px-4 py-2 font-mono">content.viewed</td>
                        <td className="px-4 py-2">245,832</td>
                        <td className="px-4 py-2">127.4s</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="px-4 py-2 font-mono">session.started</td>
                        <td className="px-4 py-2">89,234</td>
                        <td className="px-4 py-2">1,245.8s</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="px-4 py-2 font-mono">vocabulary.reviewed</td>
                        <td className="px-4 py-2">67,891</td>
                        <td className="px-4 py-2">45.2s</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="px-4 py-2 font-mono">session.completed</td>
                        <td className="px-4 py-2">45,123</td>
                        <td className="px-4 py-2">1,892.3s</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="px-4 py-2 font-mono">assessment.submitted</td>
                        <td className="px-4 py-2">23,456</td>
                        <td className="px-4 py-2">892.1s</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
