'use client';

/**
 * AI Content Studio
 * AI-powered educational content generation with rich editing and library management
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  FileText,
  Wand2,
  Loader2,
  BookOpen,
  PenTool,
  Presentation,
  ClipboardCheck,
  RefreshCw,
  Copy,
  Check,
  Save,
  Download,
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  AlignLeft,
  AlignCenter,
  Link as LinkIcon,
  Eye,
  Edit3,
  FolderPlus,
  GraduationCap,
  Users,
  Layers,
  Settings2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';

// Types
interface GeneratedContent {
  id: string;
  title: string;
  content: string;
  type: 'lesson' | 'assessment' | 'worksheet' | 'slides';
  topic: string;
  yearLevel: string;
  curriculumCode: string;
  pedagogy: string;
  differentiation: string[];
  createdAt: Date;
}

// Year level options for Australian curriculum
const YEAR_LEVELS = [
  'Foundation',
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  'Year 7',
  'Year 8',
  'Year 9',
  'Year 10',
  'Year 11',
  'Year 12',
];

// Pedagogy styles
const PEDAGOGY_STYLES = [
  { value: 'direct', label: 'Direct Instruction', description: 'Structured, teacher-led approach' },
  { value: 'inquiry', label: 'Inquiry-Based Learning', description: 'Student-driven exploration' },
  { value: 'pbl', label: 'Project-Based Learning', description: 'Real-world project focus' },
  { value: 'collaborative', label: 'Collaborative Learning', description: 'Group work emphasis' },
  { value: 'differentiated', label: 'Differentiated Instruction', description: 'Tailored to learner needs' },
  { value: 'flipped', label: 'Flipped Classroom', description: 'Pre-learning with in-class practice' },
];

// Differentiation levels
const DIFFERENTIATION_LEVELS = [
  { value: 'below', label: 'Below Level', color: 'bg-amber-500' },
  { value: 'at', label: 'At Level', color: 'bg-green-500' },
  { value: 'above', label: 'Above Level', color: 'bg-blue-500' },
  { value: 'extension', label: 'Extension', color: 'bg-purple-500' },
];

// Output types
const OUTPUT_TYPES = [
  { value: 'lesson', label: 'Lesson Plan', icon: BookOpen, color: 'text-blue-500' },
  { value: 'assessment', label: 'Assessment', icon: ClipboardCheck, color: 'text-green-500' },
  { value: 'worksheet', label: 'Worksheet', icon: PenTool, color: 'text-amber-500' },
  { value: 'slides', label: 'Slides', icon: Presentation, color: 'text-purple-500' },
];

// Stats
const STATS = [
  { label: 'Content Generated', value: '342', icon: FileText, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' },
  { label: 'Saved to Library', value: '189', icon: FolderPlus, color: 'bg-green-100 dark:bg-green-900/30 text-green-600' },
  { label: 'Avg. Generation Time', value: '8.2s', icon: Sparkles, color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' },
  { label: 'Quality Score', value: '94%', icon: Check, color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' },
];

// Sample curriculum codes
const CURRICULUM_CODES = [
  { code: 'ACMNA001', subject: 'Mathematics', strand: 'Number and Algebra' },
  { code: 'ACSSU001', subject: 'Science', strand: 'Science Understanding' },
  { code: 'ACELA001', subject: 'English', strand: 'Language' },
  { code: 'ACHHS001', subject: 'History', strand: 'Historical Skills' },
  { code: 'ACHASSK001', subject: 'HASS', strand: 'Inquiry and Skills' },
];

export default function AIStudioPage() {
  // Form state
  const [topic, setTopic] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [curriculumCode, setCurriculumCode] = useState('');
  const [outputType, setOutputType] = useState<'lesson' | 'assessment' | 'worksheet' | 'slides'>('lesson');
  const [pedagogy, setPedagogy] = useState('direct');
  const [differentiationLevels, setDifferentiationLevels] = useState<string[]>(['at']);

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // Editor state
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Recent generations
  const [recentGenerations] = useState<GeneratedContent[]>([
    {
      id: '1',
      title: 'Fractions Introduction Lesson',
      content: '...',
      type: 'lesson',
      topic: 'Introduction to Fractions',
      yearLevel: 'Year 4',
      curriculumCode: 'ACMNA077',
      pedagogy: 'direct',
      differentiation: ['at', 'below'],
      createdAt: new Date(Date.now() - 3600000),
    },
    {
      id: '2',
      title: 'Water Cycle Assessment',
      content: '...',
      type: 'assessment',
      topic: 'The Water Cycle',
      yearLevel: 'Year 5',
      curriculumCode: 'ACSSU077',
      pedagogy: 'inquiry',
      differentiation: ['at', 'above'],
      createdAt: new Date(Date.now() - 7200000),
    },
  ]);

  // Toggle differentiation level
  const toggleDifferentiation = (level: string) => {
    setDifferentiationLevels((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  // Generate content
  const handleGenerate = async () => {
    if (!topic.trim() || !yearLevel || !outputType) return;

    setIsGenerating(true);
    setGenerationProgress(0);
    setGeneratedContent(null);

    // Simulate generation progress
    const progressInterval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    // Simulate AI generation
    await new Promise((resolve) => setTimeout(resolve, 3000));

    clearInterval(progressInterval);
    setGenerationProgress(100);

    // Generate content based on type
    const contentTemplates: Record<string, string> = {
      lesson: `# ${topic} - Lesson Plan

## Learning Intentions
By the end of this lesson, students will be able to:
- Understand the key concepts of ${topic}
- Apply knowledge through practical activities
- Demonstrate understanding through formative assessment

## Success Criteria
Students can:
- [ ] Explain ${topic} in their own words
- [ ] Complete the guided practice activity
- [ ] Answer reflection questions

## Australian Curriculum Links
**Code:** ${curriculumCode || 'ACMNA001'}
**Year Level:** ${yearLevel}
**Strand:** Number and Algebra

## Resources Required
- Interactive whiteboard
- Student workbooks
- Manipulatives
- Exit ticket templates

## Lesson Structure

### Introduction (10 minutes)
Begin with an engaging hook related to ${topic}. Use questioning to activate prior knowledge.

**Key Questions:**
- What do you already know about ${topic}?
- Where might you see ${topic} in real life?

### Explicit Teaching (15 minutes)
Introduce the key concepts using the I Do, We Do, You Do model.

**Key Vocabulary:**
- Term 1: Definition
- Term 2: Definition

### Guided Practice (15 minutes)
Students work in pairs to complete structured activities.

${differentiationLevels.includes('below') ? `
**Support (Below Level):**
- Simplified task with scaffolding
- Visual supports provided
` : ''}

${differentiationLevels.includes('at') ? `
**Core (At Level):**
- Standard activity aligned to curriculum
` : ''}

${differentiationLevels.includes('above') ? `
**Challenge (Above Level):**
- Extended problem-solving task
` : ''}

${differentiationLevels.includes('extension') ? `
**Extension:**
- Open-ended investigation
- Cross-curricular connections
` : ''}

### Independent Practice (10 minutes)
Students complete individual work to consolidate learning.

### Reflection and Closure (5 minutes)
- Exit ticket: 3 things learned, 2 connections, 1 question
- Preview next lesson

## Assessment
- Observation notes
- Exit ticket analysis
- Work sample collection`,

      assessment: `# ${topic} - Assessment Task

## Task Overview
**Year Level:** ${yearLevel}
**Curriculum Code:** ${curriculumCode || 'ACMNA001'}
**Duration:** 45 minutes
**Conditions:** Individual, closed book

## Learning Outcomes Assessed
This assessment measures student achievement against the following outcomes:
- Understanding of ${topic} concepts
- Application of skills in new contexts
- Analysis and problem-solving abilities

---

## Section A: Multiple Choice (20 marks)

**Instructions:** Circle the best answer for each question.

**Q1.** Which of the following best describes ${topic}?
   a) Option A
   b) Option B
   c) Option C (correct)
   d) Option D
   [2 marks]

**Q2.** When working with ${topic}, which approach is most effective?
   a) Option A
   b) Option B (correct)
   c) Option C
   d) Option D
   [2 marks]

[Continue with 8 more multiple choice questions...]

---

## Section B: Short Response (30 marks)

**Instructions:** Answer each question in the space provided.

**Q11.** Explain the relationship between ${topic} and its real-world applications. (6 marks)

_________________________________________
_________________________________________
_________________________________________

**Q12.** Describe three key features of ${topic}. (6 marks)

_________________________________________
_________________________________________
_________________________________________

---

## Section C: Extended Response (20 marks)

**Q15.** Analyse the following scenario and apply your understanding of ${topic} to solve the problem. Show all working.

[Scenario description here]

---

## Marking Rubric

| Criteria | Excellent (5) | Proficient (4) | Developing (3) | Beginning (2) |
|----------|---------------|----------------|----------------|---------------|
| Understanding | Complete grasp | Good grasp | Partial grasp | Limited grasp |
| Application | Sophisticated | Competent | Basic | Emerging |
| Communication | Clear, precise | Clear | Adequate | Unclear |`,

      worksheet: `# ${topic} - Student Worksheet

**Name:** _________________________ **Date:** _____________

**Year Level:** ${yearLevel}
**Curriculum Code:** ${curriculumCode || 'ACMNA001'}

---

## Learning Goal
Today I am learning about ${topic}.

I will be successful when I can:
- [ ] ________________________________
- [ ] ________________________________
- [ ] ________________________________

---

## Warm-Up Activity

Complete the following to activate your prior knowledge:

1. What do you already know about ${topic}?
   _________________________________________

2. Write or draw something related to ${topic}:

   [Box for drawing/writing]

---

## Guided Practice

Work through these examples with your teacher:

**Example 1:**
[Space for guided example]

**Example 2:**
[Space for guided example]

---

## Independent Practice

${differentiationLevels.includes('below') ? `
### Support Level
Complete questions 1-5:

1. ________________________________
2. ________________________________
3. ________________________________
4. ________________________________
5. ________________________________
` : ''}

${differentiationLevels.includes('at') ? `
### Core Level
Complete questions 1-10:

1. ________________________________
2. ________________________________
3. ________________________________
4. ________________________________
5. ________________________________
6. ________________________________
7. ________________________________
8. ________________________________
9. ________________________________
10. ________________________________
` : ''}

${differentiationLevels.includes('above') ? `
### Challenge Level
Complete questions 1-10, then attempt the challenge problem:

**Challenge:**
________________________________
________________________________
________________________________
` : ''}

---

## Reflection

**What I learned today:**
_________________________________________

**What I found challenging:**
_________________________________________

**Questions I still have:**
_________________________________________

---

**Self-Assessment:** How confident do I feel? (Circle one)

[ ] Very confident  [ ] Somewhat confident  [ ] Need more practice`,

      slides: `# ${topic}
## Presentation Slides

---

## Slide 1: Title
# ${topic}
**${yearLevel}**
Curriculum Code: ${curriculumCode || 'ACMNA001'}

---

## Slide 2: Learning Intentions
## Today We Will Learn...

- Key concept 1 about ${topic}
- Key concept 2 about ${topic}
- Key concept 3 about ${topic}

---

## Slide 3: Success Criteria
## I Can...

- [ ] Explain ${topic} in my own words
- [ ] Apply my understanding to solve problems
- [ ] Connect ${topic} to real-world situations

---

## Slide 4: Hook/Engagement
## Did You Know?

[Interesting fact or question about ${topic}]

**Think-Pair-Share:**
What do you already know about ${topic}?

---

## Slide 5: Key Concept 1
## Understanding ${topic}

**Definition:**
[Clear, student-friendly definition]

**Visual:**
[Diagram or image placeholder]

---

## Slide 6: Key Concept 2
## How It Works

**Step 1:** Description
**Step 2:** Description
**Step 3:** Description

[Visual representation]

---

## Slide 7: Worked Example
## Let's Try Together

**Problem:**
[Example problem]

**Solution:**
[Step-by-step solution with annotations]

---

## Slide 8: Your Turn
## Practice Time

Work with your partner to solve:
[Practice problem]

**Remember:**
- Key tip 1
- Key tip 2

---

## Slide 9: Real-World Connection
## Where Do We See This?

[Real-world examples of ${topic}]

- Example 1
- Example 2
- Example 3

---

## Slide 10: Summary
## What We Learned

1. Key takeaway 1
2. Key takeaway 2
3. Key takeaway 3

**Next Lesson:** Preview of what's coming

---

## Slide 11: Exit Ticket
## Before You Go...

Write down:
- 1 thing you learned
- 1 question you still have

**Submit your exit ticket!**`,
    };

    const newContent: GeneratedContent = {
      id: Date.now().toString(),
      title: `${topic} - ${OUTPUT_TYPES.find((t) => t.value === outputType)?.label}`,
      content: contentTemplates[outputType],
      type: outputType,
      topic,
      yearLevel,
      curriculumCode,
      pedagogy,
      differentiation: differentiationLevels,
      createdAt: new Date(),
    };

    setGeneratedContent(newContent);
    setEditedContent(newContent.content);
    setIsGenerating(false);
  };

  // Copy to clipboard
  const copyToClipboard = () => {
    const content = isEditing ? editedContent : generatedContent?.content;
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Save to library
  const saveToLibrary = () => {
    // In a real app, this would save to the backend
    setShowSaveDialog(true);
    setTimeout(() => setShowSaveDialog(false), 2000);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-purple-500" />
            AI Content Studio
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate curriculum-aligned educational content with AI
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <GraduationCap className="w-3 h-3 mr-1" />
          Australian Curriculum
        </Badge>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', stat.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </motion.div>

      {/* Main Content */}
      <motion.div variants={itemVariants}>
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Input Panel */}
          <div className="lg:col-span-2 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="w-5 h-5" />
                  Content Configuration
                </CardTitle>
                <CardDescription>
                  Configure the content generation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Topic Input */}
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic *</Label>
                  <Input
                    id="topic"
                    placeholder="e.g., Introduction to Fractions"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  />
                </div>

                {/* Year Level */}
                <div className="space-y-2">
                  <Label>Year Level *</Label>
                  <Select value={yearLevel} onValueChange={setYearLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year level" />
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

                {/* Curriculum Code */}
                <div className="space-y-2">
                  <Label htmlFor="curriculum">Curriculum Code (Optional)</Label>
                  <Input
                    id="curriculum"
                    placeholder="e.g., ACMNA001"
                    value={curriculumCode}
                    onChange={(e) => setCurriculumCode(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-1 mt-1">
                    {CURRICULUM_CODES.slice(0, 3).map((code) => (
                      <Badge
                        key={code.code}
                        variant="outline"
                        className="cursor-pointer hover:bg-muted"
                        onClick={() => setCurriculumCode(code.code)}
                      >
                        {code.code}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Output Type */}
                <div className="space-y-2">
                  <Label>Output Type *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {OUTPUT_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <Button
                          key={type.value}
                          variant={outputType === type.value ? 'default' : 'outline'}
                          className={cn(
                            'flex flex-col items-center py-4 h-auto',
                            outputType === type.value && 'ring-2 ring-primary'
                          )}
                          onClick={() => setOutputType(type.value as typeof outputType)}
                        >
                          <Icon className={cn('w-5 h-5 mb-1', type.color)} />
                          <span className="text-xs">{type.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </div>

                {/* Pedagogy Style */}
                <div className="space-y-2">
                  <Label>Pedagogy Style</Label>
                  <Select value={pedagogy} onValueChange={setPedagogy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PEDAGOGY_STYLES.map((style) => (
                        <SelectItem key={style.value} value={style.value}>
                          <div>
                            <div className="font-medium">{style.label}</div>
                            <div className="text-xs text-muted-foreground">{style.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Differentiation Levels */}
                <div className="space-y-2">
                  <Label>Differentiation Levels</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {DIFFERENTIATION_LEVELS.map((level) => (
                      <div
                        key={level.value}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                          differentiationLevels.includes(level.value)
                            ? 'bg-primary/10 border-primary'
                            : 'hover:bg-muted'
                        )}
                        onClick={() => toggleDifferentiation(level.value)}
                      >
                        <div className={cn('w-3 h-3 rounded-full', level.color)} />
                        <span className="text-sm">{level.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Generate Button */}
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={isGenerating || !topic.trim() || !yearLevel}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4 mr-2" />
                      Generate Content
                    </>
                  )}
                </Button>

                {/* Generation Progress */}
                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={generationProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {generationProgress < 30 && 'Analysing curriculum alignment...'}
                      {generationProgress >= 30 && generationProgress < 60 && 'Generating content structure...'}
                      {generationProgress >= 60 && generationProgress < 90 && 'Applying differentiation...'}
                      {generationProgress >= 90 && 'Finalising content...'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Generations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Recent Generations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recentGenerations.map((item) => {
                  const typeInfo = OUTPUT_TYPES.find((t) => t.value === item.type);
                  const Icon = typeInfo?.icon || FileText;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-lg border hover:bg-muted cursor-pointer"
                    >
                      <Icon className={cn('w-4 h-4', typeInfo?.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.yearLevel} - {new Date(item.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Output Panel */}
          <div className="lg:col-span-3">
            <Card className="h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {generatedContent ? (
                      <>
                        {isEditing ? (
                          <Edit3 className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Eye className="w-5 h-5 text-green-500" />
                        )}
                        {isEditing ? 'Edit Mode' : 'Preview'}
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Generated Content
                      </>
                    )}
                  </CardTitle>
                  {generatedContent && (
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">
                        {OUTPUT_TYPES.find((t) => t.value === generatedContent.type)?.label}
                      </Badge>
                      <Badge variant="outline">{generatedContent.yearLevel}</Badge>
                    </div>
                  )}
                </div>
                {generatedContent && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(!isEditing);
                        if (!isEditing) {
                          setEditedContent(generatedContent.content);
                        }
                      }}
                    >
                      {isEditing ? (
                        <>
                          <Eye className="w-4 h-4 mr-1" />
                          Preview
                        </>
                      ) : (
                        <>
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleGenerate}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                      {copied ? (
                        <Check className="w-4 h-4 text-green-500" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button size="sm" onClick={saveToLibrary}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                    <Loader2 className="w-12 h-12 animate-spin mb-4 text-primary" />
                    <p className="font-medium">Generating your content...</p>
                    <p className="text-sm mt-1">This usually takes 5-10 seconds</p>
                  </div>
                ) : generatedContent ? (
                  <div className="space-y-4">
                    {/* Editor Toolbar (when editing) */}
                    {isEditing && (
                      <div className="flex items-center gap-1 p-2 border rounded-lg bg-muted/50">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Bold className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Italic className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Heading1 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <Heading2 className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <List className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <ListOrdered className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <AlignLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <AlignCenter className="w-4 h-4" />
                        </Button>
                        <div className="w-px h-6 bg-border mx-1" />
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <LinkIcon className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    {/* Content Area */}
                    <div className="h-[500px] overflow-y-auto">
                      {isEditing ? (
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="min-h-[480px] font-mono text-sm resize-none"
                        />
                      ) : (
                        <pre className="whitespace-pre-wrap text-sm font-mono bg-muted p-4 rounded-lg">
                          {generatedContent.content}
                        </pre>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                    <Wand2 className="w-12 h-12 mb-4" />
                    <p className="font-medium">No content generated yet</p>
                    <p className="text-sm mt-1">
                      Configure your settings and click "Generate Content"
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </motion.div>

      {/* Save Success Toast */}
      {showSaveDialog && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2"
        >
          <Check className="w-5 h-5" />
          <span>Saved to resource library!</span>
        </motion.div>
      )}
    </motion.div>
  );
}
