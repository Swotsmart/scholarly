'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { PageHeader } from '@/components/shared/page-header';
import {
  Search,
  ChevronRight,
  ChevronDown,
  BookOpen,
  GraduationCap,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileText,
  Target,
  Layers,
  Info,
  X,
  Filter,
  Globe,
  Link2,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

// Types
interface CurriculumCode {
  id: string;
  code: string;
  title: string;
  description: string;
  elaborations?: string[];
  yearLevel: string;
  subject: string;
  strand: string;
  substrand: string;
  learningArea: string;
  alignedResources: {
    id: string;
    title: string;
    type: 'course' | 'lesson' | 'resource';
  }[];
  crossMappings: {
    framework: string;
    code: string;
    title: string;
  }[];
}

interface Substrand {
  id: string;
  name: string;
  codes: CurriculumCode[];
}

interface Strand {
  id: string;
  name: string;
  description: string;
  substrands: Substrand[];
}

interface LearningArea {
  id: string;
  name: string;
  description: string;
  strands: Strand[];
}

interface CurriculumFramework {
  id: string;
  name: string;
  shortName: string;
  description: string;
  country: string;
  learningAreas: LearningArea[];
}

// Mock curriculum data
const FRAMEWORKS: CurriculumFramework[] = [
  {
    id: 'acara',
    name: 'Australian Curriculum (ACARA)',
    shortName: 'ACARA',
    description: 'The Australian Curriculum sets out what all young Australians should learn as they progress through schooling.',
    country: 'Australia',
    learningAreas: [
      {
        id: 'la_english',
        name: 'English',
        description: 'The study of English helps create confident communicators, imaginative thinkers and informed citizens.',
        strands: [
          {
            id: 'strand_lit',
            name: 'Literature',
            description: 'Engaging with and creating literature.',
            substrands: [
              {
                id: 'ss_lit_exp',
                name: 'Examining Literature',
                codes: [
                  {
                    id: 'acelt1619',
                    code: 'ACELT1619',
                    title: 'Identify aspects of literary texts that convey details or information about particular social, cultural and historical contexts',
                    description: 'Students learn to identify how literary texts reflect the context in which they were created.',
                    elaborations: [
                      'Identifying historical and cultural contexts of literary texts',
                      'Discussing how social values influence literary texts',
                      'Comparing texts from different time periods',
                    ],
                    yearLevel: 'Year 7',
                    subject: 'English',
                    strand: 'Literature',
                    substrand: 'Examining Literature',
                    learningArea: 'English',
                    alignedResources: [
                      { id: 'course_6', title: 'Creative Writing Essentials', type: 'course' },
                      { id: 'lesson_101', title: 'Understanding Context in Literature', type: 'lesson' },
                    ],
                    crossMappings: [
                      { framework: 'IB', code: 'LAL.1.2', title: 'Language in Cultural Context' },
                      { framework: 'Common Core', code: 'CCSS.ELA-LITERACY.RL.7.3', title: 'Analyze how particular elements of a story interact' },
                    ],
                  },
                  {
                    id: 'acelt1620',
                    code: 'ACELT1620',
                    title: 'Recognise and analyse the ways that characterisation, events and settings are combined in narratives',
                    description: 'Students learn to analyse how authors construct narratives through characterisation, plot and setting.',
                    yearLevel: 'Year 7',
                    subject: 'English',
                    strand: 'Literature',
                    substrand: 'Examining Literature',
                    learningArea: 'English',
                    alignedResources: [
                      { id: 'course_6', title: 'Creative Writing Essentials', type: 'course' },
                    ],
                    crossMappings: [
                      { framework: 'IB', code: 'LAL.2.1', title: 'Text Types and Structures' },
                    ],
                  },
                ],
              },
              {
                id: 'ss_lit_create',
                name: 'Creating Literature',
                codes: [
                  {
                    id: 'acelt1625',
                    code: 'ACELT1625',
                    title: 'Create literary texts that adapt stylistic features encountered in other texts',
                    description: 'Students learn to create their own literary texts using techniques from their reading.',
                    yearLevel: 'Year 7',
                    subject: 'English',
                    strand: 'Literature',
                    substrand: 'Creating Literature',
                    learningArea: 'English',
                    alignedResources: [
                      { id: 'course_6', title: 'Creative Writing Essentials', type: 'course' },
                    ],
                    crossMappings: [],
                  },
                ],
              },
            ],
          },
          {
            id: 'strand_lang',
            name: 'Language',
            description: 'Understanding how language works.',
            substrands: [
              {
                id: 'ss_lang_text',
                name: 'Text Structure and Organisation',
                codes: [
                  {
                    id: 'acela1763',
                    code: 'ACELA1763',
                    title: 'Understand how text structures and language features combine to construct meaning',
                    description: 'Students learn how different text types are structured and how language features contribute to meaning.',
                    yearLevel: 'Year 7',
                    subject: 'English',
                    strand: 'Language',
                    substrand: 'Text Structure and Organisation',
                    learningArea: 'English',
                    alignedResources: [],
                    crossMappings: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'la_maths',
        name: 'Mathematics',
        description: 'Mathematics provides students with essential mathematical skills and knowledge.',
        strands: [
          {
            id: 'strand_num',
            name: 'Number and Algebra',
            description: 'Working with numbers and algebraic concepts.',
            substrands: [
              {
                id: 'ss_num_int',
                name: 'Integers',
                codes: [
                  {
                    id: 'acmna280',
                    code: 'ACMNA280',
                    title: 'Solve problems involving addition and subtraction of integers',
                    description: 'Students develop fluency in operations with integers including positive and negative numbers.',
                    yearLevel: 'Year 7',
                    subject: 'Mathematics',
                    strand: 'Number and Algebra',
                    substrand: 'Integers',
                    learningArea: 'Mathematics',
                    alignedResources: [
                      { id: 'course_5', title: 'Advanced Mathematics: Calculus', type: 'course' },
                    ],
                    crossMappings: [
                      { framework: 'IB', code: 'MYP.2.1', title: 'Number Operations' },
                      { framework: 'Common Core', code: '7.NS.A.1', title: 'Apply and extend previous understandings of addition' },
                    ],
                  },
                ],
              },
              {
                id: 'ss_num_alg',
                name: 'Algebraic Reasoning',
                codes: [
                  {
                    id: 'acmna175',
                    code: 'ACMNA175',
                    title: 'Introduce the concept of variables as a way of representing numbers',
                    description: 'Students begin to use algebraic notation and understand variables as placeholders.',
                    yearLevel: 'Year 7',
                    subject: 'Mathematics',
                    strand: 'Number and Algebra',
                    substrand: 'Algebraic Reasoning',
                    learningArea: 'Mathematics',
                    alignedResources: [],
                    crossMappings: [],
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'la_tech',
        name: 'Technologies',
        description: 'The Technologies learning area includes Design and Technologies, and Digital Technologies.',
        strands: [
          {
            id: 'strand_dig',
            name: 'Digital Technologies',
            description: 'Developing computational thinking and digital skills.',
            substrands: [
              {
                id: 'ss_dig_proc',
                name: 'Digital Systems and Data',
                codes: [
                  {
                    id: 'actdik023',
                    code: 'ACTDIK023',
                    title: 'Investigate how data is transmitted and secured in wired, wireless and mobile networks',
                    description: 'Students explore how digital systems communicate and how data is protected.',
                    yearLevel: 'Year 7-8',
                    subject: 'Digital Technologies',
                    strand: 'Digital Technologies',
                    substrand: 'Digital Systems and Data',
                    learningArea: 'Technologies',
                    alignedResources: [
                      { id: 'course_7', title: 'Introduction to Python Programming', type: 'course' },
                    ],
                    crossMappings: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ib',
    name: 'International Baccalaureate (IB)',
    shortName: 'IB',
    description: 'The IB programmes develop internationally minded people who help create a more peaceful world.',
    country: 'International',
    learningAreas: [
      {
        id: 'ib_lang',
        name: 'Language and Literature',
        description: 'The study of language and literature helps students understand different perspectives.',
        strands: [
          {
            id: 'ib_lang_context',
            name: 'Language in Cultural Context',
            description: 'Understanding how language shapes and is shaped by culture.',
            substrands: [
              {
                id: 'ib_lang_context_1',
                name: 'Textual Analysis',
                codes: [
                  {
                    id: 'lal_1_2',
                    code: 'LAL.1.2',
                    title: 'Language in Cultural Context',
                    description: 'Students analyze how cultural contexts influence language use and meaning.',
                    yearLevel: 'MYP Year 1-2',
                    subject: 'Language and Literature',
                    strand: 'Language in Cultural Context',
                    substrand: 'Textual Analysis',
                    learningArea: 'Language and Literature',
                    alignedResources: [],
                    crossMappings: [
                      { framework: 'ACARA', code: 'ACELT1619', title: 'Identify aspects of literary texts' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'common_core',
    name: 'Common Core State Standards',
    shortName: 'Common Core',
    description: 'A set of high-quality academic standards in mathematics and English language arts.',
    country: 'United States',
    learningAreas: [
      {
        id: 'cc_ela',
        name: 'English Language Arts',
        description: 'Standards for reading, writing, speaking, and listening.',
        strands: [
          {
            id: 'cc_reading',
            name: 'Reading Literature',
            description: 'Standards for reading and analyzing literary texts.',
            substrands: [
              {
                id: 'cc_read_key',
                name: 'Key Ideas and Details',
                codes: [
                  {
                    id: 'ccss_ela_rl_7_3',
                    code: 'CCSS.ELA-LITERACY.RL.7.3',
                    title: 'Analyze how particular elements of a story or drama interact',
                    description: 'Analyze how particular elements of a story or drama interact (e.g., how setting shapes characters or plot).',
                    yearLevel: 'Grade 7',
                    subject: 'English Language Arts',
                    strand: 'Reading Literature',
                    substrand: 'Key Ideas and Details',
                    learningArea: 'English Language Arts',
                    alignedResources: [],
                    crossMappings: [
                      { framework: 'ACARA', code: 'ACELT1619', title: 'Identify aspects of literary texts' },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'cefr',
    name: 'Common European Framework of Reference for Languages',
    shortName: 'CEFR',
    description: 'An international standard for describing language ability on a six-point scale, from A1 to C2.',
    country: 'International',
    learningAreas: [
      {
        id: 'cefr_reception',
        name: 'Reception',
        description: 'Understanding spoken and written language.',
        strands: [
          {
            id: 'cefr_listening',
            name: 'Listening',
            description: 'Understanding spoken language.',
            substrands: [
              {
                id: 'cefr_listen_a1',
                name: 'A1 - Breakthrough',
                codes: [
                  {
                    id: 'cefr_a1_listen',
                    code: 'A1.L1',
                    title: 'Understand familiar words and basic phrases',
                    description: 'Can understand familiar words and very basic phrases concerning self, family and immediate concrete surroundings when people speak slowly and clearly.',
                    yearLevel: 'A1',
                    subject: 'Language Learning',
                    strand: 'Listening',
                    substrand: 'A1 - Breakthrough',
                    learningArea: 'Reception',
                    alignedResources: [],
                    crossMappings: [],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

const YEAR_LEVELS = [
  'All Levels',
  'Year 7',
  'Year 7-8',
  'Year 8',
  'Year 9',
  'Year 9-10',
  'Year 10',
  'Year 11',
  'Year 11-12',
  'Year 12',
  'MYP Year 1-2',
  'Grade 7',
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
];

const SUBJECTS = [
  'All Subjects',
  'English',
  'Mathematics',
  'Science',
  'Digital Technologies',
  'Language and Literature',
  'English Language Arts',
  'Language Learning',
];

// Helper to flatten all codes for search
function getAllCodes(frameworks: CurriculumFramework[]): CurriculumCode[] {
  const codes: CurriculumCode[] = [];
  for (const framework of frameworks) {
    for (const area of framework.learningAreas) {
      for (const strand of area.strands) {
        for (const substrand of strand.substrands) {
          codes.push(...substrand.codes);
        }
      }
    }
  }
  return codes;
}

// Code Detail Dialog
function CodeDetailDialog({ code, children }: { code: CurriculumCode; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(code.code);
    setCopied(true);
    toast({ title: 'Copied!', description: `${code.code} copied to clipboard` });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge>{code.code}</Badge>
            <Button variant="ghost" size="icon-sm" onClick={copyCode}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogTitle className="text-lg">{code.title}</DialogTitle>
          <DialogDescription>{code.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Year Level</p>
              <p>{code.yearLevel}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Subject</p>
              <p>{code.subject}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Strand</p>
              <p>{code.strand}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Substrand</p>
              <p>{code.substrand}</p>
            </div>
          </div>

          {/* Elaborations */}
          {code.elaborations && code.elaborations.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Elaborations</h4>
              <ul className="space-y-2">
                {code.elaborations.map((elab, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-1">-</span>
                    <span>{elab}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Aligned Resources */}
          {code.alignedResources.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Aligned Resources
              </h4>
              <div className="space-y-2">
                {code.alignedResources.map((resource) => (
                  <Link
                    key={resource.id}
                    href={
                      resource.type === 'course'
                        ? `/learning/courses/${resource.id}`
                        : `/learning/lesson/${resource.id}`
                    }
                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    {resource.type === 'course' ? (
                      <BookOpen className="h-5 w-5 text-primary" />
                    ) : (
                      <FileText className="h-5 w-5 text-primary" />
                    )}
                    <div>
                      <p className="font-medium">{resource.title}</p>
                      <p className="text-sm text-muted-foreground capitalize">{resource.type}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Mappings */}
          {code.crossMappings.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Equivalent Codes in Other Frameworks
              </h4>
              <div className="space-y-2">
                {code.crossMappings.map((mapping, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{mapping.framework}</Badge>
                        <Badge variant="secondary">{mapping.code}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{mapping.title}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Curriculum Code Card
function CurriculumCodeCard({ code }: { code: CurriculumCode }) {
  return (
    <CodeDetailDialog code={code}>
      <Card hover className="cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Badge className="flex-shrink-0">{code.code}</Badge>
            <div className="min-w-0">
              <p className="text-sm font-medium line-clamp-2">{code.title}</p>
              <div className="flex flex-wrap gap-1 mt-2">
                <Badge variant="outline" className="text-xs">
                  {code.yearLevel}
                </Badge>
                {code.alignedResources.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    <BookOpen className="h-3 w-3 mr-1" />
                    {code.alignedResources.length} resources
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </CodeDetailDialog>
  );
}

// Tree View Component
function CurriculumTreeView({
  framework,
  searchQuery,
  yearLevel,
  subject,
}: {
  framework: CurriculumFramework;
  searchQuery: string;
  yearLevel: string;
  subject: string;
}) {
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(new Set());
  const [expandedStrands, setExpandedStrands] = useState<Set<string>>(new Set());
  const [expandedSubstrands, setExpandedSubstrands] = useState<Set<string>>(new Set());

  const toggleArea = (id: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedAreas(newExpanded);
  };

  const toggleStrand = (id: string) => {
    const newExpanded = new Set(expandedStrands);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedStrands(newExpanded);
  };

  const toggleSubstrand = (id: string) => {
    const newExpanded = new Set(expandedSubstrands);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedSubstrands(newExpanded);
  };

  // Filter codes based on search and filters
  const filterCodes = (codes: CurriculumCode[]) => {
    return codes.filter((code) => {
      if (yearLevel !== 'All Levels' && code.yearLevel !== yearLevel) return false;
      if (subject !== 'All Subjects' && code.subject !== subject) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          code.code.toLowerCase().includes(query) ||
          code.title.toLowerCase().includes(query) ||
          code.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  };

  return (
    <div className="space-y-2">
      {framework.learningAreas.map((area) => {
        const isAreaExpanded = expandedAreas.has(area.id);

        return (
          <Card key={area.id}>
            <Collapsible open={isAreaExpanded} onOpenChange={() => toggleArea(area.id)}>
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Layers className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base">{area.name}</CardTitle>
                      <CardDescription className="line-clamp-1">{area.description}</CardDescription>
                    </div>
                    {isAreaExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="space-y-2 ml-4 border-l pl-4">
                    {area.strands.map((strand) => {
                      const isStrandExpanded = expandedStrands.has(strand.id);

                      return (
                        <Collapsible
                          key={strand.id}
                          open={isStrandExpanded}
                          onOpenChange={() => toggleStrand(strand.id)}
                        >
                          <CollapsibleTrigger className="w-full">
                            <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                              <Target className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm flex-1 text-left">
                                {strand.name}
                              </span>
                              {isStrandExpanded ? (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="space-y-2 ml-4 border-l pl-4 py-2">
                              {strand.substrands.map((substrand) => {
                                const isSubstrandExpanded = expandedSubstrands.has(substrand.id);
                                const filteredCodes = filterCodes(substrand.codes);

                                if (filteredCodes.length === 0 && (searchQuery || yearLevel !== 'All Levels' || subject !== 'All Subjects')) {
                                  return null;
                                }

                                return (
                                  <Collapsible
                                    key={substrand.id}
                                    open={isSubstrandExpanded}
                                    onOpenChange={() => toggleSubstrand(substrand.id)}
                                  >
                                    <CollapsibleTrigger className="w-full">
                                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                                        <FileText className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm flex-1 text-left">
                                          {substrand.name}
                                        </span>
                                        <Badge variant="secondary" className="text-xs">
                                          {filteredCodes.length} codes
                                        </Badge>
                                        {isSubstrandExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <div className="space-y-2 py-2 pl-6">
                                        {filteredCodes.map((code) => (
                                          <CurriculumCodeCard key={code.id} code={code} />
                                        ))}
                                      </div>
                                    </CollapsibleContent>
                                  </Collapsible>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        );
      })}
    </div>
  );
}

export default function CurriculumBrowserPage() {
  const [selectedFramework, setSelectedFramework] = useState('acara');
  const [searchQuery, setSearchQuery] = useState('');
  const [yearLevel, setYearLevel] = useState('All Levels');
  const [subject, setSubject] = useState('All Subjects');
  const [showFilters, setShowFilters] = useState(false);

  const currentFramework = FRAMEWORKS.find((f) => f.id === selectedFramework);
  const allCodes = useMemo(() => getAllCodes(FRAMEWORKS), []);

  // Search results
  const searchResults = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return allCodes.filter(
      (code) =>
        code.code.toLowerCase().includes(query) ||
        code.title.toLowerCase().includes(query) ||
        code.description.toLowerCase().includes(query)
    );
  }, [searchQuery, allCodes]);

  const hasActiveFilters = yearLevel !== 'All Levels' || subject !== 'All Subjects';

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Curriculum Browser"
        description="Explore curriculum frameworks and find aligned learning resources"
        actions={
          <Link href="/learning">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Library
            </Button>
          </Link>
        }
      />

      {/* Framework Selector */}
      <div className="flex flex-wrap gap-2">
        {FRAMEWORKS.map((framework) => (
          <Button
            key={framework.id}
            variant={selectedFramework === framework.id ? 'default' : 'outline'}
            onClick={() => setSelectedFramework(framework.id)}
            className="gap-2"
          >
            <Globe className="h-4 w-4" />
            {framework.shortName}
          </Button>
        ))}
      </div>

      {/* Framework Info */}
      {currentFramework && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">{currentFramework.name}</h2>
              <p className="text-sm text-muted-foreground mt-1">{currentFramework.description}</p>
              <Badge variant="outline" className="mt-2">
                {currentFramework.country}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search curriculum codes by keyword, code, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute right-2 top-1/2 -translate-y-1/2"
              onClick={() => setSearchQuery('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Button
          variant={showFilters ? 'secondary' : 'outline'}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-2">
              Active
            </Badge>
          )}
        </Button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="text-sm font-medium mb-2 block">Year Level</label>
              <Select value={yearLevel} onValueChange={setYearLevel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_LEVELS.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={() => {
                    setYearLevel('All Levels');
                    setSubject('All Subjects');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Search Results or Tree View */}
      {searchQuery && searchResults.length > 0 ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Search Results ({searchResults.length})
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')}>
              Clear Search
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {searchResults.map((code) => (
              <CurriculumCodeCard key={code.id} code={code} />
            ))}
          </div>
        </div>
      ) : searchQuery && searchResults.length === 0 ? (
        <Card className="p-12 text-center">
          <Search className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No results found</h3>
          <p className="mt-2 text-muted-foreground">
            Try different keywords or browse the curriculum tree below
          </p>
          <Button className="mt-4" variant="outline" onClick={() => setSearchQuery('')}>
            Clear Search
          </Button>
        </Card>
      ) : currentFramework ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Browse {currentFramework.shortName}</h2>
          <CurriculumTreeView
            framework={currentFramework}
            searchQuery={searchQuery}
            yearLevel={yearLevel}
            subject={subject}
          />
        </div>
      ) : null}

      {/* AI Curriculum Assistant */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="h-6 w-6 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">AI Curriculum Assistant</h3>
            <p className="text-sm text-muted-foreground">
              Need help mapping curriculum codes to learning resources? Our AI assistant can help
              you find aligned content and create learning paths.
            </p>
          </div>
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Ask AI
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
