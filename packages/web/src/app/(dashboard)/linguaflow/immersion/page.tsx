'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Globe,
  Play,
  Trophy,
  BarChart3,
  Languages,
  Filter,
  Search,
  Clock,
  Users,
  Star,
  Sparkles,
  Monitor,
  Box,
  Glasses,
  Headphones,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const LANGUAGES = [
  { code: 'fr', name: 'French', flag: '\ud83c\uddeb\ud83c\uddf7', color: 'from-blue-600 to-blue-800' },
  { code: 'zh', name: 'Mandarin', flag: '\ud83c\udde8\ud83c\uddf3', color: 'from-red-600 to-red-800' },
  { code: 'ja', name: 'Japanese', flag: '\ud83c\uddef\ud83c\uddf5', color: 'from-rose-500 to-pink-700' },
  { code: 'es', name: 'Spanish', flag: '\ud83c\uddea\ud83c\uddf8', color: 'from-amber-500 to-orange-700' },
  { code: 'it', name: 'Italian', flag: '\ud83c\uddee\ud83c\uddf9', color: 'from-green-600 to-emerald-800' },
  { code: 'ar', name: 'Arabic', flag: '\ud83c\uddf8\ud83c\udde6', color: 'from-emerald-600 to-teal-800' },
  { code: 'pjt', name: 'Pitjantjatjara', flag: '\ud83c\udde6\ud83c\uddfa', color: 'from-yellow-700 to-amber-900' },
];

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;

const CATEGORIES = ['Travel', 'Business', 'Daily Life', 'Culture', 'Emergency', 'Academic'] as const;

const TIERS = [
  { id: '2D', label: '2D', icon: Monitor },
  { id: '3D', label: '3D', icon: Box },
  { id: 'AR', label: 'AR', icon: Glasses },
  { id: 'VR', label: 'VR', icon: Headphones },
] as const;

type Scenario = {
  id: string;
  title: string;
  language: string;
  cefrLevel: string;
  category: string;
  description: string;
  tiers: string[];
  completionCount: number;
  averageScore: number;
  estimatedMinutes: number;
  isRecommended: boolean;
};

