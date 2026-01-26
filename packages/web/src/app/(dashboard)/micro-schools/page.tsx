'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Search,
  MapPin,
  Users,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react';
import { microSchools } from '@/lib/micro-schools-api';

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  accepting: { label: 'Accepting Applications', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600' },
  waitlisted: { label: 'Waitlisted', icon: Clock, className: 'bg-amber-500/10 text-amber-600' },
  full: { label: 'Full', icon: XCircle, className: 'bg-red-500/10 text-red-600' },
};

export default function MicroSchoolsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('all');
  const [focusFilter, setFocusFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');

  const filteredSchools = microSchools.filter((school) => {
    const matchesSearch =
      searchQuery === '' ||
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation =
      locationFilter === 'all' ||
      school.location.toLowerCase() === locationFilter.toLowerCase();

    const matchesFocus =
      focusFilter === 'all' ||
      school.focusArea.toLowerCase() === focusFilter.toLowerCase();

    const matchesSize =
      sizeFilter === 'all' ||
      (sizeFilter === 'under20' && school.studentCount < 20) ||
      (sizeFilter === '20-50' && school.studentCount >= 20 && school.studentCount <= 50) ||
      (sizeFilter === '50plus' && school.studentCount > 50);

    return matchesSearch && matchesLocation && matchesFocus && matchesSize;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Micro-Schools</h1>
          <p className="text-muted-foreground">
            Discover small, innovative learning communities
          </p>
        </div>
        <Button asChild>
          <Link href="/micro-schools/applications">
            My Applications
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-4 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search micro-schools..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              <SelectItem value="sydney">Sydney</SelectItem>
              <SelectItem value="melbourne">Melbourne</SelectItem>
              <SelectItem value="brisbane">Brisbane</SelectItem>
              <SelectItem value="perth">Perth</SelectItem>
            </SelectContent>
          </Select>
          <Select value={focusFilter} onValueChange={setFocusFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Focus Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Focus Areas</SelectItem>
              <SelectItem value="stem">STEM</SelectItem>
              <SelectItem value="arts">Arts</SelectItem>
              <SelectItem value="montessori">Montessori</SelectItem>
              <SelectItem value="outdoor">Outdoor</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sizeFilter} onValueChange={setSizeFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sizes</SelectItem>
              <SelectItem value="under20">&lt; 20</SelectItem>
              <SelectItem value="20-50">20 - 50</SelectItem>
              <SelectItem value="50plus">50+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* School Listing */}
      <div className="grid gap-6 lg:grid-cols-2">
        {filteredSchools.map((school) => {
          const statusInfo = statusConfig[school.status];
          const StatusIcon = statusInfo.icon;
          return (
            <Card key={school.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{school.name}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {school.location}, {school.state}
                    </CardDescription>
                  </div>
                  <Badge className={statusInfo.className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {statusInfo.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {school.description}
                  </p>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    {school.studentCount} students
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {school.focusAreas.map((area) => (
                    <Badge key={area} variant="secondary">
                      {area}
                    </Badge>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/micro-schools/${school.id}`}>
                      View Details
                    </Link>
                  </Button>
                  {school.status === 'accepting' && (
                    <Button className="flex-1" asChild>
                      <Link href={`/micro-schools/applications`}>
                        Apply
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredSchools.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50" />
          <h3 className="mt-4 text-lg font-semibold">No schools found</h3>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
}
