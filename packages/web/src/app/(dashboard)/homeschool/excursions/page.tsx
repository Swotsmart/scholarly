'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader, StatsCard } from '@/components/shared';
import {
  MapPin, Calendar, Clock, Users, Bus, BookOpen, CheckCircle2,
  ArrowRight, Plus, Globe, Phone, Brain, Shield, Wifi, WifiOff,
} from 'lucide-react';
import { homeschoolApi } from '@/lib/homeschool-api';
import type { Excursion } from '@/types/homeschool';

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: 'bg-gray-500/10', text: 'text-gray-600', label: 'Draft' },
  open: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Open' },
  full: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Full' },
  confirmed: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Confirmed' },
  completed: { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Completed' },
  cancelled: { bg: 'bg-red-500/10', text: 'text-red-600', label: 'Cancelled' },
};

export default function ExcursionsPage() {
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState('upcoming');
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setIsLoading(true);
    // Fetch all excursions (not filtered by tab) so stats are always correct
    homeschoolApi.getExcursions({})
      .then((data) => setExcursions(data.excursions))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [tab]);

  const upcoming = excursions.filter(e => new Date(e.date) >= new Date());
  const past = excursions.filter(e => new Date(e.date) < new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Excursions & Field Trips"
        description="Manage learning excursions for your homeschool family"
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isOnline ? 'text-green-600' : 'text-amber-600'}>
              {isOnline ? <Wifi className="mr-1 h-3 w-3" /> : <WifiOff className="mr-1 h-3 w-3" />}
              {isOnline ? 'Online' : 'Offline Mode'}
            </Badge>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Plan Excursion
            </Button>
          </div>
        }
      />

      {/* AI Insight */}
      <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Brain className="h-5 w-5 text-purple-500 shrink-0" />
            <p className="text-sm text-muted-foreground">
              Based on your curriculum coverage, consider excursions to science museums or botanical gardens to strengthen ACARA Science standards for Years 5-7.
            </p>
            <Badge variant="outline" className="text-xs shrink-0">
              <Shield className="h-2.5 w-2.5 mr-1" />AI
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard label="Upcoming" value={upcoming.length} icon={Calendar} variant="primary" />
        <StatsCard label="Completed" value={past.length} icon={CheckCircle2} variant="success" />
        <StatsCard label="Curriculum Links" value={excursions.reduce((sum, e) => sum + e.curriculumConnections.length, 0)} icon={BookOpen} variant="warning" />
        <StatsCard label="Total Participants" value={excursions.reduce((sum, e) => sum + (e._count?.registrations ?? 0), 0)} icon={Users} variant="primary" />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-lg" />)
          ) : upcoming.length > 0 ? (
            upcoming.map((excursion) => (
              <ExcursionCard key={excursion.id} excursion={excursion} />
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <MapPin className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold mb-2">No Upcoming Excursions</h3>
                <p className="text-sm text-muted-foreground mb-4">Plan a learning excursion for your family or join a co-op excursion.</p>
                <Button><Plus className="mr-2 h-4 w-4" />Plan Excursion</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="past" className="mt-6 space-y-4">
          {isLoading ? (
            [1, 2, 3].map(i => <Skeleton key={i} className="h-40 w-full rounded-lg" />)
          ) : past.length > 0 ? (
            past.map((excursion) => (
              <ExcursionCard key={excursion.id} excursion={excursion} />
            ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">No past excursions.</CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExcursionCard({ excursion }: { excursion: Excursion }) {
  const style = statusStyles[excursion.status] ?? statusStyles.draft;
  const dateStr = new Date(excursion.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const spotsLeft = excursion.maxParticipants - (excursion._count?.registrations ?? 0);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">{excursion.title}</h3>
              <Badge className={`${style.bg} ${style.text}`}>{style.label}</Badge>
              {excursion.coop && <Badge variant="outline" className="text-xs">Co-op: {excursion.coop.name}</Badge>}
            </div>

            <p className="text-sm text-muted-foreground">{excursion.description}</p>

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Calendar className="h-4 w-4" />{dateStr}</span>
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{excursion.startTime} - {excursion.endTime}</span>
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{excursion.venue.name}</span>
              <span className="flex items-center gap-1"><Bus className="h-4 w-4" />{excursion.transportation}</span>
            </div>

            <div className="flex items-center gap-1 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{excursion._count?.registrations ?? 0}/{excursion.maxParticipants} participants</span>
              {spotsLeft > 0 && excursion.status === 'open' && (
                <Badge variant="secondary" className="ml-2 text-xs">{spotsLeft} spots left</Badge>
              )}
            </div>

            {/* Curriculum connections */}
            {excursion.curriculumConnections.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground flex items-center gap-1"><BookOpen className="h-3 w-3" />Curriculum:</span>
                {excursion.curriculumConnections.map((conn, i) => (
                  <Badge key={i} variant="outline" className="text-xs">{conn.subject} - {conn.curriculumCode}</Badge>
                ))}
              </div>
            )}

            {/* Venue details */}
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {excursion.venue.website && (
                <a href={excursion.venue.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary">
                  <Globe className="h-3 w-3" />Website
                </a>
              )}
              {excursion.venue.contactPhone && (
                <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{excursion.venue.contactPhone}</span>
              )}
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{excursion.venue.address}</span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {excursion.status === 'open' && (
              <Button size="sm">Register<ArrowRight className="ml-1 h-4 w-4" /></Button>
            )}
            <Button size="sm" variant="outline">Details</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
