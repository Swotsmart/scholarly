'use client';

import { use } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  MapPin,
  Users,
  GraduationCap,
  Star,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  ArrowLeft,
  Heart,
  Share2,
  Phone,
  Mail,
  Globe,
  Building,
  BookOpen,
  Leaf,
  Paintbrush,
  Music,
  Laptop,
  ChevronRight,
  Info,
  FileText,
  ImageIcon,
} from 'lucide-react';
import { microSchools } from '@/lib/micro-schools-api';

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  accepting: { label: 'Accepting Applications', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600 border-green-500/30' },
  waitlisted: { label: 'Waitlist Only', icon: Clock, className: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  full: { label: 'Currently Full', icon: XCircle, className: 'bg-red-500/10 text-red-600 border-red-500/30' },
};

// Facility icons mapping
const facilityIcons: Record<string, React.ElementType> = {
  Library: BookOpen,
  'Science Lab': Laptop,
  'Maker Space': Laptop,
  'Outdoor Learning Area': Leaf,
  'Computer Lab': Laptop,
  Garden: Leaf,
  'Montessori Classroom': Building,
  'Art Studio': Paintbrush,
  'Music Room': Music,
  'Organic Garden': Leaf,
  'Bush Classroom': Leaf,
  'Outdoor Classroom': Leaf,
  'Fire Circle': Leaf,
  'Tool Workshop': Building,
  'Bush Kitchen': Building,
  'Creek Study Area': Leaf,
  Yurt: Building,
  Theatre: Music,
  'Recording Studio': Music,
  'Dance Studio': Music,
  'Digital Media Lab': Laptop,
  'Gallery Space': Paintbrush,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MicroSchoolDetailPage({ params }: PageProps) {
  const { id } = use(params);

  // Find the school by ID
  const school = microSchools.find((s) => s.id === id);

  if (!school) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building className="h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 text-lg font-semibold">School not found</h3>
        <p className="text-sm text-muted-foreground">
          The micro-school you&apos;re looking for doesn&apos;t exist
        </p>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/micro-schools">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Micro-Schools
          </Link>
        </Button>
      </div>
    );
  }

  const statusInfo = statusConfig[school.status];
  const StatusIcon = statusInfo.icon;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/micro-schools">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Micro-Schools
        </Link>
      </Button>

      {/* Hero Section */}
      <Card className="overflow-hidden">
        <div className="relative h-48 bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600">
          <div className="absolute inset-0 bg-black/20" />
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div className="flex items-end gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-white shadow-lg">
                <Building className="h-10 w-10 text-primary" />
              </div>
              <div className="pb-1">
                <h1 className="text-2xl font-bold text-white">{school.name}</h1>
                <div className="flex items-center gap-3 text-white/90">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {school.location}, {school.state}
                  </span>
                  <span className="text-white/50">|</span>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {school.studentCount} students
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm">
                <Heart className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="secondary" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center gap-4">
            <Badge className={statusInfo.className} variant="outline">
              <StatusIcon className="mr-1 h-3 w-3" />
              {statusInfo.label}
            </Badge>
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
              <span className="font-semibold">{school.satisfaction}</span>
              <span className="text-muted-foreground text-sm">satisfaction</span>
            </div>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Est. {school.foundingYear}
            </div>
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <GraduationCap className="h-4 w-4" />
              {school.teacherCount} teachers
            </div>
            <span className="text-muted-foreground">|</span>
            <Badge variant="secondary">{school.accreditation}</Badge>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {school.focusAreas.map((area) => (
              <Badge key={area} variant="outline">
                {area}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">
            <Info className="mr-2 h-4 w-4" />
            About
          </TabsTrigger>
          <TabsTrigger value="facilities">
            <Building className="mr-2 h-4 w-4" />
            Facilities
          </TabsTrigger>
          <TabsTrigger value="teachers">
            <GraduationCap className="mr-2 h-4 w-4" />
            Teachers
          </TabsTrigger>
          <TabsTrigger value="enrollment">
            <FileText className="mr-2 h-4 w-4" />
            Enrollment
          </TabsTrigger>
        </TabsList>

        {/* About Tab */}
        <TabsContent value="about" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <Card>
                <CardHeader>
                  <CardTitle>About {school.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">{school.description}</p>
                </CardContent>
              </Card>

              {/* Curriculum Approach */}
              <Card>
                <CardHeader>
                  <CardTitle>Curriculum Approach</CardTitle>
                  <CardDescription>Our educational philosophy and teaching methods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {school.curriculum.map((item) => (
                    <div key={item.area} className="rounded-lg border p-4">
                      <h4 className="font-semibold">{item.area}</h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Philosophy */}
              <Card>
                <CardHeader>
                  <CardTitle>Educational Philosophy</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="font-semibold text-sm mb-2">Learning Environment</h4>
                      <p className="text-sm text-muted-foreground">
                        Small class sizes with personalized attention. Student-teacher ratio of{' '}
                        {Math.round(school.studentCount / school.teacherCount)}:1
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="font-semibold text-sm mb-2">Focus Areas</h4>
                      <p className="text-sm text-muted-foreground">
                        Specializing in {school.focusAreas.join(', ')}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="font-semibold text-sm mb-2">Accreditation</h4>
                      <p className="text-sm text-muted-foreground">
                        {school.accreditation} - Meeting all state and national standards
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-4">
                      <h4 className="font-semibold text-sm mb-2">Community</h4>
                      <p className="text-sm text-muted-foreground">
                        Founded in {school.foundingYear} with a focus on collaborative learning
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  {school.status === 'accepting' ? (
                    <Button className="w-full" size="lg">
                      Apply Now
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : school.status === 'waitlisted' ? (
                    <Button className="w-full" size="lg">
                      Join Waitlist
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button className="w-full" size="lg" disabled>
                      Currently Full
                    </Button>
                  )}
                  <Button variant="outline" className="w-full">
                    <Calendar className="mr-2 h-4 w-4" />
                    Schedule Visit
                  </Button>
                  <Button variant="outline" className="w-full">
                    <Mail className="mr-2 h-4 w-4" />
                    Contact School
                  </Button>
                </CardContent>
              </Card>

              {/* Quick Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Next Intake</span>
                    <span className="font-medium">{school.nextIntake}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Annual Fees</span>
                    <span className="font-medium">{school.fees}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Students</span>
                    <span className="font-medium">{school.studentCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Staff</span>
                    <span className="font-medium">{school.teacherCount} teachers</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Student:Teacher</span>
                    <span className="font-medium">
                      {Math.round(school.studentCount / school.teacherCount)}:1
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {school.location}, {school.state}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>+61 2 1234 5678</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>info@{school.name.toLowerCase().replace(/\s+/g, '')}.edu.au</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span>www.{school.name.toLowerCase().replace(/\s+/g, '')}.edu.au</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Facilities Tab */}
        <TabsContent value="facilities" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>School Facilities</CardTitle>
              <CardDescription>Our learning spaces and amenities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {school.facilities.map((facility) => {
                  const FacilityIcon = facilityIcons[facility] || Building;
                  return (
                    <div
                      key={facility}
                      className="flex items-center gap-4 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="rounded-lg bg-primary/10 p-3">
                        <FacilityIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{facility}</p>
                        <p className="text-xs text-muted-foreground">Available to all students</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Photo Gallery Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Photo Gallery</CardTitle>
              <CardDescription>Explore our campus and facilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="aspect-video rounded-lg bg-muted flex items-center justify-center"
                  >
                    <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4">
                View All Photos
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Teachers Tab */}
        <TabsContent value="teachers" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Our Teaching Staff</CardTitle>
              <CardDescription>
                Meet the educators who make our school special
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {school.teachers.map((teacher) => (
                  <div
                    key={teacher.id}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={undefined} />
                      <AvatarFallback className="text-2xl bg-primary/10">
                        {teacher.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h4 className="font-semibold">{teacher.name}</h4>
                      <p className="text-sm text-muted-foreground">{teacher.specialization}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {teacher.yearsExperience} years experience
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Staff Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold">{school.teacherCount}</p>
                <p className="text-sm text-muted-foreground">Teaching Staff</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold">
                  {Math.round(school.studentCount / school.teacherCount)}:1
                </p>
                <p className="text-sm text-muted-foreground">Student:Teacher Ratio</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-3xl font-bold">
                  {Math.round(
                    school.teachers.reduce((sum, t) => sum + t.yearsExperience, 0) /
                      school.teachers.length
                  )}
                </p>
                <p className="text-sm text-muted-foreground">Avg Years Experience</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Enrollment Tab */}
        <TabsContent value="enrollment" className="mt-6 space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              {/* Enrollment Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Enrollment Status</CardTitle>
                      <CardDescription>Current enrollment availability</CardDescription>
                    </div>
                    <Badge className={statusInfo.className} variant="outline">
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {statusInfo.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Current Enrollment</span>
                      <span className="font-medium">{school.studentCount} students</span>
                    </div>
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">
                      Approximately 75% capacity. Next intake: {school.nextIntake}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Application Process */}
              <Card>
                <CardHeader>
                  <CardTitle>Application Process</CardTitle>
                  <CardDescription>How to apply for enrollment</CardDescription>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {[
                      {
                        step: 1,
                        title: 'Submit Application',
                        description:
                          'Complete the online application form with student and family details.',
                      },
                      {
                        step: 2,
                        title: 'Document Verification',
                        description:
                          'Provide required documents including birth certificate and previous school reports.',
                      },
                      {
                        step: 3,
                        title: 'School Visit & Interview',
                        description:
                          'Meet with our admissions team and tour the campus with your child.',
                      },
                      {
                        step: 4,
                        title: 'Offer & Enrollment',
                        description:
                          'Receive your offer letter and complete the enrollment process.',
                      },
                    ].map((item) => (
                      <li key={item.step} className="flex gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
                          {item.step}
                        </div>
                        <div>
                          <h4 className="font-medium">{item.title}</h4>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Required Documents */}
              <Card>
                <CardHeader>
                  <CardTitle>Required Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {[
                      'Birth certificate or passport',
                      'Immunisation records',
                      'Previous school reports (if applicable)',
                      'Parent/guardian identification',
                      'Medical information and emergency contacts',
                      'Proof of address',
                    ].map((doc) => (
                      <li key={doc} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {doc}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Fees */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Fees & Costs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-primary/5 p-4 text-center">
                    <p className="text-2xl font-bold">{school.fees}</p>
                    <p className="text-sm text-muted-foreground">Annual tuition</p>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Enrolment Fee</span>
                      <span>$500 (one-time)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Materials Levy</span>
                      <span>$800/year</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Excursions</span>
                      <span>As applicable</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payment plans available. Some families may qualify for fee assistance.
                  </p>
                </CardContent>
              </Card>

              {/* Apply CTA */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-6 text-center space-y-4">
                  <Calendar className="h-12 w-12 mx-auto text-primary" />
                  <div>
                    <h3 className="font-semibold">Ready to Apply?</h3>
                    <p className="text-sm text-muted-foreground">
                      Next intake: {school.nextIntake}
                    </p>
                  </div>
                  {school.status === 'accepting' ? (
                    <Button className="w-full" size="lg">
                      Start Application
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : school.status === 'waitlisted' ? (
                    <Button className="w-full" size="lg">
                      Join Waitlist
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button className="w-full" size="lg" disabled>
                      Currently Full
                    </Button>
                  )}
                  <Button variant="outline" className="w-full">
                    Download Information Pack
                  </Button>
                </CardContent>
              </Card>

              {/* Key Dates */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Key Dates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Application Deadline</span>
                    <span className="font-medium">15 Nov 2025</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Open Day</span>
                    <span className="font-medium">20 Oct 2025</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Term 1 Start</span>
                    <span className="font-medium">29 Jan 2026</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
