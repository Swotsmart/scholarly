'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { HelpCircle, Clock, CheckCircle, AlertTriangle, MessageSquare } from 'lucide-react';

export default function TeacherHelpRequestsPage() {
  const requests = [
    { id: 1, student: 'Emma Thompson', subject: 'Mathematics', topic: 'Quadratic equations', time: '15 min ago', priority: 'high' },
    { id: 2, student: 'Liam Chen', subject: 'Science', topic: 'Lab report structure', time: '1 hour ago', priority: 'medium' },
    { id: 3, student: 'Sophie Williams', subject: 'English', topic: 'Essay thesis help', time: '2 hours ago', priority: 'low' },
    { id: 4, student: 'James Brown', subject: 'History', topic: 'Research sources', time: '3 hours ago', priority: 'medium' },
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-500 bg-red-500/10';
      case 'medium': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-blue-500 bg-blue-500/10';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help Requests</h1>
          <p className="text-muted-foreground">Students requesting your assistance</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">1</p>
                <p className="text-sm text-muted-foreground">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">4</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Resolved Today</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active Requests</CardTitle>
          <CardDescription>Help students with their questions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="flex items-start justify-between p-4 rounded-lg border">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>{request.student.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{request.student}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs capitalize ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{request.subject}: {request.topic}</p>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {request.time}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Chat
                  </Button>
                  <Button size="sm">Respond</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