const MOCK_SCENARIOS: Scenario[] = [
  {
    id: 'cafe-parisien',
    title: 'Caf\u00e9 Parisien',
    language: 'fr',
    cefrLevel: 'A2',
    category: 'Daily Life',
    description:
      'Step into a charming Parisian caf\u00e9 and practise ordering croissants, caf\u00e9 cr\u00e8me and navigating a French menu. Interact with your AI waiter Pierre, handle payments in euros and learn essential dining etiquette for France.',
    tiers: ['2D', '3D', 'AR', 'VR'],
    completionCount: 1247,
    averageScore: 82,
    estimatedMinutes: 15,
    isRecommended: true,
  },
  {
    id: 'tokyo-train-station',
    title: 'Tokyo Train Station',
    language: 'ja',
    cefrLevel: 'B1',
    category: 'Travel',
    description:
      "Navigate Tokyo's complex railway system with confidence. Purchase tickets from automated machines, ask platform staff for directions using polite Japanese, and decode station announcements while transferring between the Yamanote and Shinkansen lines.",
    tiers: ['2D', '3D', 'VR'],
    completionCount: 893,
    averageScore: 74,
    estimatedMinutes: 20,
    isRecommended: false,
  },
  {
    id: 'barcelona-market',
    title: 'Barcelona Market',
    language: 'es',
    cefrLevel: 'A1',
    category: 'Travel',
    description:
      'Explore the vibrant La Boqueria market in Barcelona. Learn to greet stall holders, ask about prices, request specific quantities of fruit and seafood, and practise numbers and basic transactional Spanish in a lively marketplace atmosphere.',
    tiers: ['2D', '3D', 'AR'],
    completionCount: 1582,
    averageScore: 88,
    estimatedMinutes: 12,
    isRecommended: true,
  },
  {
    id: 'beijing-business',
    title: 'Beijing Business Meeting',
    language: 'zh',
    cefrLevel: 'B2',
    category: 'Business',
    description:
      'Conduct a high-stakes business negotiation in Mandarin with Chinese counterparts. Practise formal greetings, exchange business cards following correct protocol, present proposals, discuss pricing terms and navigate the nuances of guanxi in a corporate boardroom setting.',
    tiers: ['2D', '3D', 'VR'],
    completionCount: 412,
    averageScore: 68,
    estimatedMinutes: 25,
    isRecommended: false,
  },
  {
    id: 'rome-archaeological-tour',
    title: 'Rome Archaeological Tour',
    language: 'it',
    cefrLevel: 'A2',
    category: 'Culture',
    description:
      'Guide a group of English-speaking tourists through the Colosseum in Italian. Describe the history of gladiatorial combat, explain architectural features, answer visitor questions about ancient Roman civilisation, and manage group logistics using practical Italian vocabulary.',
    tiers: ['2D', '3D', 'AR', 'VR'],
    completionCount: 634,
    averageScore: 79,
    estimatedMinutes: 18,
    isRecommended: false,
  },
  {
    id: 'cairo-museum',
    title: 'Cairo Museum Visit',
    language: 'ar',
    cefrLevel: 'B1',
    category: 'Culture',
    description:
      'Visit the Grand Egyptian Museum in Cairo and discuss ancient artefacts with a knowledgeable curator. Practise formal Arabic to describe historical objects, ask about Tutankhamun\u2019s treasures, read exhibit labels in Modern Standard Arabic and express opinions about Egyptian art and civilisation.',
    tiers: ['2D', '3D'],
    completionCount: 287,
    averageScore: 71,
    estimatedMinutes: 20,
    isRecommended: false,
  },
  {
    id: 'dreamtime-stories',
    title: 'Dreamtime Stories',
    language: 'pjt',
    cefrLevel: 'A1',
    category: 'Culture',
    description:
      'Learn Pitjantjatjara language and culture through traditional Indigenous Australian storytelling. An Elder guide shares Dreaming stories about Uluru, teaches you to identify bush foods using their Pitjantjatjara names, and introduces foundational vocabulary for land, animals and kinship.',
    tiers: ['2D', '3D', 'AR'],
    completionCount: 198,
    averageScore: 85,
    estimatedMinutes: 15,
    isRecommended: true,
  },
  {
    id: 'sydney-emergency',
    title: 'Sydney Emergency',
    language: 'fr',
    cefrLevel: 'B1',
    category: 'Emergency',
    description:
      'Handle emergency situations as a French speaker in Sydney. Communicate with a French-speaking tourist who has had an accident, relay medical information to paramedics, provide first-aid instructions in French and navigate the Australian emergency services system bilingually.',
    tiers: ['2D', '3D', 'VR'],
    completionCount: 523,
    averageScore: 76,
    estimatedMinutes: 18,
    isRecommended: false,
  },
];

const tierBadgeVariant = (tier: string) => {
  switch (tier) {
    case 'VR':
      return 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20';
    case 'AR':
      return 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20';
    case '3D':
      return 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20';
  }
};

const cefrBadgeColor = (level: string) => {
  if (level.startsWith('A')) return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20';
  if (level.startsWith('B')) return 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20';
  return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20';
};

