'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
  Brain,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Risk Distribution Data
const riskDistribution = [
  { name: 'High Risk', value: 8, color: '#ef4444' },
  { name: 'Medium Risk', value: 15, color: '#f59e0b' },
  { name: 'Low Risk', value: 45, color: '#22c55e' },
];

const atRiskStudents = [
  { id: 'r1', name: 'Tyler Morrison', riskLevel: 'high' as const, confidence: 92, factors: 'Low attendance, declining grades, disengagement', action: 'Schedule parent-teacher conference' },
  { id: 'r2', name: 'Bella Thompson', riskLevel: 'high' as const, confidence: 87, factors: 'Missing assignments, social withdrawal', action: 'Refer to student wellbeing team' },
  { id: 'r3', name: 'Jake Reynolds', riskLevel: 'medium' as const, confidence: 74, factors: 'Inconsistent performance, late submissions', action: 'Assign peer mentor' },
  { id: 'r4', name: 'Sophie Walsh', riskLevel: 'medium' as const, confidence: 68, factors: 'Reduced participation, missed deadlines', action: 'One-on-one check-in meeting' },
  { id: 'r5', name: 'Ethan Clarke', riskLevel: 'low' as const, confidence: 95, factors: 'Slight attendance dip, maintained grades', action: 'Continue monitoring' },
];

// Engagement Data
const engagementTrend = [
  { day: 'Mon', score: 78 },
  { day: 'Tue', score: 82 },
  { day: 'Wed', score: 75 },
  { day: 'Thu', score: 88 },
  { day: 'Fri', score: 71 },
  { day: 'Sat', score: 45 },
  { day: 'Sun', score: 52 },
];

const lowEngagementStudents = [
  { id: 'e1', name: 'Mia Patterson', score: 34, lastActive: '3 days ago', trend: 'declining' as const },
  { id: 'e2', name: 'Noah Henderson', score: 42, lastActive: '2 days ago', trend: 'declining' as const },
  { id: 'e3', name: 'Chloe Murray', score: 48, lastActive: '1 day ago', trend: 'stable' as const },
  { id: 'e4', name: 'Liam Foster', score: 39, lastActive: '4 days ago', trend: 'declining' as const },
];

// Performance Data
const performanceDistribution = [
  { grade: 'A+', count: 5 },
  { grade: 'A', count: 8 },
  { grade: 'A-', count: 7 },
  { grade: 'B+', count: 12 },
  { grade: 'B', count: 10 },
  { grade: 'B-', count: 8 },
  { grade: 'C+', count: 6 },
  { grade: 'C', count: 4 },
  { grade: 'D', count: 3 },
  { grade: 'F', count: 1 },
];

const performancePredictions = [
  { id: 'p1', name: 'Charlotte Webb', predictedGrade: 'A', confidence: 88, currentGrade: 'A-' },
  { id: 'p2', name: 'Oliver Bennett', predictedGrade: 'B+', confidence: 82, currentGrade: 'B' },
  { id: 'p3', name: 'Amelia Stewart', predictedGrade: 'C', confidence: 71, currentGrade: 'C+' },
  { id: 'p4', name: 'Jack Nguyen', predictedGrade: 'B', confidence: 79, currentGrade: 'B-' },
  { id: 'p5', name: 'Isla Campbell', predictedGrade: 'A-', confidence: 85, currentGrade: 'B+' },
];

