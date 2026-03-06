'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, MessageSquare, Calendar, MapPin, Loader2 } from 'lucide-react';
import { useHomeschool } from '@/hooks/use-homeschool';

const FALLBACK_CONNECTIONS = [
  { id: '1', name: 'The Johnson Family', location: 'Nearby', children: 3, shared: ['Math', 'Science'] },
  { id: '2', name: 'Smith Homeschool', location: '5km away', children: 2, shared: ['Art', 'Music'] },
  { id: '3', name: 'Garcia Learning Pod', location: '3km away', children: 4, shared: ['PE', 'Languages'] },
];

const FALLBACK_PENDING = [
  { id: '1', name: 'The Williams Family', message: 'Would love to connect for science activities!' },
];

export default function MyConnectionsPage() {
  const { coops, matches, isLoading } = useHomeschool();

  // Derive connections from co-ops member data when available
  const connections = coops?.items?.length
    ? coops.items.map((coop) => ({
        id: coop.id,
        name: coop.name,
        location: coop.primaryLocation?.label ?? 'Local',
        children: coop._count?.members ?? 0,
        shared: coop.subjects.slice(0, 3),
      }))
    : FALLBACK_CONNECTIONS;

  // Use family matches as pending requests when available
  const pendingRequests = matches?.length
    ? matches.map((m) => ({
        id: m.familyId,
        name: m.familyName,
        message: m.matchReasons.join(', '),
      }))
    : FALLBACK_PENDING;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Connections</h1>
        <p className="text-muted-foreground">Families you&apos;re connected with for co-op learning</p>
      </div>

      {pendingRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950">
          <CardHeader>
            <CardTitle className="text-orange-700 dark:text-orange-300">
              Pending Requests ({pendingRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingRequests.map((request) => (
              <div key={request.id} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarFallback>{request.name[4]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{request.name}</p>
                    <p className="text-sm text-muted-foreground">{request.message}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => alert('Connection request declined.')}>Decline</Button>
                  <Button size="sm" onClick={() => alert('Connection request accepted!')}>Accept</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {connections.map((connection) => (
          <Card key={connection.id}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {connection.name[4]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{connection.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {connection.location}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{connection.children} children</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">Shared subjects:</p>
                <div className="flex flex-wrap gap-1">
                  {connection.shared.map((subject) => (
                    <span key={subject} className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Button>
                <Button size="sm" className="flex-1">
                  <Calendar className="mr-2 h-4 w-4" />
                  Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
