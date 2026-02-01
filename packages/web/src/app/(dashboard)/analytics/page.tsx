'use client';

/**
 * Analytics Dashboard
 * Comprehensive analytics with configurable widgets, charts, and drill-down capabilities
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Award,
  Download,
  Filter,
  Calendar,
  ChevronDown,
  RefreshCw,
  FileText,
  Mail,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
  BookOpen,
  Activity,
  PieChart as PieChartIcon,
  X,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';

// Types
interface MetricCard {
  id: string;
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: typeof Users;
  color: string;
  category: 'enrollment' | 'engagement' | 'performance';
}

interface DrillDownData {
  metric: MetricCard;
  details: Array<{
    label: string;
    value: string;
    subValue?: string;
  }>;
}

// Sample data for charts
const enrollmentTrendData = [
  { month: 'Jul', students: 1180, target: 1200 },
  { month: 'Aug', students: 1220, target: 1250 },
  { month: 'Sep', students: 1310, target: 1300 },
  { month: 'Oct', students: 1380, target: 1350 },
  { month: 'Nov', students: 1420, target: 1400 },
  { month: 'Dec', students: 1450, target: 1450 },
  { month: 'Jan', students: 1520, target: 1500 },
];

const engagementData = [
  { day: 'Mon', sessions: 845, avgDuration: 32 },
  { day: 'Tue', sessions: 920, avgDuration: 35 },
  { day: 'Wed', sessions: 890, avgDuration: 28 },
  { day: 'Thu', sessions: 980, avgDuration: 38 },
  { day: 'Fri', sessions: 850, avgDuration: 30 },
  { day: 'Sat', sessions: 420, avgDuration: 45 },
  { day: 'Sun', sessions: 380, avgDuration: 42 },
];

const performanceDistribution = [
  { grade: 'A', count: 245, percentage: 24.5 },
  { grade: 'B', count: 312, percentage: 31.2 },
  { grade: 'C', count: 278, percentage: 27.8 },
  { grade: 'D', count: 112, percentage: 11.2 },
  { grade: 'F', count: 53, percentage: 5.3 },
];

const subjectPerformance = [
  { subject: 'Mathematics', avg: 78, students: 420 },
  { subject: 'English', avg: 82, students: 450 },
  { subject: 'Science', avg: 75, students: 380 },
  { subject: 'History', avg: 80, students: 320 },
  { subject: 'Geography', avg: 77, students: 290 },
];

const cohortComparison = [
  { name: 'Year 7', current: 76, previous: 72 },
  { name: 'Year 8', current: 78, previous: 75 },
  { name: 'Year 9', current: 74, previous: 71 },
  { name: 'Year 10', current: 80, previous: 77 },
  { name: 'Year 11', current: 82, previous: 79 },
  { name: 'Year 12', current: 85, previous: 82 },
];

const pieChartData = [
  { name: 'On Track', value: 68, color: '#22c55e' },
  { name: 'At Risk', value: 22, color: '#f59e0b' },
  { name: 'Needs Support', value: 10, color: '#ef4444' },
];

// Metric cards data
const METRIC_CARDS: MetricCard[] = [
  {
    id: 'total-students',
    title: 'Total Students',
    value: '1,520',
    change: 8.2,
    changeLabel: 'vs last term',
    icon: Users,
    color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600',
    category: 'enrollment',
  },
  {
    id: 'new-enrollments',
    title: 'New Enrollments',
    value: '147',
    change: 12.5,
    changeLabel: 'this month',
    icon: GraduationCap,
    color: 'bg-green-100 dark:bg-green-900/30 text-green-600',
    category: 'enrollment',
  },
  {
    id: 'daily-active',
    title: 'Daily Active Users',
    value: '892',
    change: 5.3,
    changeLabel: 'vs yesterday',
    icon: Activity,
    color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600',
    category: 'engagement',
  },
  {
    id: 'avg-session',
    title: 'Avg. Session Duration',
    value: '34 min',
    change: -2.1,
    changeLabel: 'vs last week',
    icon: Clock,
    color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600',
    category: 'engagement',
  },
  {
    id: 'completion-rate',
    title: 'Course Completion',
    value: '76%',
    change: 4.8,
    changeLabel: 'vs last term',
    icon: Target,
    color: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600',
    category: 'performance',
  },
  {
    id: 'avg-grade',
    title: 'Average Grade',
    value: 'B+',
    change: 3.2,
    changeLabel: 'improvement',
    icon: Award,
    color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600',
    category: 'performance',
  },
];

// Date range options
const DATE_RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: 'term', label: 'This term' },
  { value: 'year', label: 'This year' },
  { value: 'custom', label: 'Custom range' },
];

// Cohort options
const COHORTS = [
  { value: 'all', label: 'All Students' },
  { value: 'year7', label: 'Year 7' },
  { value: 'year8', label: 'Year 8' },
  { value: 'year9', label: 'Year 9' },
  { value: 'year10', label: 'Year 10' },
  { value: 'year11', label: 'Year 11' },
  { value: 'year12', label: 'Year 12' },
];

// Subject options
const SUBJECTS = [
  { value: 'all', label: 'All Subjects' },
  { value: 'maths', label: 'Mathematics' },
  { value: 'english', label: 'English' },
  { value: 'science', label: 'Science' },
  { value: 'history', label: 'History' },
  { value: 'geography', label: 'Geography' },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');
  const [cohort, setCohort] = useState('all');
  const [subject, setSubject] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [drillDownData, setDrillDownData] = useState<DrillDownData | null>(null);

  // Handle metric card click for drill-down
  const handleMetricClick = (metric: MetricCard) => {
    // Simulate drill-down data based on metric
    const details = {
      'total-students': [
        { label: 'Primary (F-6)', value: '620', subValue: '41%' },
        { label: 'Secondary (7-10)', value: '580', subValue: '38%' },
        { label: 'Senior (11-12)', value: '320', subValue: '21%' },
      ],
      'new-enrollments': [
        { label: 'This week', value: '42' },
        { label: 'Last week', value: '38' },
        { label: 'Pending approval', value: '12' },
      ],
      'daily-active': [
        { label: 'Morning (6am-12pm)', value: '312', subValue: '35%' },
        { label: 'Afternoon (12pm-6pm)', value: '425', subValue: '48%' },
        { label: 'Evening (6pm-10pm)', value: '155', subValue: '17%' },
      ],
      'avg-session': [
        { label: 'Learning modules', value: '18 min' },
        { label: 'Assessments', value: '12 min' },
        { label: 'Review/Practice', value: '4 min' },
      ],
      'completion-rate': [
        { label: 'On track', value: '68%', subValue: '1,034 students' },
        { label: 'At risk', value: '22%', subValue: '334 students' },
        { label: 'Needs support', value: '10%', subValue: '152 students' },
      ],
      'avg-grade': [
        { label: 'Mathematics', value: 'B', subValue: '78%' },
        { label: 'English', value: 'B+', subValue: '82%' },
        { label: 'Science', value: 'B-', subValue: '75%' },
      ],
    };

    setDrillDownData({
      metric,
      details: details[metric.id as keyof typeof details] || [],
    });
  };

  // Export functions
  const handleExport = (format: 'pdf' | 'csv') => {
    // In a real app, this would trigger an export
    console.log(`Exporting as ${format}...`);
  };

  const handleScheduleReport = () => {
    // In a real app, this would open a scheduling dialog
    console.log('Opening report scheduler...');
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
            <BarChart3 className="w-8 h-8 text-blue-500" />
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive insights into student performance and engagement
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="w-4 h-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileText className="w-4 h-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleScheduleReport}>
                <Mail className="w-4 h-4 mr-2" />
                Schedule Report Delivery
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters:</span>
              </div>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-[160px]">
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cohort} onValueChange={setCohort}>
                <SelectTrigger className="w-[140px]">
                  <Users className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COHORTS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="w-[140px]">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(dateRange !== '30d' || cohort !== 'all' || subject !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setDateRange('30d');
                    setCohort('all');
                    setSubject('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {METRIC_CARDS.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card
              key={metric.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleMetricClick(metric)}
            >
              <CardContent className="p-4">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', metric.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="text-2xl font-bold">{metric.value}</div>
                <div className="text-sm text-muted-foreground">{metric.title}</div>
                <div className="flex items-center gap-1 mt-2">
                  {metric.change >= 0 ? (
                    <ArrowUpRight className="w-3 h-3 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3 text-red-500" />
                  )}
                  <span className={cn('text-xs', metric.change >= 0 ? 'text-green-500' : 'text-red-500')}>
                    {Math.abs(metric.change)}%
                  </span>
                  <span className="text-xs text-muted-foreground">{metric.changeLabel}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Drill-Down Modal */}
      {drillDownData && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setDrillDownData(null)}
        >
          <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{drillDownData.metric.title}</CardTitle>
                <CardDescription>Detailed breakdown</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setDrillDownData(null)}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-3xl font-bold">{drillDownData.metric.value}</div>
              <div className="space-y-3">
                {drillDownData.details.map((detail, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">{detail.label}</span>
                    <div className="text-right">
                      <span className="font-medium">{detail.value}</span>
                      {detail.subValue && (
                        <span className="text-xs text-muted-foreground ml-2">({detail.subValue})</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <Button className="w-full" variant="outline" onClick={() => setDrillDownData(null)}>
                View Full Report
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Charts Section */}
      <motion.div variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Enrollment Trend */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Enrollment Trend
                  </CardTitle>
                  <CardDescription>Student enrollment vs target over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={enrollmentTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="students"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.2}
                        name="Actual"
                      />
                      <Line
                        type="monotone"
                        dataKey="target"
                        stroke="#9ca3af"
                        strokeDasharray="5 5"
                        name="Target"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Student Progress Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5" />
                    Student Progress
                  </CardTitle>
                  <CardDescription>Distribution by progress status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <ResponsiveContainer width="50%" height={250}>
                      <PieChart>
                        <Pie
                          data={pieChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          dataKey="value"
                          label={({ value }) => `${value}%`}
                        >
                          {pieChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-3">
                      {pieChartData.map((item) => (
                        <div key={item.name} className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="text-sm flex-1">{item.name}</span>
                          <span className="font-medium">{item.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subject Performance Comparison */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Subject Performance
                </CardTitle>
                <CardDescription>Average scores across subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={subjectPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" domain={[0, 100]} className="text-xs" />
                    <YAxis dataKey="subject" type="category" width={100} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="avg" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Average Score" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Enrollment Tab */}
          <TabsContent value="enrollment" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Enrollment by Year Level</CardTitle>
                  <CardDescription>Current vs previous term</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cohortComparison}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="current" fill="#3b82f6" name="Current Term" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="previous" fill="#94a3b8" name="Previous Term" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Enrollment Growth</CardTitle>
                  <CardDescription>Monthly trend analysis</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={enrollmentTrendData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="month" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="students"
                        stroke="#22c55e"
                        strokeWidth={2}
                        dot={{ fill: '#22c55e' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Engagement Tab */}
          <TabsContent value="engagement" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Daily Sessions</CardTitle>
                  <CardDescription>Learning sessions throughout the week</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="sessions" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Sessions" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Average Session Duration</CardTitle>
                  <CardDescription>Minutes per session by day</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={engagementData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="day" className="text-xs" />
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
                        dataKey="avgDuration"
                        stroke="#f59e0b"
                        fill="#f59e0b"
                        fillOpacity={0.2}
                        name="Avg Duration (min)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Engagement Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Engagement Metrics</CardTitle>
                <CardDescription>Key engagement indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Content Interaction</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <Progress value={85} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Assessment Completion</span>
                      <span className="font-medium">72%</span>
                    </div>
                    <Progress value={72} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Discussion Participation</span>
                      <span className="font-medium">58%</span>
                    </div>
                    <Progress value={58} className="h-2" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Resource Downloads</span>
                      <span className="font-medium">91%</span>
                    </div>
                    <Progress value={91} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6 mt-6">
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Grade Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle>Grade Distribution</CardTitle>
                  <CardDescription>Student grades across all subjects</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={performanceDistribution}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="grade" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="count" name="Students" radius={[4, 4, 0, 0]}>
                        {performanceDistribution.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={
                              entry.grade === 'A'
                                ? '#22c55e'
                                : entry.grade === 'B'
                                ? '#3b82f6'
                                : entry.grade === 'C'
                                ? '#f59e0b'
                                : entry.grade === 'D'
                                ? '#f97316'
                                : '#ef4444'
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Year Level Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Year Level Performance</CardTitle>
                  <CardDescription>Average performance by cohort</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={cohortComparison}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" className="text-xs" />
                      <YAxis domain={[60, 100]} className="text-xs" />
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
                        dataKey="current"
                        stroke="#22c55e"
                        strokeWidth={2}
                        name="Current Term"
                        dot={{ fill: '#22c55e' }}
                      />
                      <Line
                        type="monotone"
                        dataKey="previous"
                        stroke="#94a3b8"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Previous Term"
                        dot={{ fill: '#94a3b8' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Performance Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Summary by Subject</CardTitle>
                <CardDescription>Detailed breakdown of academic performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {subjectPerformance.map((subject) => (
                    <div key={subject.subject} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{subject.subject}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-muted-foreground">{subject.students} students</span>
                          <Badge variant={subject.avg >= 80 ? 'default' : subject.avg >= 70 ? 'secondary' : 'outline'}>
                            {subject.avg}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={subject.avg} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