const riskLevelConfig = {
  high: { label: 'High Risk', className: 'bg-red-500/10 text-red-700 border-red-200' },
  medium: { label: 'Medium Risk', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  low: { label: 'Low Risk', className: 'bg-green-500/10 text-green-700 border-green-200' },
};

export default function PredictionsDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Predictions Dashboard</h1>
          <p className="text-muted-foreground">
            ML-powered insights for student outcomes and engagement
          </p>
        </div>
        <Button variant="outline">
          <Brain className="mr-2 h-4 w-4" />
          Refresh Predictions
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="risk" className="space-y-6">
        <TabsList>
          <TabsTrigger value="risk" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Student Risk
          </TabsTrigger>
          <TabsTrigger value="engagement" className="gap-2">
            <Activity className="h-4 w-4" />
            Engagement
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Performance
          </TabsTrigger>
        </TabsList>

        {/* Student Risk Tab */}
        <TabsContent value="risk" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Risk Distribution Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Distribution</CardTitle>
                <CardDescription>Student risk level breakdown across cohort</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {riskDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Risk Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Summary</CardTitle>
                <CardDescription>Overview of identified risk factors</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {riskDistribution.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-4 w-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold">{item.value}</span>
                      <span className="text-sm text-muted-foreground">students</span>
                    </div>
                  </div>
                ))}
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <p className="text-sm text-muted-foreground">Total students analysed</p>
                  <p className="text-3xl font-bold">{riskDistribution.reduce((a, b) => a + b.value, 0)}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* At-Risk Students Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                At-Risk Students
              </CardTitle>
              <CardDescription>Students flagged by the risk prediction model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Student</th>
                      <th className="pb-3 pr-4 font-medium">Risk Level</th>
                      <th className="pb-3 pr-4 font-medium text-center">Confidence</th>
                      <th className="pb-3 pr-4 font-medium">Contributing Factors</th>
                      <th className="pb-3 font-medium">Recommended Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {atRiskStudents.map((student) => {
                      const config = riskLevelConfig[student.riskLevel];
                      return (
                        <tr key={student.id} className="text-sm">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">{student.name}</p>
                            </div>
                          </td>
                          <td className="py-4 pr-4">
                            <Badge className={config.className}>
                              {config.label}
                            </Badge>
                          </td>
                          <td className="py-4 pr-4 text-center">
                            <span className="font-bold">{student.confidence}%</span>
                          </td>
                          <td className="py-4 pr-4">
                            <p className="text-muted-foreground">{student.factors}</p>
                          </td>
                          <td className="py-4">
                            <p className="font-medium text-primary">{student.action}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Engagement Tab */}
        <TabsContent value="engagement" className="space-y-6">
          {/* Engagement Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Engagement Trend (Past 7 Days)</CardTitle>
              <CardDescription>Average daily engagement score across all students</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis domain={[0, 100]} className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Engagement Score"
                      stroke="hsl(220 70% 50%)"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(220 70% 50%)', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Low Engagement Students */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5" />
                Low Engagement Students
              </CardTitle>
              <CardDescription>Students with engagement scores below 50%</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {lowEngagementStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <Users className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Last active: {student.lastActive}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Engagement Score</p>
                        <p className="text-lg font-bold text-red-600">{student.score}%</p>
                      </div>
                      <Badge className={
                        student.trend === 'declining'
                          ? 'bg-red-500/10 text-red-700 border-red-200'
                          : 'bg-yellow-500/10 text-yellow-700 border-yellow-200'
                      }>
                        {student.trend === 'declining' ? (
                          <TrendingDown className="mr-1 h-3 w-3" />
                        ) : (
                          <Activity className="mr-1 h-3 w-3" />
                        )}
                        {student.trend === 'declining' ? 'Declining' : 'Stable'}
                      </Badge>
                      <Button size="sm">Intervene</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          {/* Performance Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Predicted Grade Distribution</CardTitle>
              <CardDescription>ML-predicted grade distribution for current cohort</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
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
                    <Bar
                      dataKey="count"
                      name="Students"
                      fill="hsl(220 70% 50%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Performance Predictions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Predictions
              </CardTitle>
              <CardDescription>Individual student grade predictions with confidence levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-left text-sm text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Student</th>
                      <th className="pb-3 pr-4 font-medium text-center">Predicted Grade</th>
                      <th className="pb-3 pr-4 font-medium text-center">Confidence</th>
                      <th className="pb-3 pr-4 font-medium text-center">Current Grade</th>
                      <th className="pb-3 font-medium text-center">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {performancePredictions.map((prediction) => {
                      const isImproving = prediction.predictedGrade <= prediction.currentGrade;
                      return (
                        <tr key={prediction.id} className="text-sm">
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <p className="font-medium">{prediction.name}</p>
                            </div>
                          </td>
                          <td className="py-4 pr-4 text-center">
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-lg font-bold px-3">
                              {prediction.predictedGrade}
                            </Badge>
                          </td>
                          <td className="py-4 pr-4 text-center">
                            <span className={`font-bold ${
                              prediction.confidence >= 85 ? 'text-green-600' :
                              prediction.confidence >= 75 ? 'text-yellow-600' : 'text-orange-600'
                            }`}>
                              {prediction.confidence}%
                            </span>
                          </td>
                          <td className="py-4 pr-4 text-center">
                            <span className="font-medium">{prediction.currentGrade}</span>
                          </td>
                          <td className="py-4 text-center">
                            {isImproving ? (
                              <Badge className="bg-green-500/10 text-green-700 border-green-200">
                                <TrendingUp className="mr-1 h-3 w-3" />
                                Improving
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/10 text-red-700 border-red-200">
                                <TrendingDown className="mr-1 h-3 w-3" />
                                Declining
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
