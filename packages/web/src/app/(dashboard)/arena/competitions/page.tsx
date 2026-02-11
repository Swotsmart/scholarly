'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Trophy,
  Search,
  Filter,
  ArrowLeft,
  Swords,
  Target,
  Flame,
  BarChart3,
  Loader2,
  Plus,
  BookOpen,
  X,
  GraduationCap,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import { CompetitionCard, ArenaInsightPanel } from '@/components/arena';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import { arenaApi } from '@/lib/arena-api';
import type { ArenaCompetition, UserCompetitionStats, CurriculumStandardRef } from '@/types/arena';

// =============================================================================
// CONSTANTS
// =============================================================================

const FORMAT_OPTIONS = [
  { value: 'all', label: 'All Formats' },
  { value: 'READING_SPRINT', label: 'Reading Sprint' },
  { value: 'ACCURACY_CHALLENGE', label: 'Accuracy Challenge' },
  { value: 'COMPREHENSION_QUIZ', label: 'Comprehension Quiz' },
  { value: 'WORD_BLITZ', label: 'Word Blitz' },
  { value: 'PHONICS_DUEL', label: 'Phonics Duel' },
  { value: 'TEAM_RELAY', label: 'Team Relay' },
  { value: 'STORY_SHOWDOWN', label: 'Story Showdown' },
  { value: 'SPELLING_BEE', label: 'Spelling Bee' },
  { value: 'VOCABULARY_CHALLENGE', label: 'Vocabulary Challenge' },
  { value: 'COLLABORATIVE_CREATION', label: 'Collaborative Creation' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Statuses' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'REGISTRATION_OPEN', label: 'Registration Open' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const FORMAT_LABELS: Record<string, string> = {
  READING_SPRINT: 'Reading Sprint',
  ACCURACY_CHALLENGE: 'Accuracy Challenge',
  COMPREHENSION_QUIZ: 'Comprehension Quiz',
  WORD_BLITZ: 'Word Blitz',
  PHONICS_DUEL: 'Phonics Duel',
  TEAM_RELAY: 'Team Relay',
  STORY_SHOWDOWN: 'Story Showdown',
  SPELLING_BEE: 'Spelling Bee',
  VOCABULARY_CHALLENGE: 'Vocabulary Challenge',
  COLLABORATIVE_CREATION: 'Collaborative Creation',
};

// =============================================================================
// SKELETON
// =============================================================================

function CompetitionGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="h-5 w-48 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-4 w-full rounded bg-muted animate-pulse" />
            <div className="h-4 w-3/4 rounded bg-muted animate-pulse" />
            <div className="flex gap-2">
              <div className="h-6 w-16 rounded bg-muted animate-pulse" />
              <div className="h-6 w-16 rounded bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// =============================================================================
// CREATE COMPETITION DIALOG
// =============================================================================

// =============================================================================
// CURRICULUM DATA (mirrors the curriculum page's hierarchical structure)
// =============================================================================

interface CurriculumCode {
  id: string;
  code: string;
  title: string;
  description: string;
  yearLevel: string;
  subject: string;
  strand: string;
  substrand: string;
  learningArea: string;
  framework: string;
}

interface CurriculumSubstrand {
  name: string;
  codes: CurriculumCode[];
}

interface CurriculumStrand {
  name: string;
  substrands: CurriculumSubstrand[];
}

interface CurriculumLearningArea {
  name: string;
  strands: CurriculumStrand[];
}

interface CurriculumFrameworkData {
  id: string;
  name: string;
  shortName: string;
  learningAreas: CurriculumLearningArea[];
}

const CURRICULUM_FRAMEWORKS: CurriculumFrameworkData[] = [
  {
    id: 'acara', name: 'Australian Curriculum (ACARA)', shortName: 'ACARA',
    learningAreas: [
      {
        name: 'English',
        strands: [
          {
            name: 'Literature',
            substrands: [
              {
                name: 'Examining Literature',
                codes: [
                  { id: 'acelt1619', code: 'ACELT1619', title: 'Identify aspects of literary texts that convey details or information about particular social, cultural and historical contexts', description: 'Students learn to identify how literary texts reflect the context in which they were created.', yearLevel: 'Year 7', subject: 'English', strand: 'Literature', substrand: 'Examining Literature', learningArea: 'English', framework: 'ACARA' },
                  { id: 'acelt1620', code: 'ACELT1620', title: 'Recognise and analyse the ways that characterisation, events and settings are combined in narratives', description: 'Students learn to analyse how authors construct narratives through characterisation, plot and setting.', yearLevel: 'Year 7', subject: 'English', strand: 'Literature', substrand: 'Examining Literature', learningArea: 'English', framework: 'ACARA' },
                ],
              },
              {
                name: 'Creating Literature',
                codes: [
                  { id: 'acelt1625', code: 'ACELT1625', title: 'Create literary texts that adapt stylistic features encountered in other texts', description: 'Students learn to create their own literary texts using techniques from their reading.', yearLevel: 'Year 7', subject: 'English', strand: 'Literature', substrand: 'Creating Literature', learningArea: 'English', framework: 'ACARA' },
                ],
              },
              {
                name: 'Responding to Literature',
                codes: [
                  { id: 'acelt1621', code: 'ACELT1621', title: 'Reflect on ideas and opinions about characters, settings and events in literary texts', description: 'Share responses to literary texts using evidence from the text.', yearLevel: 'Year 3-4', subject: 'English', strand: 'Literature', substrand: 'Responding to Literature', learningArea: 'English', framework: 'ACARA' },
                ],
              },
            ],
          },
          {
            name: 'Language',
            substrands: [
              {
                name: 'Text Structure and Organisation',
                codes: [
                  { id: 'acela1763', code: 'ACELA1763', title: 'Understand how text structures and language features combine to construct meaning', description: 'Students learn how different text types are structured and how language features contribute to meaning.', yearLevel: 'Year 7', subject: 'English', strand: 'Language', substrand: 'Text Structure and Organisation', learningArea: 'English', framework: 'ACARA' },
                ],
              },
              {
                name: 'Phonics and Word Knowledge',
                codes: [
                  { id: 'acela1429', code: 'ACELA1429', title: 'Recognise and name all upper and lower case letters and the most common sound that each letter represents', description: 'Students recognise all upper and lower case letters and the most common sound that each letter represents.', yearLevel: 'Foundation', subject: 'English', strand: 'Language', substrand: 'Phonics and Word Knowledge', learningArea: 'English', framework: 'ACARA' },
                  { id: 'acela1457', code: 'ACELA1457', title: 'Understand how to use digraphs, long vowels, blends and silent letters to spell words', description: 'Understand that a letter can represent more than one sound and that a syllable must contain a vowel sound.', yearLevel: 'Year 1-2', subject: 'English', strand: 'Language', substrand: 'Phonics and Word Knowledge', learningArea: 'English', framework: 'ACARA' },
                  { id: 'acela1462', code: 'ACELA1462', title: 'Understand how to apply knowledge of letter-sound relationships, syllables, and blending and segmenting', description: 'Use knowledge of letter patterns including double letters, common prefixes and suffixes.', yearLevel: 'Year 2-3', subject: 'English', strand: 'Language', substrand: 'Phonics and Word Knowledge', learningArea: 'English', framework: 'ACARA' },
                  { id: 'acela1472', code: 'ACELA1472', title: 'Understand how to use phonic knowledge to read and write words including complex letter patterns', description: 'Use knowledge of letter patterns including double letters, common prefixes and suffixes.', yearLevel: 'Year 3-4', subject: 'English', strand: 'Language', substrand: 'Phonics and Word Knowledge', learningArea: 'English', framework: 'ACARA' },
                ],
              },
            ],
          },
          {
            name: 'Literacy',
            substrands: [
              {
                name: 'Reading and Viewing',
                codes: [
                  { id: 'acely1646', code: 'ACELY1646', title: 'Read decodable and predictable texts using developing phrasing, fluency and contextual meaning', description: 'Read decodable and predictable texts, practising phrasing and fluency, and monitoring meaning.', yearLevel: 'Year 1-2', subject: 'English', strand: 'Literacy', substrand: 'Reading and Viewing', learningArea: 'English', framework: 'ACARA' },
                  { id: 'acely1650', code: 'ACELY1650', title: 'Read less predictable texts with phrasing and fluency by combining contextual, semantic, grammatical and phonic knowledge', description: 'Read with increasing fluency by combining word identification strategies.', yearLevel: 'Year 2-3', subject: 'English', strand: 'Literacy', substrand: 'Reading and Viewing', learningArea: 'English', framework: 'ACARA' },
                  { id: 'acely1656', code: 'ACELY1656', title: 'Use comprehension strategies to build literal and inferred meaning and begin to evaluate texts', description: 'Use comprehension strategies to build literal and inferred meaning and begin to evaluate texts.', yearLevel: 'Year 3-4', subject: 'English', strand: 'Literacy', substrand: 'Reading and Viewing', learningArea: 'English', framework: 'ACARA' },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Mathematics',
        strands: [
          {
            name: 'Number and Algebra',
            substrands: [
              {
                name: 'Number and Place Value',
                codes: [
                  { id: 'acmna013', code: 'ACMNA013', title: 'Establish understanding of the language and processes of counting', description: 'Establish understanding of the language and processes of counting by naming numbers in sequences.', yearLevel: 'Foundation', subject: 'Mathematics', strand: 'Number and Algebra', substrand: 'Number and Place Value', learningArea: 'Mathematics', framework: 'ACARA' },
                ],
              },
              {
                name: 'Integers',
                codes: [
                  { id: 'acmna280', code: 'ACMNA280', title: 'Solve problems involving addition and subtraction of integers', description: 'Students develop fluency in operations with integers including positive and negative numbers.', yearLevel: 'Year 7', subject: 'Mathematics', strand: 'Number and Algebra', substrand: 'Integers', learningArea: 'Mathematics', framework: 'ACARA' },
                ],
              },
              {
                name: 'Algebraic Reasoning',
                codes: [
                  { id: 'acmna175', code: 'ACMNA175', title: 'Introduce the concept of variables as a way of representing numbers using letters', description: 'Students begin to use algebraic notation and understand variables as placeholders.', yearLevel: 'Year 7', subject: 'Mathematics', strand: 'Number and Algebra', substrand: 'Algebraic Reasoning', learningArea: 'Mathematics', framework: 'ACARA' },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Science',
        strands: [
          {
            name: 'Biological Sciences',
            substrands: [
              {
                name: 'Living Things',
                codes: [
                  { id: 'acssu002', code: 'ACSSU002', title: 'Living things have a variety of external features and live in different places', description: 'Living things have basic needs including food and water and live in different places where their needs are met.', yearLevel: 'Foundation', subject: 'Science', strand: 'Biological Sciences', substrand: 'Living Things', learningArea: 'Science', framework: 'ACARA' },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Technologies',
        strands: [
          {
            name: 'Digital Technologies',
            substrands: [
              {
                name: 'Digital Systems and Data',
                codes: [
                  { id: 'actdik023', code: 'ACTDIK023', title: 'Investigate how data is transmitted and secured in wired, wireless and mobile networks', description: 'Students explore how digital systems communicate and how data is protected.', yearLevel: 'Year 7-8', subject: 'Digital Technologies', strand: 'Digital Technologies', substrand: 'Digital Systems and Data', learningArea: 'Technologies', framework: 'ACARA' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ib', name: 'International Baccalaureate (IB)', shortName: 'IB',
    learningAreas: [
      {
        name: 'Language and Literature',
        strands: [
          {
            name: 'Language in Cultural Context',
            substrands: [
              {
                name: 'Textual Analysis',
                codes: [
                  { id: 'lal_1_2', code: 'LAL.1.2', title: 'Language in Cultural Context — Textual Analysis', description: 'Students analyze how cultural contexts influence language use and meaning.', yearLevel: 'MYP Year 1-2', subject: 'Language and Literature', strand: 'Language in Cultural Context', substrand: 'Textual Analysis', learningArea: 'Language and Literature', framework: 'IB' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'common_core', name: 'Common Core State Standards', shortName: 'Common Core',
    learningAreas: [
      {
        name: 'English Language Arts',
        strands: [
          {
            name: 'Reading Literature',
            substrands: [
              {
                name: 'Key Ideas and Details',
                codes: [
                  { id: 'ccss_ela_rl_7_3', code: 'CCSS.ELA-LITERACY.RL.7.3', title: 'Analyze how particular elements of a story or drama interact', description: 'Analyze how particular elements of a story or drama interact (e.g., how setting shapes characters or plot).', yearLevel: 'Grade 7', subject: 'English Language Arts', strand: 'Reading Literature', substrand: 'Key Ideas and Details', learningArea: 'English Language Arts', framework: 'Common Core' },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// =============================================================================
// CASCADING CURRICULUM PICKER
// =============================================================================

function CurriculumPicker({ selected, onSelect, onRemove, suggestedLearningArea }: {
  selected: CurriculumStandardRef[];
  onSelect: (standard: CurriculumStandardRef) => void;
  onRemove: (id: string) => void;
  suggestedLearningArea?: string;
}) {
  const [framework, setFramework] = useState('');
  const [learningArea, setLearningArea] = useState('');
  const [strand, setStrand] = useState('');
  const [substrand, setSubstrand] = useState('');
  const [hasAutoSelected, setHasAutoSelected] = useState(false);

  // Auto-select framework and learning area based on competition format context
  useEffect(() => {
    if (suggestedLearningArea && !hasAutoSelected && !framework && selected.length === 0) {
      // Find the first framework that has this learning area
      const matchingFramework = CURRICULUM_FRAMEWORKS.find((f) =>
        f.learningAreas.some((la) => la.name === suggestedLearningArea)
      );
      if (matchingFramework) {
        setFramework(matchingFramework.id);
        setLearningArea(suggestedLearningArea);
        setHasAutoSelected(true);
      }
    }
  }, [suggestedLearningArea, hasAutoSelected, framework, selected.length]);

  // Reset auto-selection when suggested area changes (e.g. format changes)
  useEffect(() => {
    setHasAutoSelected(false);
  }, [suggestedLearningArea]);

  // Derive cascading options from selections
  const selectedFramework = CURRICULUM_FRAMEWORKS.find((f) => f.id === framework);
  const learningAreas = selectedFramework?.learningAreas ?? [];
  const selectedLA = learningAreas.find((la) => la.name === learningArea);
  const strands = selectedLA?.strands ?? [];
  const selectedStrand = strands.find((s) => s.name === strand);
  const substrands = selectedStrand?.substrands ?? [];
  const selectedSubstrand = substrands.find((ss) => ss.name === substrand);
  const codes = selectedSubstrand?.codes.filter((c) => !selected.some((s) => s.id === c.id)) ?? [];

  // Reset downstream when upstream changes
  const handleFrameworkChange = (val: string) => {
    setFramework(val);
    setLearningArea('');
    setStrand('');
    setSubstrand('');
  };

  const handleLearningAreaChange = (val: string) => {
    setLearningArea(val);
    setStrand('');
    setSubstrand('');
  };

  const handleStrandChange = (val: string) => {
    setStrand(val);
    setSubstrand('');
  };

  const handleSelectCode = (code: CurriculumCode) => {
    onSelect({
      id: code.id,
      code: code.code,
      framework: code.framework,
      learningArea: code.learningArea,
      subject: code.subject,
      yearLevels: [code.yearLevel],
      title: code.title,
      description: code.description,
    });
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium flex items-center gap-1.5">
        <GraduationCap className="h-4 w-4 text-primary" />
        Curriculum Alignment
        <span className="text-xs text-muted-foreground font-normal">(optional)</span>
      </label>

      {/* Selected standards */}
      {selected.length > 0 && (
        <div className="space-y-1.5">
          {selected.map((std) => (
            <div
              key={std.id}
              className="flex items-start gap-2 rounded-md border bg-primary/5 p-2 text-xs"
            >
              <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
              <div className="flex-1 min-w-0">
                <div className="font-medium">{std.code} — {std.title}</div>
                <div className="text-muted-foreground">
                  {std.learningArea} &middot; {std.subject} &middot; {std.yearLevels.join(', ')}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onRemove(std.id)}
                className="shrink-0 rounded-sm p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Cascading dropdowns */}
      {selected.length < 5 && (
        <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
          {/* Framework */}
          <Select value={framework} onValueChange={handleFrameworkChange}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder="Select framework..." />
            </SelectTrigger>
            <SelectContent>
              {CURRICULUM_FRAMEWORKS.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.shortName}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Learning Area */}
          {framework && (
            <Select value={learningArea} onValueChange={handleLearningAreaChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select learning area..." />
              </SelectTrigger>
              <SelectContent>
                {learningAreas.map((la) => (
                  <SelectItem key={la.name} value={la.name}>{la.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Strand */}
          {learningArea && (
            <Select value={strand} onValueChange={handleStrandChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select strand..." />
              </SelectTrigger>
              <SelectContent>
                {strands.map((s) => (
                  <SelectItem key={s.name} value={s.name}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Substrand */}
          {strand && (
            <Select value={substrand} onValueChange={setSubstrand}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select substrand..." />
              </SelectTrigger>
              <SelectContent>
                {substrands.map((ss) => (
                  <SelectItem key={ss.name} value={ss.name}>{ss.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Content descriptors */}
          {substrand && codes.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-medium text-muted-foreground">Select a content descriptor:</p>
              {codes.map((code) => (
                <button
                  key={code.id}
                  type="button"
                  onClick={() => handleSelectCode(code)}
                  className="w-full text-left rounded-md border bg-background p-2.5 hover:border-primary hover:bg-primary/5 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <BookOpen className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                    <div>
                      <div className="text-xs font-medium">{code.code} — {code.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{code.yearLevel}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {substrand && codes.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              All content descriptors in this substrand have been added.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// AI-generated competition suggestions based on a teacher's description
const AI_SUGGESTIONS: Record<string, {
  title: string;
  format: string;
  description: string;
  maxParticipants: number;
  durationMinutes: number;
  alignments: CurriculumStandardRef[];
}> = {
  'phonics': {
    title: 'Foundation Phonics Duel — Letter Sounds',
    format: 'PHONICS_DUEL',
    description: 'Students compete to identify and blend letter sounds. Focus on CVC words and initial sound recognition.',
    maxParticipants: 20,
    durationMinutes: 15,
    alignments: [
      { id: 'acela1429', code: 'ACELA1429', framework: 'ACARA', learningArea: 'English', subject: 'English', yearLevels: ['Foundation'], title: 'Recognise and name all upper and lower case letters and the most common sound that each letter represents' },
    ],
  },
  'reading': {
    title: 'Year 3-4 Reading Fluency Sprint',
    format: 'READING_SPRINT',
    description: 'Timed reading challenge focused on fluency and comprehension. Students read passages and answer questions.',
    maxParticipants: 30,
    durationMinutes: 20,
    alignments: [
      { id: 'acely1656', code: 'ACELY1656', framework: 'ACARA', learningArea: 'English', subject: 'English', yearLevels: ['Year 3-4'], title: 'Use comprehension strategies to build literal and inferred meaning and begin to evaluate texts' },
    ],
  },
  'spelling': {
    title: 'Year 2-3 Spelling Bee — Blends & Digraphs',
    format: 'SPELLING_BEE',
    description: 'Competitive spelling challenge focusing on blends, digraphs, and common word patterns.',
    maxParticipants: 25,
    durationMinutes: 20,
    alignments: [
      { id: 'acela1462', code: 'ACELA1462', framework: 'ACARA', learningArea: 'English', subject: 'English', yearLevels: ['Year 2-3'], title: 'Understand how to apply knowledge of letter-sound relationships, syllables, and blending and segmenting' },
    ],
  },
  'comprehension': {
    title: 'Year 7 Literature Comprehension Quiz',
    format: 'COMPREHENSION_QUIZ',
    description: 'Students analyse literary texts, identifying how characterisation, events and settings combine in narratives.',
    maxParticipants: 30,
    durationMinutes: 30,
    alignments: [
      { id: 'acelt1620', code: 'ACELT1620', framework: 'ACARA', learningArea: 'English', subject: 'English', yearLevels: ['Year 7'], title: 'Recognise and analyse the ways that characterisation, events and settings are combined in narratives' },
    ],
  },
  'vocabulary': {
    title: 'Word Blitz — Vocabulary Expansion',
    format: 'WORD_BLITZ',
    description: 'Fast-paced word identification challenge. Students match words to definitions and use context clues.',
    maxParticipants: 30,
    durationMinutes: 15,
    alignments: [
      { id: 'acela1472', code: 'ACELA1472', framework: 'ACARA', learningArea: 'English', subject: 'English', yearLevels: ['Year 3-4'], title: 'Understand how to use phonic knowledge to read and write words including complex letter patterns' },
    ],
  },
  'maths': {
    title: 'Year 7 Integer Operations Challenge',
    format: 'ACCURACY_CHALLENGE',
    description: 'Students solve integer addition and subtraction problems with increasing difficulty.',
    maxParticipants: 30,
    durationMinutes: 20,
    alignments: [
      { id: 'acmna280', code: 'ACMNA280', framework: 'ACARA', learningArea: 'Mathematics', subject: 'Mathematics', yearLevels: ['Year 7'], title: 'Solve problems involving addition and subtraction of integers' },
    ],
  },
};

// Formats mapped to relevant learning areas for context-aware curriculum filtering
const FORMAT_LEARNING_AREA_HINTS: Record<string, string> = {
  READING_SPRINT: 'English',
  ACCURACY_CHALLENGE: 'English',
  COMPREHENSION_QUIZ: 'English',
  WORD_BLITZ: 'English',
  PHONICS_DUEL: 'English',
  SPELLING_BEE: 'English',
  VOCABULARY_CHALLENGE: 'English',
  STORY_SHOWDOWN: 'English',
  TEAM_RELAY: '',
  COLLABORATIVE_CREATION: '',
};

function CreateCompetitionDialog({ onCreated }: { onCreated: (comp: ArenaCompetition) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'choose' | 'ai' | 'manual'>('choose');
  const [creating, setCreating] = useState(false);

  // Manual form state
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState('READING_SPRINT');
  const [description, setDescription] = useState('');
  const [maxParticipants, setMaxParticipants] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [curriculumAlignments, setCurriculumAlignments] = useState<CurriculumStandardRef[]>([]);

  // AI mode state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<typeof AI_SUGGESTIONS[string] | null>(null);

  function resetForm() {
    setMode('choose');
    setTitle('');
    setFormat('READING_SPRINT');
    setDescription('');
    setMaxParticipants(20);
    setDurationMinutes(30);
    setCurriculumAlignments([]);
    setAiPrompt('');
    setAiSuggestion(null);
    setAiGenerating(false);
  }

  async function handleAiGenerate() {
    if (!aiPrompt.trim()) return;
    setAiGenerating(true);

    // Simulate AI processing — match keywords to suggestions
    await new Promise((r) => setTimeout(r, 1500));
    const prompt = aiPrompt.toLowerCase();
    let suggestion = AI_SUGGESTIONS['reading']; // default
    if (prompt.includes('phonics') || prompt.includes('letter') || prompt.includes('sound')) {
      suggestion = AI_SUGGESTIONS['phonics'];
    } else if (prompt.includes('spell') || prompt.includes('blend') || prompt.includes('digraph')) {
      suggestion = AI_SUGGESTIONS['spelling'];
    } else if (prompt.includes('comprehension') || prompt.includes('literature') || prompt.includes('analy')) {
      suggestion = AI_SUGGESTIONS['comprehension'];
    } else if (prompt.includes('vocab') || prompt.includes('word')) {
      suggestion = AI_SUGGESTIONS['vocabulary'];
    } else if (prompt.includes('math') || prompt.includes('number') || prompt.includes('integer') || prompt.includes('algebra')) {
      suggestion = AI_SUGGESTIONS['maths'];
    }
    setAiSuggestion(suggestion);
    setAiGenerating(false);
  }

  function acceptAiSuggestion() {
    if (!aiSuggestion) return;
    setTitle(aiSuggestion.title);
    setFormat(aiSuggestion.format);
    setDescription(aiSuggestion.description);
    setMaxParticipants(aiSuggestion.maxParticipants);
    setDurationMinutes(aiSuggestion.durationMinutes);
    setCurriculumAlignments(aiSuggestion.alignments);
    setMode('manual'); // Switch to manual mode to allow editing
  }

  async function handleCreate() {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await arenaApi.createCompetition({
        title: title.trim(),
        format,
        description: description.trim() || undefined,
        config: { scoringModel: 'GROWTH_BASED', maxParticipants, durationMinutes },
        curriculumAlignments: curriculumAlignments.length > 0 ? curriculumAlignments : undefined,
      });
      if (res.success && res.data) {
        onCreated(res.data);
        resetForm();
        setOpen(false);
      }
    } catch {
      // Creation failed
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Competition
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto">
        {/* Mode: Choose */}
        {mode === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle>Create a Competition</DialogTitle>
              <DialogDescription>
                Choose how you&apos;d like to create your competition.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <button
                type="button"
                onClick={() => setMode('ai')}
                className="flex items-start gap-4 rounded-lg border-2 border-primary/20 bg-primary/5 p-4 text-left hover:border-primary/40 transition-colors"
              >
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-sm">AI-Assisted</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Describe what you need and AI will suggest the format, curriculum alignment, and settings.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
              </button>
              <button
                type="button"
                onClick={() => setMode('manual')}
                className="flex items-start gap-4 rounded-lg border p-4 text-left hover:border-primary/30 transition-colors"
              >
                <div className="rounded-lg bg-muted p-2.5">
                  <Swords className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <div className="font-semibold text-sm">Create Manually</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose the format, align to curriculum standards, and configure all settings yourself.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-muted-foreground" />
              </button>
            </div>
          </>
        )}

        {/* Mode: AI-Assisted */}
        {mode === 'ai' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Assisted Creation
              </DialogTitle>
              <DialogDescription>
                Describe the competition you want and AI will build it for you — including curriculum alignment.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">What kind of competition do you need?</label>
                <Textarea
                  placeholder="e.g. I need a phonics competition for my Year 1 class focusing on blending CVC words..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>

              {!aiSuggestion && (
                <Button
                  onClick={handleAiGenerate}
                  disabled={aiGenerating || !aiPrompt.trim()}
                  className="w-full"
                >
                  {aiGenerating ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Generate Competition</>
                  )}
                </Button>
              )}

              {/* AI Suggestion Preview */}
              {aiSuggestion && (
                <div className="rounded-lg border bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    AI Suggestion
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{aiSuggestion.title}</div>
                    <p className="text-xs text-muted-foreground mt-1">{aiSuggestion.description}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {FORMAT_LABELS[aiSuggestion.format] || aiSuggestion.format}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {aiSuggestion.maxParticipants} participants
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {aiSuggestion.durationMinutes} min
                    </Badge>
                  </div>
                  {aiSuggestion.alignments.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" /> Curriculum Alignment
                      </p>
                      {aiSuggestion.alignments.map((a) => (
                        <div key={a.id} className="text-xs rounded-md bg-background border p-2">
                          <span className="font-medium">{a.code}</span> — {a.title}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button onClick={acceptAiSuggestion} size="sm" className="flex-1">
                      Accept & Customise
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setAiSuggestion(null); setAiPrompt(''); }}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>Back</Button>
            </DialogFooter>
          </>
        )}

        {/* Mode: Manual */}
        {mode === 'manual' && (
          <>
            <DialogHeader>
              <DialogTitle>Create a Competition</DialogTitle>
              <DialogDescription>
                Configure your competition and align it to curriculum outcomes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Title</label>
                <Input
                  placeholder="e.g. Year 4 Reading Sprint"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Format</label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (optional)</label>
                <Textarea
                  placeholder="Describe the competition..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Context-aware Curriculum Alignment Picker */}
              <CurriculumPicker
                selected={curriculumAlignments}
                onSelect={(std) => setCurriculumAlignments((prev) => [...prev, std])}
                onRemove={(id) => setCurriculumAlignments((prev) => prev.filter((s) => s.id !== id))}
                suggestedLearningArea={FORMAT_LEARNING_AREA_HINTS[format]}
              />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Max Participants</label>
                  <Input
                    type="number"
                    min={2}
                    max={100}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input
                    type="number"
                    min={5}
                    max={120}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:gap-0">
              <Button variant="ghost" size="sm" onClick={() => setMode('choose')}>Back</Button>
              <Button onClick={handleCreate} disabled={creating || !title.trim()}>
                {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                Create
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState<ArenaCompetition[]>([]);
  const [userStats, setUserStats] = useState<UserCompetitionStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const [compsRes, statsRes] = await Promise.all([
          arenaApi.listCompetitions(),
          arenaApi.getUserStats(),
        ]);

        if (compsRes.success) {
          setCompetitions(compsRes.data?.competitions ?? []);
        }
        if (statsRes.success) {
          setUserStats(statsRes.data);
        }
      } catch (err) {
        console.error('Failed to load competitions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const intelligence = useArenaIntelligence({
    context: 'competitions',
    competitions,
    userStats,
  });

  // Filtered competitions
  const filteredCompetitions = useMemo(() => {
    let result = [...competitions];

    if (formatFilter !== 'all') {
      result = result.filter((c) => c.format === formatFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter((c) => c.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(query) ||
          (c.description && c.description.toLowerCase().includes(query))
      );
    }

    return result;
  }, [competitions, formatFilter, statusFilter, searchQuery]);

  // Derived stats
  const winRate =
    userStats && userStats.totalCompetitions > 0
      ? Math.round((userStats.wins / userStats.totalCompetitions) * 100)
      : 0;

  const bestFormatLabel = userStats?.bestFormat
    ? FORMAT_LABELS[userStats.bestFormat] ?? userStats.bestFormat
    : 'N/A';

  return (
    <div className="space-y-6">
      {/* Page Header with Breadcrumb */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/arena">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Arena
          </Link>
        </Button>
        <PageHeader
          title="Competitions"
          description="Challenge yourself and your classmates"
          actions={
            <CreateCompetitionDialog onCreated={(comp) => setCompetitions((prev) => [comp, ...prev])} />
          }
        />
      </div>

      {/* Arena Insight Panel */}
      {!loading && (
        <ArenaInsightPanel
          insights={intelligence.insights}
          recommendations={intelligence.recommendations}
        />
      )}

      {/* User Stats Banner */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-6 w-16 rounded bg-muted animate-pulse" />
                    <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            label="Total Wins"
            value={userStats?.wins ?? 0}
            icon={Trophy}
            variant="success"
            subtitle={`out of ${userStats?.totalCompetitions ?? 0} competitions`}
          />
          <StatsCard
            label="Average Score"
            value={userStats?.avgScore?.toFixed(1) ?? '0'}
            icon={BarChart3}
            variant="primary"
            subtitle="across all competitions"
          />
          <StatsCard
            label="Best Format"
            value={bestFormatLabel}
            icon={Target}
            variant="warning"
            subtitle="your strongest category"
          />
          <StatsCard
            label="Win Rate"
            value={`${winRate}%`}
            icon={Flame}
            variant={winRate >= 50 ? 'success' : 'error'}
            subtitle={
              userStats && userStats.activeCompetitions > 0
                ? `${userStats.activeCompetitions} active now`
                : 'no active competitions'
            }
          />
        </div>
      )}

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search competitions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={formatFilter} onValueChange={setFormatFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Format" />
                </SelectTrigger>
                <SelectContent>
                  {FORMAT_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          {(formatFilter !== 'all' || statusFilter !== 'all' || searchQuery.trim()) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                {filteredCompetitions.length} result{filteredCompetitions.length !== 1 ? 's' : ''}
              </span>
              {formatFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {FORMAT_OPTIONS.find((f) => f.value === formatFilter)?.label}
                  <button
                    onClick={() => setFormatFilter('all')}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear format filter"
                  >
                    x
                  </button>
                </Badge>
              )}
              {statusFilter !== 'all' && (
                <Badge variant="secondary" className="text-xs">
                  {STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label}
                  <button
                    onClick={() => setStatusFilter('all')}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear status filter"
                  >
                    x
                  </button>
                </Badge>
              )}
              {searchQuery.trim() && (
                <Badge variant="secondary" className="text-xs">
                  &quot;{searchQuery}&quot;
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-1 hover:text-foreground"
                    aria-label="Clear search"
                  >
                    x
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-auto py-1 px-2"
                onClick={() => {
                  setFormatFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Competition Grid */}
      {loading ? (
        <CompetitionGridSkeleton />
      ) : filteredCompetitions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompetitions.map((comp) => (
            <CompetitionCard key={comp.id} competition={comp} />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Swords className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
            <p className="font-semibold">No competitions match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your filters or search query to find competitions.
            </p>
            <div className="flex items-center justify-center gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFormatFilter('all');
                  setStatusFilter('all');
                  setSearchQuery('');
                }}
              >
                Clear Filters
              </Button>
              <CreateCompetitionDialog onCreated={(comp) => setCompetitions((prev) => [comp, ...prev])} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
