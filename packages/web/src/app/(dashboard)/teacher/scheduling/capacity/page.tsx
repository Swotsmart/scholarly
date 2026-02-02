'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader, StatsCard } from '@/components/shared';
import { Progress } from '@/components/ui/progress';
import {
  Building,
  Users,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Calendar,
  Clock,
  Settings,
  BarChart3,
  Lightbulb,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Maximize,
  Monitor,
  Wrench,
  Package,
  MapPin,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Download,
  Play,
  Pause,
  Info,
  Plus,
  ShieldAlert,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

// RBAC Helper - checks if user has capacity planning permissions
function hasCapacityPlanningAccess(user: { role?: string; permissions?: string[]; groups?: string[] } | null): boolean {
  if (!user) return false;

  // Admins always have access
  if (user.role === 'platform_admin' || user.role === 'admin') return true;

  // Check for specific permission
  if (user.permissions?.includes('capacity_planner')) return true;

  // Check for specific group
  if (user.groups?.includes('capacity_planning')) return true;

  return false;
}

// Types
interface RoomUtilization {
  id: string;
  name: string;
  type: 'classroom' | 'lab' | 'hall' | 'gym' | 'library' | 'makerspace';
  capacity: number;
  currentUsage: number;
  utilizationRate: number;
  peakHours: string;
  status: 'optimal' | 'underutilized' | 'overcrowded';
}

interface StaffAllocation {
  id: string;
  name: string;
  department: string;
  teachingLoad: number;
  maxLoad: number;
  reliefCount: number;
  status: 'optimal' | 'overloaded' | 'available';
}

interface DemandForecast {
  period: string;
  rooms: number;
  staff: number;
  trend: 'up' | 'down' | 'stable';
}

interface Scenario {
  id: string;
  name: string;
  description: string;
  impact: string;
  status: 'draft' | 'analyzing' | 'ready';
  staffChange: number;
  roomChange: number;
}

interface Equipment {
  id: string;
  name: string;
  location: string;
  status: 'available' | 'in-use' | 'maintenance' | 'reserved';
  nextAvailable?: string;
}

interface AIRecommendation {
  id: string;
  type: 'room' | 'staff' | 'equipment' | 'schedule';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  savings?: string;
}

// Mock data
const roomUtilization: RoomUtilization[] = [
  { id: 'r1', name: 'Room 204', type: 'classroom', capacity: 30, currentUsage: 28, utilizationRate: 85, peakHours: '10:30 - 12:30', status: 'optimal' },
  { id: 'r2', name: 'Lab 3', type: 'lab', capacity: 24, currentUsage: 18, utilizationRate: 72, peakHours: '8:30 - 10:30', status: 'optimal' },
  { id: 'r3', name: 'Room 312', type: 'classroom', capacity: 28, currentUsage: 12, utilizationRate: 45, peakHours: '1:20 - 3:00', status: 'underutilized' },
  { id: 'r4', name: 'Makerspace', type: 'makerspace', capacity: 20, currentUsage: 22, utilizationRate: 95, peakHours: '10:30 - 3:00', status: 'overcrowded' },
  { id: 'r5', name: 'Great Hall', type: 'hall', capacity: 500, currentUsage: 120, utilizationRate: 35, peakHours: 'Assemblies', status: 'underutilized' },
  { id: 'r6', name: 'Library', type: 'library', capacity: 80, currentUsage: 55, utilizationRate: 68, peakHours: '11:30 - 2:00', status: 'optimal' },
  { id: 'r7', name: 'Gymnasium', type: 'gym', capacity: 200, currentUsage: 160, utilizationRate: 78, peakHours: '9:00 - 12:00', status: 'optimal' },
  { id: 'r8', name: 'Science Lab 1', type: 'lab', capacity: 24, currentUsage: 26, utilizationRate: 92, peakHours: '10:00 - 2:00', status: 'overcrowded' },
];

const staffAllocation: StaffAllocation[] = [
  { id: 's1', name: 'Ms. Johnson', department: 'Design & Tech', teachingLoad: 22, maxLoad: 25, reliefCount: 2, status: 'optimal' },
  { id: 's2', name: 'Mr. Smith', department: 'Mathematics', teachingLoad: 24, maxLoad: 25, reliefCount: 4, status: 'overloaded' },
  { id: 's3', name: 'Dr. Chen', department: 'Science', teachingLoad: 18, maxLoad: 25, reliefCount: 1, status: 'available' },
  { id: 's4', name: 'Ms. Wong', department: 'English', teachingLoad: 23, maxLoad: 25, reliefCount: 3, status: 'optimal' },
  { id: 's5', name: 'Mr. Torres', department: 'PDHPE', teachingLoad: 20, maxLoad: 25, reliefCount: 0, status: 'available' },
  { id: 's6', name: 'Ms. Park', department: 'Arts', teachingLoad: 25, maxLoad: 25, reliefCount: 5, status: 'overloaded' },
];

const demandForecast: DemandForecast[] = [
  { period: 'Week 5', rooms: 82, staff: 78, trend: 'up' },
  { period: 'Week 6', rooms: 85, staff: 80, trend: 'up' },
  { period: 'Week 7', rooms: 78, staff: 75, trend: 'down' },
  { period: 'Week 8', rooms: 88, staff: 85, trend: 'up' },
  { period: 'Week 9', rooms: 90, staff: 88, trend: 'up' },
  { period: 'Week 10', rooms: 75, staff: 72, trend: 'down' },
];

const scenarios: Scenario[] = [
  {
    id: 'sc1',
    name: 'Year 11 Camp Week',
    description: 'Simulate staff and room allocation during Year 11 outdoor education camp',
    impact: 'Frees up 6 rooms, requires 4 staff for supervision',
    status: 'ready',
    staffChange: -4,
    roomChange: +6,
  },
  {
    id: 'sc2',
    name: 'New Science Lab Opening',
    description: 'Model impact of opening the new science laboratory in Term 2',
    impact: 'Increases lab capacity by 24 students per period',
    status: 'analyzing',
    staffChange: +1,
    roomChange: +1,
  },
  {
    id: 'sc3',
    name: 'Staff PD Day Rotation',
    description: 'Evaluate rotating PD days to minimize relief requirements',
    impact: 'Could reduce relief costs by 15%',
    status: 'draft',
    staffChange: 0,
    roomChange: 0,
  },
];

const equipment: Equipment[] = [
  { id: 'e1', name: '3D Printers (Set of 4)', location: 'Makerspace', status: 'available' },
  { id: 'e2', name: 'Laptop Trolley A', location: 'Room 204', status: 'in-use', nextAvailable: '12:30 PM' },
  { id: 'e3', name: 'Science Equipment Kit', location: 'Lab 3', status: 'available' },
  { id: 'e4', name: 'Video Production Kit', location: 'Library', status: 'reserved', nextAvailable: 'Tomorrow' },
  { id: 'e5', name: 'Laptop Trolley B', location: 'Room 108', status: 'maintenance', nextAvailable: 'Friday' },
  { id: 'e6', name: 'Sports Equipment Set', location: 'Gym Store', status: 'in-use', nextAvailable: '3:05 PM' },
  { id: 'e7', name: 'Robotics Kits', location: 'Makerspace', status: 'available' },
  { id: 'e8', name: 'VR Headsets (Set of 10)', location: 'Innovation Lab', status: 'reserved', nextAvailable: 'Period 5' },
];

const aiRecommendations: AIRecommendation[] = [
  {
    id: 'ai1',
    type: 'room',
    title: 'Relocate Year 10 Design to Room 312',
    description: 'Room 312 is underutilized during periods 1-2. Moving Year 10 Design from Makerspace would reduce overcrowding.',
    impact: 'high',
    savings: 'Improves Makerspace utilization by 23%',
  },
  {
    id: 'ai2',
    type: 'staff',
    title: 'Redistribute relief duties',
    description: 'Mr. Smith and Ms. Park have high relief counts. Consider rotating with Dr. Chen and Mr. Torres who have capacity.',
    impact: 'medium',
    savings: 'Better work-life balance, reduced burnout risk',
  },
  {
    id: 'ai3',
    type: 'schedule',
    title: 'Consolidate Wednesday meetings',
    description: 'Multiple department meetings are scattered. Consolidating to one block would free up 4 periods for teaching.',
    impact: 'medium',
    savings: '4 additional teaching periods per week',
  },
  {
    id: 'ai4',
    type: 'equipment',
    title: 'Schedule laptop trolley maintenance',
    description: 'Laptop Trolley B has been in maintenance for 3 days. Expediting repair would increase equipment availability.',
    impact: 'low',
  },
];

function getUtilizationColor(rate: number) {
  if (rate >= 90) return 'bg-red-500';
  if (rate >= 70) return 'bg-green-500';
  if (rate >= 50) return 'bg-amber-500';
  return 'bg-gray-400';
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'optimal':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Optimal</Badge>;
    case 'underutilized':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Underutilized</Badge>;
    case 'overcrowded':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overcrowded</Badge>;
    case 'overloaded':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Overloaded</Badge>;
    case 'available':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Available</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getEquipmentStatusBadge(status: string) {
  switch (status) {
    case 'available':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle2 className="mr-1 h-3 w-3" />Available</Badge>;
    case 'in-use':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Clock className="mr-1 h-3 w-3" />In Use</Badge>;
    case 'maintenance':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"><Wrench className="mr-1 h-3 w-3" />Maintenance</Badge>;
    case 'reserved':
      return <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"><Calendar className="mr-1 h-3 w-3" />Reserved</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getImpactBadge(impact: string) {
  switch (impact) {
    case 'high':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">High Impact</Badge>;
    case 'medium':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Medium Impact</Badge>;
    case 'low':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Low Impact</Badge>;
    default:
      return <Badge variant="secondary">{impact}</Badge>;
  }
}

export default function CapacityDashboardPage() {
  const { user } = useAuthStore();
  const hasAccess = hasCapacityPlanningAccess(user);

  const [activeTab, setActiveTab] = useState('metrics');
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [scenarioDialogOpen, setScenarioDialogOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('week');

  const avgRoomUtilization = Math.round(
    roomUtilization.reduce((sum, r) => sum + r.utilizationRate, 0) / roomUtilization.length
  );

  const avgStaffLoad = Math.round(
    (staffAllocation.reduce((sum, s) => sum + s.teachingLoad, 0) /
      staffAllocation.reduce((sum, s) => sum + s.maxLoad, 0)) *
      100
  );

  const overcrowdedRooms = roomUtilization.filter((r) => r.status === 'overcrowded').length;
  const overloadedStaff = staffAllocation.filter((s) => s.status === 'overloaded').length;

  const handleScenarioClick = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setScenarioDialogOpen(true);
  };

  // Access denied view for unauthorized users
  if (!hasAccess) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
            <ShieldAlert className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2">Access Restricted</h1>
          <p className="text-muted-foreground max-w-md mb-6">
            The Capacity Dashboard is only available to administrators and teachers assigned to the
            &quot;Capacity Planner&quot; role or &quot;Capacity Planning&quot; group.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            If you believe you should have access to this tool, please contact your school administrator.
          </p>
          <Button asChild>
            <Link href="/teacher/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Capacity Dashboard"
        description="Monitor resource utilization and optimize allocation"
        actions={
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="term">This Term</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
            <Button variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Room Utilization"
          value={`${avgRoomUtilization}%`}
          icon={Building}
          variant={avgRoomUtilization >= 70 ? 'success' : 'warning'}
          change={3}
        />
        <StatsCard
          label="Staff Allocation"
          value={`${avgStaffLoad}%`}
          icon={Users}
          variant={avgStaffLoad <= 85 ? 'success' : 'warning'}
          change={-2}
        />
        <StatsCard
          label="Overcrowded Spaces"
          value={overcrowdedRooms}
          icon={AlertTriangle}
          variant={overcrowdedRooms === 0 ? 'success' : 'error'}
        />
        <StatsCard
          label="Overloaded Staff"
          value={overloadedStaff}
          icon={Users}
          variant={overloadedStaff === 0 ? 'success' : 'error'}
        />
      </div>

      {/* AI Recommendations Alert */}
      {aiRecommendations.filter((r) => r.impact === 'high').length > 0 && (
        <Card className="border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-violet-500/20 p-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-violet-800 dark:text-violet-200">
                  {aiRecommendations.filter((r) => r.impact === 'high').length} High-Impact AI Recommendations
                </p>
                <p className="text-sm text-violet-700 dark:text-violet-300 mt-1">
                  Review AI suggestions to optimize your resource allocation
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-violet-300 text-violet-700 hover:bg-violet-100"
                onClick={() => setActiveTab('recommendations')}
              >
                View Recommendations
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="metrics">
            <BarChart3 className="mr-2 h-4 w-4" />
            Metrics
          </TabsTrigger>
          <TabsTrigger value="projections">
            <TrendingUp className="mr-2 h-4 w-4" />
            Projections
          </TabsTrigger>
          <TabsTrigger value="scenarios">
            <Layers className="mr-2 h-4 w-4" />
            Scenarios
          </TabsTrigger>
          <TabsTrigger value="resources">
            <Package className="mr-2 h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="recommendations">
            <Sparkles className="mr-2 h-4 w-4" />
            AI Recommendations
          </TabsTrigger>
        </TabsList>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="mt-4 space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Room Utilization */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building className="h-5 w-5 text-muted-foreground" />
                      Room Utilization
                    </CardTitle>
                    <CardDescription>Current usage vs capacity</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Maximize className="mr-2 h-4 w-4" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {roomUtilization.slice(0, 5).map((room) => (
                  <div key={room.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{room.name}</span>
                        {getStatusBadge(room.status)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {room.currentUsage}/{room.capacity} ({room.utilizationRate}%)
                      </span>
                    </div>
                    <Progress
                      value={room.utilizationRate}
                      className="h-2"
                      indicatorClassName={getUtilizationColor(room.utilizationRate)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Staff Allocation */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      Staff Allocation
                    </CardTitle>
                    <CardDescription>Teaching load distribution</CardDescription>
                  </div>
                  <Button variant="outline" size="sm">
                    <Maximize className="mr-2 h-4 w-4" />
                    View All
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {staffAllocation.map((staff) => (
                  <div key={staff.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{staff.name}</span>
                        {getStatusBadge(staff.status)}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {staff.teachingLoad}/{staff.maxLoad} periods
                        {staff.reliefCount > 0 && ` (+${staff.reliefCount} relief)`}
                      </span>
                    </div>
                    <Progress
                      value={(staff.teachingLoad / staff.maxLoad) * 100}
                      className="h-2"
                      indicatorClassName={
                        staff.status === 'overloaded'
                          ? 'bg-red-500'
                          : staff.status === 'available'
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Utilization Summary by Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Utilization by Room Type</CardTitle>
              <CardDescription>Average utilization across different facility types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                {[
                  { type: 'Classrooms', rate: 78, icon: Monitor },
                  { type: 'Labs', rate: 82, icon: Monitor },
                  { type: 'Makerspace', rate: 95, icon: Wrench },
                  { type: 'Library', rate: 68, icon: Building },
                  { type: 'Gymnasium', rate: 78, icon: Building },
                  { type: 'Hall', rate: 35, icon: Building },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.type} className="text-center p-4 rounded-lg border">
                      <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                        item.rate >= 90 ? 'bg-red-100' : item.rate >= 70 ? 'bg-green-100' : 'bg-amber-100'
                      }`}>
                        <Icon className={`h-6 w-6 ${
                          item.rate >= 90 ? 'text-red-600' : item.rate >= 70 ? 'text-green-600' : 'text-amber-600'
                        }`} />
                      </div>
                      <p className="font-semibold text-lg">{item.rate}%</p>
                      <p className="text-xs text-muted-foreground">{item.type}</p>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projections Tab */}
        <TabsContent value="projections" className="mt-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                Demand Forecasting
              </CardTitle>
              <CardDescription>Projected resource utilization for upcoming weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {demandForecast.map((forecast) => (
                  <div key={forecast.period} className="flex items-center gap-4 p-4 rounded-lg border">
                    <div className="w-24">
                      <p className="font-medium">{forecast.period}</p>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Room Demand</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{forecast.rooms}%</span>
                            {forecast.trend === 'up' ? (
                              <ArrowUpRight className="h-4 w-4 text-red-500" />
                            ) : forecast.trend === 'down' ? (
                              <ArrowDownRight className="h-4 w-4 text-green-500" />
                            ) : null}
                          </div>
                        </div>
                        <Progress value={forecast.rooms} className="h-2" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Staff Demand</span>
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{forecast.staff}%</span>
                            {forecast.trend === 'up' ? (
                              <ArrowUpRight className="h-4 w-4 text-red-500" />
                            ) : forecast.trend === 'down' ? (
                              <ArrowDownRight className="h-4 w-4 text-green-500" />
                            ) : null}
                          </div>
                        </div>
                        <Progress value={forecast.staff} className="h-2" />
                      </div>
                    </div>
                    <Badge variant="outline" className={
                      forecast.trend === 'up' ? 'border-red-300 text-red-700' :
                      forecast.trend === 'down' ? 'border-green-300 text-green-700' :
                      'border-gray-300 text-gray-700'
                    }>
                      {forecast.trend === 'up' ? 'Increasing' : forecast.trend === 'down' ? 'Decreasing' : 'Stable'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Key Insights */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  Peak Demand Alerts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { week: 'Week 9', issue: 'Room demand exceeds 90%', action: 'Consider external venue hire' },
                  { week: 'Week 8', issue: 'Staff demand at 85%', action: 'Arrange relief coverage' },
                ].map((alert, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950 dark:border-amber-900">
                    <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">{alert.week}: {alert.issue}</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300">{alert.action}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-green-500" />
                  Optimization Opportunities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { week: 'Week 7', opportunity: 'Low demand period', action: 'Schedule maintenance and PD' },
                  { week: 'Week 10', opportunity: 'End of term flexibility', action: 'Plan enrichment activities' },
                ].map((opp, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-green-50 border border-green-200 dark:bg-green-950 dark:border-green-900">
                    <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">{opp.week}: {opp.opportunity}</p>
                      <p className="text-sm text-green-700 dark:text-green-300">{opp.action}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Scenarios Tab */}
        <TabsContent value="scenarios" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">What-If Scenarios</CardTitle>
                  <CardDescription>Model different situations and their impact on resources</CardDescription>
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  New Scenario
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {scenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => handleScenarioClick(scenario)}
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{scenario.name}</p>
                        <Badge variant="outline" className={
                          scenario.status === 'ready' ? 'border-green-300 text-green-700' :
                          scenario.status === 'analyzing' ? 'border-blue-300 text-blue-700' :
                          'border-gray-300 text-gray-700'
                        }>
                          {scenario.status === 'ready' ? <CheckCircle2 className="mr-1 h-3 w-3" /> :
                           scenario.status === 'analyzing' ? <RefreshCw className="mr-1 h-3 w-3 animate-spin" /> :
                           null}
                          {scenario.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{scenario.description}</p>
                      <p className="text-sm">{scenario.impact}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className={`text-lg font-bold ${scenario.staffChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {scenario.staffChange >= 0 ? '+' : ''}{scenario.staffChange}
                          </p>
                          <p className="text-xs text-muted-foreground">Staff</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-lg font-bold ${scenario.roomChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {scenario.roomChange >= 0 ? '+' : ''}{scenario.roomChange}
                          </p>
                          <p className="text-xs text-muted-foreground">Rooms</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        {scenario.status === 'draft' ? (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Run Analysis
                          </>
                        ) : (
                          'View Details'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Equipment & Facilities</CardTitle>
                  <CardDescription>Track shared resources and availability</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="all">
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="available">Available</SelectItem>
                      <SelectItem value="in-use">In Use</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {equipment.map((item) => (
                  <Card key={item.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="rounded-lg bg-muted p-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                        </div>
                        {getEquipmentStatusBadge(item.status)}
                      </div>
                      <p className="font-medium text-sm">{item.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {item.location}
                      </div>
                      {item.nextAvailable && item.status !== 'available' && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Available: {item.nextAvailable}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Equipment Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Available', count: equipment.filter((e) => e.status === 'available').length, color: 'green' },
              { label: 'In Use', count: equipment.filter((e) => e.status === 'in-use').length, color: 'blue' },
              { label: 'Reserved', count: equipment.filter((e) => e.status === 'reserved').length, color: 'purple' },
              { label: 'Maintenance', count: equipment.filter((e) => e.status === 'maintenance').length, color: 'amber' },
            ].map((stat) => (
              <Card key={stat.label}>
                <CardContent className="p-4 text-center">
                  <p className={`text-3xl font-bold text-${stat.color}-600`}>{stat.count}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AI Recommendations Tab */}
        <TabsContent value="recommendations" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500" />
                AI Optimization Recommendations
              </CardTitle>
              <CardDescription>
                Intelligent suggestions to improve resource allocation and efficiency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiRecommendations.map((rec) => (
                <div key={rec.id} className="p-4 rounded-lg border hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize">{rec.type}</Badge>
                        {getImpactBadge(rec.impact)}
                      </div>
                      <p className="font-semibold">{rec.title}</p>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      {rec.savings && (
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <TrendingUp className="h-4 w-4" />
                          {rec.savings}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 ml-4">
                      <Button size="sm">Apply</Button>
                      <Button variant="outline" size="sm">Dismiss</Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Scenario Detail Dialog */}
      <Dialog open={scenarioDialogOpen} onOpenChange={setScenarioDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedScenario?.name}</DialogTitle>
            <DialogDescription>{selectedScenario?.description}</DialogDescription>
          </DialogHeader>

          {selectedScenario && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className={`text-2xl font-bold ${selectedScenario.staffChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedScenario.staffChange >= 0 ? '+' : ''}{selectedScenario.staffChange}
                  </p>
                  <p className="text-sm text-muted-foreground">Staff Impact</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className={`text-2xl font-bold ${selectedScenario.roomChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedScenario.roomChange >= 0 ? '+' : ''}{selectedScenario.roomChange}
                  </p>
                  <p className="text-sm text-muted-foreground">Room Impact</p>
                </div>
              </div>

              <div className="p-4 rounded-lg border">
                <p className="font-medium mb-2">Impact Summary</p>
                <p className="text-sm text-muted-foreground">{selectedScenario.impact}</p>
              </div>

              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-900">
                <div className="flex items-start gap-2">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800 dark:text-blue-200">Simulation Note</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This scenario can be run to see detailed period-by-period impact analysis.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setScenarioDialogOpen(false)}>
              Close
            </Button>
            {selectedScenario?.status === 'draft' && (
              <Button>
                <Play className="mr-2 h-4 w-4" />
                Run Simulation
              </Button>
            )}
            {selectedScenario?.status === 'ready' && (
              <Button>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Apply Scenario
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
