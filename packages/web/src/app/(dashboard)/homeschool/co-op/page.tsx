'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, StatsCard } from '@/components/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  Search,
  MapPin,
  Heart,
  MessageCircle,
  Sparkles,
  Filter,
  ChevronRight,
  Star,
  Calendar,
  BookOpen,
  UserPlus,
  Check,
  Plus,
  ArrowRight,
  Wand2,
  GraduationCap,
  Clock,
  Globe,
  Home,
} from 'lucide-react';

// AI-suggested compatible families
const aiSuggestedFamilies = [
  {
    id: 'ai_1',
    name: 'The Robinson Family',
    location: 'Mosman',
    distance: '3.2 km',
    philosophy: 'Charlotte Mason',
    childrenAges: [9, 11],
    interests: ['Nature Study', 'Literature', 'History'],
    matchScore: 95,
    matchReasons: ['Similar philosophy', 'Nearby location', 'Matching children ages'],
    avatar: null,
    bio: 'We love nature walks, read-alouds, and hands-on history projects. Looking for weekly co-op partners.',
    availability: 'Tuesdays & Thursdays',
  },
  {
    id: 'ai_2',
    name: 'Chen Learning Hub',
    location: 'Willoughby',
    distance: '4.8 km',
    philosophy: 'Classical',
    childrenAges: [10, 12],
    interests: ['Latin', 'Logic', 'STEM'],
    matchScore: 88,
    matchReasons: ['Academic focus match', 'Similar schedule', 'Complementary interests'],
    avatar: null,
    bio: 'Classical education enthusiasts with a love for languages and logical thinking. Open to group projects.',
    availability: 'Flexible weekdays',
  },
  {
    id: 'ai_3',
    name: 'The Patel Family',
    location: 'Chatswood',
    distance: '5.1 km',
    philosophy: 'Eclectic',
    childrenAges: [8, 10, 13],
    interests: ['Music', 'Coding', 'Art'],
    matchScore: 82,
    matchReasons: ['Creative focus', 'Multiple children', 'Shared subject interests'],
    avatar: null,
    bio: 'A creative household blending various educational approaches. We host monthly art workshops.',
    availability: 'Mondays & Wednesdays',
  },
];

// All families for browsing
const allFamilies = [
  ...aiSuggestedFamilies,
  {
    id: 'fam_4',
    name: 'Wilson Homeschool',
    location: 'Lane Cove',
    distance: '6.2 km',
    philosophy: 'Montessori',
    childrenAges: [6, 9],
    interests: ['Practical Life', 'Sensorial', 'Nature'],
    matchScore: 75,
    matchReasons: [],
    avatar: null,
    bio: 'Following the Montessori method at home with a focus on independence and self-directed learning.',
    availability: 'Mornings preferred',
  },
  {
    id: 'fam_5',
    name: 'The Garcia Family',
    location: 'Neutral Bay',
    distance: '2.8 km',
    philosophy: 'Unschooling',
    childrenAges: [11, 14],
    interests: ['Project-Based', 'Travel', 'Entrepreneurship'],
    matchScore: 70,
    matchReasons: [],
    avatar: null,
    bio: 'Life learners following our children\'s interests. Currently exploring business and travel.',
    availability: 'Very flexible',
  },
  {
    id: 'fam_6',
    name: 'Thompson Academy',
    location: 'North Sydney',
    distance: '4.0 km',
    philosophy: 'Traditional',
    childrenAges: [7, 10, 12],
    interests: ['Core Subjects', 'Sports', 'Music'],
    matchScore: 68,
    matchReasons: [],
    avatar: null,
    bio: 'Structured learning with emphasis on core academics, complemented by sports and music.',
    availability: 'Afternoons',
  },
];

