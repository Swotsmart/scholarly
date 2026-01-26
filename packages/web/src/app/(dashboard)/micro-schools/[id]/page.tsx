'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  MapPin,
  Users,
  GraduationCap,
  Star,
  Calendar,
  DollarSign,
  ArrowLeft,
  Library,
  FlaskConical,
  Hammer,
  TreePine,
  Monitor,
  Sprout,
} from 'lucide-react';
import { microSchools } from '@/lib/micro-schools-api';

const facilityIcons: Record<string, React.ElementType> = {
  Library: Library,
  'Science Lab': FlaskConical,
  'Maker Space': Hammer,
  'Outdoor Learning Area': TreePine,
  'Outdoor Classroom': TreePine,
  'Computer Lab': Monitor,
  Garden: Sprout,
  'Organic Garden': Sprout,
  'Art Studio': Hammer,
  'Music Room': Library,
  'Bush Classroom': TreePine,
  'Fire Circle': TreePine,
  'Tool Workshop': Hammer,
  'Bush Kitchen': Sprout,
  'Creek Study Area': TreePine,
  Yurt: TreePine,
  Theatre: Library,
  'Recording Studio': Monitor,
  'Dance Studio': Library,
  'Digital Media Lab': Monitor,
  'Gallery Space': Library,
  'Montessori Classroom': Library,
};

const stats = [
  { label: 'Students', value: '35', icon: Users },
  { label: 'Teachers', value: '6', icon: GraduationCap },
  { label: 'Student:Teacher Ratio', value: '6:1', icon: Users },
  { label: 'Satisfaction', value: '4.8/5', icon: Star },
];

export default function MicroSchoolDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const school = microSchools.find((s) => s.id === params.id) || microSchools[0];

  const schoolStats = [
    { label: 'Students', value: String(school.studentCount), icon: Users },
    { label: 'Teachers', value: String(school.teacherCount), icon: GraduationCap },
    {
      label: 'Student:Teacher Ratio',
      value: `${Math.round(school.studentCount / school.teacherCount)}:1`,
      icon: Users,
    },
    { label: 'Satisfaction', value: `${school.satisfaction}/5`, icon: Star },
  ];

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" asChild>
        <Link href="/micro-schools">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Micro-Schools
        </Link>
      </Button>

      {/* Hero Section */}
      <div className="space-y-2">
        <h1 className="heading-2">{school.name}</h1>
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>{school.location}, {school.state}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {school.focusAreas.map((area) => (
            <Badge key={area} variant="secondary">
              {area}
            </Badge>
          ))}
        </div>
      </div>

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{school.description}</p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Founded:</span>{' '}
              <span className="font-medium">{school.foundingYear}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Accreditation:</span>{' '}
              <span className="font-medium">{school.accreditation}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {schoolStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Curriculum Section */}
      <div>
        <h2 className="heading-3 mb-4">Curriculum Focus Areas</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {school.curriculum.map((item) => (
            <Card key={item.area}>
              <CardHeader>
                <CardTitle className="text-base">{item.area}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Facilities */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Facilities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {school.facilities.map((facility) => {
              const FacilityIcon = facilityIcons[facility] || Library;
              return (
                <div
                  key={facility}
                  className="flex items-center gap-3 rounded-lg border p-3"
                >
                  <div className="rounded-md bg-primary/10 p-2">
                    <FacilityIcon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{facility}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Teacher Profiles */}
      <div>
        <h2 className="heading-3 mb-4">Teacher Profiles</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {school.teachers.map((teacher) => (
            <Card key={teacher.id}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-2xl">
                  {teacher.avatar}
                </div>
                <div>
                  <p className="font-semibold">{teacher.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {teacher.specialization}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {teacher.yearsExperience} years experience
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Enrollment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Enrollment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Application Status</p>
              <Badge
                className={
                  school.status === 'accepting'
                    ? 'bg-green-500/10 text-green-600'
                    : school.status === 'waitlisted'
                    ? 'bg-amber-500/10 text-amber-600'
                    : 'bg-red-500/10 text-red-600'
                }
              >
                {school.status === 'accepting'
                  ? 'Accepting Applications'
                  : school.status === 'waitlisted'
                  ? 'Waitlisted'
                  : 'Full'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Annual Fees</p>
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{school.fees}</p>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Next Intake</p>
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="font-medium">{school.nextIntake}</p>
              </div>
            </div>
          </div>
          <Button size="lg" asChild>
            <Link href="/micro-schools/applications">
              Apply Now
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