export default function ImmersionScenariosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [cefrFilter, setCefrFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const filteredScenarios = useMemo(() => {
    return MOCK_SCENARIOS.filter((scenario) => {
      if (searchQuery && !scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) && !scenario.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (languageFilter !== 'all' && scenario.language !== languageFilter) return false;
      if (cefrFilter !== 'all' && scenario.cefrLevel !== cefrFilter) return false;
      if (categoryFilter !== 'all' && scenario.category !== categoryFilter) return false;
      if (tierFilter !== 'all' && !scenario.tiers.includes(tierFilter)) return false;
      return true;
    });
  }, [searchQuery, languageFilter, cefrFilter, categoryFilter, tierFilter]);

  const recommendedScenarios = MOCK_SCENARIOS.filter((s) => s.isRecommended);

  const getLanguage = (code: string) => LANGUAGES.find((l) => l.code === code);

  const totalCompleted = MOCK_SCENARIOS.reduce((sum, s) => sum + s.completionCount, 0);
  const avgScore = Math.round(MOCK_SCENARIOS.reduce((sum, s) => sum + s.averageScore, 0) / MOCK_SCENARIOS.length);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Immersion Scenarios</h1>
          <p className="text-muted-foreground">
            Browse and start immersive language learning scenarios across cultures and contexts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/linguaflow">
            <Button variant="outline">Back to LinguaFlow</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Globe className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{MOCK_SCENARIOS.length}</p>
              <p className="text-sm text-muted-foreground">Scenarios Available</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Trophy className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCompleted.toLocaleString()}</p>
              <p className="text-sm text-muted-foreground">Sessions Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <BarChart3 className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{avgScore}%</p>
              <p className="text-sm text-muted-foreground">Average Score</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Languages className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{LANGUAGES.length}</p>
              <p className="text-sm text-muted-foreground">Languages Available</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search scenarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={languageFilter} onValueChange={setLanguageFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Languages</SelectItem>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={cefrFilter} onValueChange={setCefrFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="CEFR Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                {CEFR_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {level}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {TIERS.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(languageFilter !== 'all' || cefrFilter !== 'all' || categoryFilter !== 'all' || tierFilter !== 'all' || searchQuery) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setLanguageFilter('all');
                  setCefrFilter('all');
                  setCategoryFilter('all');
                  setTierFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommended Section */}
      {languageFilter === 'all' && cefrFilter === 'all' && categoryFilter === 'all' && tierFilter === 'all' && !searchQuery && (
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Recommended for You
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recommendedScenarios.map((scenario) => {
              const lang = getLanguage(scenario.language);
              return (
                <Card key={scenario.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`h-2 bg-gradient-to-r ${lang?.color || 'from-gray-500 to-gray-700'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{lang?.flag}</span>
                        <Badge variant="outline" className={cefrBadgeColor(scenario.cefrLevel)}>
                          {scenario.cefrLevel}
                        </Badge>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" variant="outline">
                        <Star className="h-3 w-3 mr-1" />
                        Recommended
                      </Badge>
                    </div>
                    <CardTitle className="text-lg mt-3">{scenario.title}</CardTitle>
                    <CardDescription className="line-clamp-2">{scenario.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary">{scenario.category}</Badge>
                      {scenario.tiers.map((tier) => (
                        <Badge key={tier} variant="outline" className={`text-xs ${tierBadgeVariant(tier)}`}>
                          {tier}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {scenario.completionCount.toLocaleString()} completed
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {scenario.estimatedMinutes} min
                      </span>
                    </div>
                    <Link href={`/linguaflow/immersion/${scenario.id}`}>
                      <Button className="w-full">
                        <Play className="h-4 w-4 mr-2" />
                        Start Session
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* All Scenarios Grid */}
      <div>
        <h2 className="text-xl font-semibold mb-4">
          {languageFilter !== 'all' || cefrFilter !== 'all' || categoryFilter !== 'all' || tierFilter !== 'all' || searchQuery
            ? `Filtered Scenarios (${filteredScenarios.length})`
            : 'All Scenarios'}
        </h2>
        {filteredScenarios.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium mb-1">No scenarios match your filters</p>
              <p className="text-sm text-muted-foreground mb-4">
                Try adjusting your search criteria or clearing all filters
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setLanguageFilter('all');
                  setCefrFilter('all');
                  setCategoryFilter('all');
                  setTierFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredScenarios.map((scenario) => {
              const lang = getLanguage(scenario.language);
              return (
                <Card key={scenario.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                  <div className={`h-2 bg-gradient-to-r ${lang?.color || 'from-gray-500 to-gray-700'}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{lang?.flag}</span>
                        <span className="text-sm font-medium text-muted-foreground">{lang?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className={cefrBadgeColor(scenario.cefrLevel)}>
                          {scenario.cefrLevel}
                        </Badge>
                        <Badge variant="secondary">{scenario.category}</Badge>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-3">{scenario.title}</CardTitle>
                    <CardDescription className="line-clamp-3">{scenario.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      {scenario.tiers.map((tier) => (
                        <Badge key={tier} variant="outline" className={`text-xs ${tierBadgeVariant(tier)}`}>
                          {tier}
                        </Badge>
                      ))}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-sm mb-4">
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="font-semibold">{scenario.completionCount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="font-semibold">{scenario.averageScore}%</p>
                        <p className="text-xs text-muted-foreground">Avg Score</p>
                      </div>
                      <div className="rounded-md bg-muted/50 p-2">
                        <p className="font-semibold">{scenario.estimatedMinutes}m</p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                    </div>
                    <Link href={`/linguaflow/immersion/${scenario.id}`}>
                      <Button className="w-full" variant={scenario.isRecommended ? 'default' : 'outline'}>
                        <Play className="h-4 w-4 mr-2" />
                        Start Session
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