// Existing co-ops
const existingCoops = [
  {
    id: 'coop_1',
    name: 'North Shore Nature Explorers',
    location: 'Various Parks, North Shore',
    memberCount: 12,
    ageRange: '6-12',
    focus: ['Nature Study', 'Science', 'Outdoor Ed'],
    meetingSchedule: 'Every Friday, 10 AM',
    description: 'Weekly nature walks and outdoor science activities. Focus on Australian flora and fauna.',
    isOpen: true,
  },
  {
    id: 'coop_2',
    name: 'Classical Conversations Sydney',
    location: 'Chatswood Community Centre',
    memberCount: 24,
    ageRange: '4-18',
    focus: ['Classical Education', 'Latin', 'Memory Work'],
    meetingSchedule: 'Tuesdays, 9 AM - 12 PM',
    description: 'Following the Classical Conversations curriculum with weekly community days.',
    isOpen: false,
  },
  {
    id: 'coop_3',
    name: 'STEM Innovators Co-op',
    location: 'Maker Space, Willoughby',
    memberCount: 8,
    ageRange: '10-15',
    focus: ['Robotics', 'Coding', 'Engineering'],
    meetingSchedule: 'Wednesdays, 1-4 PM',
    description: 'Hands-on STEM projects, robotics competitions, and coding challenges.',
    isOpen: true,
  },
];

// Philosophy options
const philosophyOptions = [
  'Charlotte Mason',
  'Classical',
  'Montessori',
  'Unschooling',
  'Eclectic',
  'Traditional',
  'Waldorf',
  'Project-Based',
];

// Location options
const locationOptions = [
  'Sydney CBD',
  'North Sydney',
  'Chatswood',
  'Willoughby',
  'Lane Cove',
  'Mosman',
  'Neutral Bay',
  'Other',
];

