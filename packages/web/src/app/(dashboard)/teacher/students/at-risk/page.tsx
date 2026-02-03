'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, TrendingDown, Clock, MessageSquare, FileText } from 'lucide-react';

export default function AtRiskStudentsPage() {
  const students = [
    {
      id: 1,
      name: 'James Chen',
      grade: 'Year 10',
      risk: 'high',
      indicators: ['Missed 3 assignments', 'Declining grades', 'Reduced attendance'],
      lastContact: '5 days ago'
    },
    {
      id: 2,
      name: 'Sarah Williams',
      grade: 'Year 9',
      risk: 'medium',
      indicators: ['Struggling with math concepts', 'Below average test scores'],
      lastContact: '2 days ago'
    },
    {
      id: 3,
      name: 'Michael Brown',
      grade: 'Year 11',
      risk: 'medium',
      indicators: ['Disengaged in class', 'Late submissions'],
      lastContact: '1 week ago'
    },
  ];

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'high': return 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950';
      case 'medium': return 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950';
      default: return 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">At-Risk Students</h1>
        <p className="text-muted-foreground">Students who may need additional support</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-700 dark:text-red-300">1</p>
                <p className="text-sm text-red-600 dark:text-red-400">High Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">2</p>
                <p className="text-sm text-orange-600 dark:text-orange-400">Medium Risk</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">3</p>
                <p className="text-sm text-muted-foreground">Need Follow-up</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {students.map((student) => (
          <Card key={student.id} className={getRiskColor(student.risk)}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{student.name}</p>
                      <span className="text-sm text-muted-foreground">{student.grade}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${
                        student.risk === 'high'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                      }`}>
                        {student.risk} risk
                      </span>
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium mb-1">Risk Indicators:</p>
                      <ul className="text-sm text-muted-foreground space-y-0.5">
                        {student.indicators.map((indicator, i) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            {indicator}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Last contact: {student.lastContact}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Button size="sm">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Contact
                  </Button>
                  <Button variant="outline" size="sm">
                    <FileText className="mr-2 h-4 w-4" />
                    View Profile
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