export default function CoopFinderPage() {
  const [activeTab, setActiveTab] = useState('suggested');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPhilosophy, setSelectedPhilosophy] = useState('all');
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [maxDistance, setMaxDistance] = useState([10]);
  const [childAgeRange, setChildAgeRange] = useState([5, 15]);
  const [showFilters, setShowFilters] = useState(false);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);

  // Filter families based on criteria
  const filteredFamilies = allFamilies.filter((family) => {
    const matchesSearch =
      searchQuery === '' ||
      family.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      family.interests.some((i) => i.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesPhilosophy =
      selectedPhilosophy === 'all' || family.philosophy === selectedPhilosophy;

    const matchesLocation =
      selectedLocation === 'all' ||
      family.location.toLowerCase().includes(selectedLocation.toLowerCase());

    const matchesDistance = parseFloat(family.distance) <= maxDistance[0];

    const matchesAge = family.childrenAges.some(
      (age) => age >= childAgeRange[0] && age <= childAgeRange[1]
    );

    return matchesSearch && matchesPhilosophy && matchesLocation && matchesDistance && matchesAge;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Co-op Finder"
        description="Find compatible homeschool families and join learning co-ops"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/homeschool/co-op/my-connections">
                <Users className="mr-2 h-4 w-4" />
                My Connections
              </Link>
            </Button>
            <Dialog open={isWizardOpen} onOpenChange={setIsWizardOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Co-op
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Create a New Co-op</DialogTitle>
                  <DialogDescription>
                    Set up your homeschool co-op in a few simple steps
                  </DialogDescription>
                </DialogHeader>

                {wizardStep === 1 && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="coop-name">Co-op Name</Label>
                      <Input id="coop-name" placeholder="e.g., North Shore Learning Circle" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="coop-description">Description</Label>
                      <Textarea
                        id="coop-description"
                        placeholder="Describe your co-op's focus and activities..."
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Philosophy</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Select philosophy" />
                          </SelectTrigger>
                          <SelectContent>
                            {philosophyOptions.map((p) => (
                              <SelectItem key={p} value={p.toLowerCase()}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Age Range</Label>
                        <div className="flex gap-2">
                          <Input type="number" placeholder="Min" className="w-20" />
                          <span className="flex items-center">to</span>
                          <Input type="number" placeholder="Max" className="w-20" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Meeting Location</Label>
                      <Input placeholder="e.g., Community Centre, Park, or Rotating homes" />
                    </div>
                    <div className="space-y-2">
                      <Label>Meeting Schedule</Label>
                      <div className="grid grid-cols-2 gap-4">
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="Day" />
                          </SelectTrigger>
                          <SelectContent>
                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                              <SelectItem key={d} value={d.toLowerCase()}>
                                {d}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input type="time" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Focus Areas</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {['STEM', 'Arts', 'Nature', 'Languages', 'History', 'Sports'].map((area) => (
                          <div key={area} className="flex items-center space-x-2">
                            <Checkbox id={area} />
                            <label htmlFor={area} className="text-sm">
                              {area}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && (
                  <div className="space-y-4 py-4">
                    <div className="rounded-lg bg-muted/50 p-4 text-center">
                      <Check className="mx-auto h-12 w-12 text-green-500" />
                      <h3 className="mt-2 font-semibold">Ready to Launch!</h3>
                      <p className="text-sm text-muted-foreground">
                        Your co-op will be visible to local families
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label>Invite Families</Label>
                      <p className="text-sm text-muted-foreground">
                        Would you like to invite families from your connections?
                      </p>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {aiSuggestedFamilies.slice(0, 4).map((family) => (
                          <div
                            key={family.id}
                            className="flex items-center space-x-2 rounded-lg border p-2"
                          >
                            <Checkbox id={family.id} />
                            <label htmlFor={family.id} className="text-sm">
                              {family.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <DialogFooter>
                  {wizardStep > 1 && (
                    <Button variant="outline" onClick={() => setWizardStep(wizardStep - 1)}>
                      Back
                    </Button>
                  )}
                  {wizardStep < 3 ? (
                    <Button onClick={() => setWizardStep(wizardStep + 1)}>Continue</Button>
                  ) : (
                    <Button
                      onClick={() => {
                        setIsWizardOpen(false);
                        setWizardStep(1);
                      }}
                    >
                      Create Co-op
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="AI Matches"
          value={aiSuggestedFamilies.length}
          icon={Sparkles}
          variant="primary"
          subtitle="Compatible families"
        />
        <StatsCard
          label="Local Families"
          value={allFamilies.length}
          icon={Users}
          variant="success"
        />
        <StatsCard
          label="Active Co-ops"
          value={existingCoops.length}
          icon={Home}
          variant="warning"
        />
        <StatsCard
          label="My Connections"
          value={2}
          icon={Heart}
          variant="primary"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="suggested" className="gap-2">
            <Sparkles className="h-4 w-4" />
            AI Suggested
          </TabsTrigger>
          <TabsTrigger value="browse">Browse Families</TabsTrigger>
          <TabsTrigger value="coops">Join Co-ops</TabsTrigger>
        </TabsList>

        {/* AI Suggested Tab */}
        <TabsContent value="suggested" className="mt-6 space-y-6">
          <Card className="bg-gradient-to-r from-purple-500/5 via-purple-500/10 to-transparent">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <Wand2 className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">AI-Powered Matching</h3>
                <p className="text-sm text-muted-foreground">
                  We analyze your family profile, philosophy, location, and interests to find the
                  best matches for your homeschool journey.
                </p>
              </div>
              <Button variant="outline" size="sm">
                Update Preferences
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {aiSuggestedFamilies.map((family) => (
              <Card key={family.id} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-6">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={family.avatar || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {family.name.split(' ')[1]?.[0] || family.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{family.name}</h3>
                            <Badge className="bg-purple-500/10 text-purple-600">
                              <Star className="mr-1 h-3 w-3" />
                              {family.matchScore}% Match
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {family.location} ({family.distance})
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {family.philosophy}
                            </span>
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              Ages: {family.childrenAges.join(', ')}
                            </span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm text-muted-foreground">{family.bio}</p>

                      <div className="flex flex-wrap gap-2">
                        {family.interests.map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Available:</span>
                        <span>{family.availability}</span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2">
                        {family.matchReasons.map((reason) => (
                          <Badge
                            key={reason}
                            variant="outline"
                            className="text-xs border-green-500/30 bg-green-500/5 text-green-600"
                          >
                            <Check className="mr-1 h-3 w-3" />
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Connect
                      </Button>
                      <Button variant="outline" size="sm">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Message
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Browse Families Tab */}
        <TabsContent value="browse" className="mt-6 space-y-6">
          {/* Search and Filters */}
          <div className="flex flex-col gap-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search families by name or interests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters && <Badge variant="secondary">Active</Badge>}
              </Button>
            </div>

            {showFilters && (
              <Card>
                <CardContent className="p-4">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Philosophy</Label>
                      <Select value={selectedPhilosophy} onValueChange={setSelectedPhilosophy}>
                        <SelectTrigger>
                          <SelectValue placeholder="All philosophies" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Philosophies</SelectItem>
                          {philosophyOptions.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger>
                          <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Locations</SelectItem>
                          {locationOptions.map((l) => (
                            <SelectItem key={l} value={l.toLowerCase()}>
                              {l}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Max Distance: {maxDistance[0]} km</Label>
                      <Slider
                        value={maxDistance}
                        onValueChange={setMaxDistance}
                        max={25}
                        min={1}
                        step={1}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>
                        Children Ages: {childAgeRange[0]} - {childAgeRange[1]}
                      </Label>
                      <Slider
                        value={childAgeRange}
                        onValueChange={setChildAgeRange}
                        max={18}
                        min={3}
                        step={1}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Family Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFamilies.map((family) => (
              <Card key={family.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {family.name.split(' ')[1]?.[0] || family.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold truncate">{family.name}</h4>
                        {family.matchScore >= 80 && (
                          <Badge className="bg-purple-500/10 text-purple-600 text-xs">
                            Top Match
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {family.location} - {family.distance}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    {family.philosophy}
                    <span className="mx-1">|</span>
                    <GraduationCap className="h-4 w-4" />
                    Ages: {family.childrenAges.join(', ')}
                  </div>

                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{family.bio}</p>

                  <div className="mt-3 flex flex-wrap gap-1">
                    {family.interests.slice(0, 3).map((interest) => (
                      <Badge key={interest} variant="outline" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button size="sm" className="flex-1">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Connect
                    </Button>
                    <Button variant="outline" size="icon-sm">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredFamilies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No families found</h3>
              <p className="text-sm text-muted-foreground">
                Try adjusting your filters or search terms
              </p>
            </div>
          )}
        </TabsContent>

        {/* Join Co-ops Tab */}
        <TabsContent value="coops" className="mt-6 space-y-6">
          <div className="grid gap-4 lg:grid-cols-2">
            {existingCoops.map((coop) => (
              <Card key={coop.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{coop.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {coop.location}
                      </CardDescription>
                    </div>
                    <Badge
                      className={
                        coop.isOpen
                          ? 'bg-green-500/10 text-green-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }
                    >
                      {coop.isOpen ? 'Open' : 'Waitlist'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{coop.description}</p>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{coop.memberCount} families</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                      <span>Ages {coop.ageRange}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>{coop.meetingSchedule}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {coop.focus.map((f) => (
                      <Badge key={f} variant="secondary" className="text-xs">
                        {f}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1" asChild>
                      <Link href={`/homeschool/co-op/${coop.id}`}>
                        Learn More
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                    <Button className="flex-1">
                      {coop.isOpen ? 'Request to Join' : 'Join Waitlist'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-muted/30">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Can&apos;t find what you&apos;re looking for?</h3>
                  <p className="text-sm text-muted-foreground">
                    Create your own co-op and invite other families to join
                  </p>
                </div>
              </div>
              <Button onClick={() => setIsWizardOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Co-op
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
