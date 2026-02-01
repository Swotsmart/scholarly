'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Share2,
  Edit,
  Trash2,
  Calendar,
  Tag,
  BookOpen,
  MessageSquare,
  Sparkles,
  Eye,
  EyeOff,
  Link as LinkIcon,
  Copy,
  FileText,
  Image,
  Video,
  Code,
  Presentation,
  Palette,
  Globe,
  Lock,
  Users,
  ThumbsUp,
  Send,
  Lightbulb,
  ArrowRight,
  Clock,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Type icons mapping
const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  image: Image,
  video: Video,
  code: Code,
  presentation: Presentation,
  design: Palette,
};

const typeColor: Record<string, string> = {
  document: 'blue',
  image: 'pink',
  video: 'red',
  code: 'emerald',
  presentation: 'amber',
  design: 'violet',
};

// Mock artifact data
const artifactData = {
  id: 'art-1',
  title: 'Climate Change Research Paper',
  type: 'document',
  description: 'A comprehensive analysis of climate change impacts on coastal ecosystems with data-driven conclusions and actionable recommendations.',
  content: '/placeholder-document.pdf',
  thumbnailUrl: '/placeholder-document-thumb.jpg',
  createdAt: 'Feb 8, 2024',
  updatedAt: 'Feb 10, 2024',
  fileSize: '2.4 MB',
  visibility: 'public',
  views: 45,

  // Metadata
  tags: ['science', 'research', 'environment', 'climate'],
  curriculumAlignment: [
    { standard: 'NGSS', code: 'HS-ESS3-5', description: 'Analyze geoscience data and the results from global climate models' },
    { standard: 'IB', code: 'ESS 7.2', description: 'Climate change - causes and effects' },
  ],
  learningGoals: [
    { id: 'goal-1', title: 'Master Environmental Science Research', progress: 75 },
  ],

  // Comments
  comments: [
    {
      id: 'comment-1',
      author: 'Ms. Johnson',
      role: 'teacher',
      avatar: '/avatars/teacher-1.jpg',
      content: 'Excellent research methodology! Your data analysis is particularly strong. Consider expanding on the policy implications in your next revision.',
      date: 'Feb 11, 2024',
      liked: true,
    },
    {
      id: 'comment-2',
      author: 'Parent',
      role: 'parent',
      avatar: '/avatars/parent-1.jpg',
      content: 'So proud of your work on this topic! The presentation was very professional.',
      date: 'Feb 10, 2024',
      liked: false,
    },
  ],

  // Related artifacts
  relatedArtifacts: [
    {
      id: 'art-5',
      title: 'Data Visualization Dashboard',
      type: 'code',
      description: 'Interactive climate data dashboard',
    },
    {
      id: 'art-6',
      title: 'Environmental Science Presentation',
      type: 'presentation',
      description: 'Research findings presentation',
    },
  ],

  // Journey connection
  journey: {
    id: 'journey-1',
    title: 'STEM Research & Innovation',
    currentMilestone: 'Data Analysis Phase',
  },
};

// AI Reflection prompts
const reflectionPrompts = [
  'What was the most challenging part of this project, and how did you overcome it?',
  'How does this work connect to real-world applications or issues?',
  'What skills did you develop or strengthen while creating this artifact?',
  'If you could do this project again, what would you do differently?',
  'How does this work demonstrate your growth as a learner?',
];

export default function ArtifactDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('details');
  const [zoom, setZoom] = useState(100);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [visibility, setVisibility] = useState(artifactData.visibility);
  const [newComment, setNewComment] = useState('');
  const [selectedPrompt, setSelectedPrompt] = useState(0);
  const [reflection, setReflection] = useState('');

  const TypeIcon = typeIcon[artifactData.type] || FileText;
  const color = typeColor[artifactData.type] || 'blue';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  const copyShareLink = () => {
    navigator.clipboard.writeText(`https://portfolio.scholarly.ai/artifacts/${artifactData.id}`);
    toast({
      title: 'Link copied!',
      description: 'Share link has been copied to clipboard.',
    });
  };

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      toast({
        title: 'Comment submitted',
        description: 'Your feedback has been added.',
      });
      setNewComment('');
    }
  };

  const handleSaveReflection = () => {
    if (reflection.trim()) {
      toast({
        title: 'Reflection saved',
        description: 'Your reflection has been saved to this artifact.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portfolio/artifacts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="heading-2">{artifactData.title}</h1>
              <Badge variant={visibility === 'public' ? 'success' : 'secondary'} className="gap-1">
                {visibility === 'public' ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {visibility === 'public' ? 'Public' : 'Private'}
              </Badge>
            </div>
            <p className="text-muted-foreground">{artifactData.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
          <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Artifact</DialogTitle>
                <DialogDescription>
                  Control who can view this artifact and share it with others.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Visibility</Label>
                  <Select value={visibility} onValueChange={setVisibility}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Public - Anyone with the link
                        </div>
                      </SelectItem>
                      <SelectItem value="private">
                        <div className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Private - Only you
                        </div>
                      </SelectItem>
                      <SelectItem value="teachers">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Teachers - Teachers and mentors only
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Share Link</Label>
                  <div className="flex gap-2">
                    <Input
                      value={`https://portfolio.scholarly.ai/artifacts/${artifactData.id}`}
                      readOnly
                    />
                    <Button variant="outline" size="icon" onClick={copyShareLink}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setIsShareDialogOpen(false)}>Done</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button size="sm">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Media Viewer */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`rounded-lg bg-${color}-500/10 p-2`}>
                    <TypeIcon className={`h-5 w-5 text-${color}-500`} />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Preview</CardTitle>
                    <CardDescription>{artifactData.type} - {artifactData.fileSize}</CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground w-12 text-center">{zoom}%</span>
                  <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setIsFullscreen(true)}>
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div
                className="relative bg-muted rounded-lg overflow-hidden"
                style={{
                  height: '500px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Placeholder for actual media preview */}
                <div
                  className="text-center p-8"
                  style={{ transform: `scale(${zoom / 100})` }}
                >
                  <TypeIcon className={`h-24 w-24 mx-auto text-${color}-500/30`} />
                  <p className="mt-4 text-muted-foreground">Document Preview</p>
                  <p className="text-sm text-muted-foreground">Climate Change Research Paper</p>
                  <Button variant="outline" className="mt-4">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in Full View
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  Views
                </span>
                <span className="font-medium">{artifactData.views}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  Created
                </span>
                <span className="font-medium">{artifactData.createdAt}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Updated
                </span>
                <span className="font-medium">{artifactData.updatedAt}</span>
              </div>
            </CardContent>
          </Card>

          {/* Journey Connection */}
          {artifactData.journey && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Learning Journey
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <Link href={`/portfolio/journeys`}>
                  <div className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <p className="font-medium text-sm">{artifactData.journey.title}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {artifactData.journey.currentMilestone}
                    </p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Metadata & Tags</TabsTrigger>
          <TabsTrigger value="reflection">AI Reflection</TabsTrigger>
          <TabsTrigger value="comments">Comments ({artifactData.comments.length})</TabsTrigger>
          <TabsTrigger value="related">Related Work</TabsTrigger>
        </TabsList>

        {/* Metadata Tab */}
        <TabsContent value="details" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tags */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {artifactData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  <Button variant="outline" size="sm" className="h-6">
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Curriculum Alignment */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Curriculum Alignment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {artifactData.curriculumAlignment.map((alignment, index) => (
                  <div key={index} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{alignment.standard}</Badge>
                      <span className="text-sm font-medium">{alignment.code}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alignment.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Learning Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Linked Learning Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {artifactData.learningGoals.map((goal) => (
                <div key={goal.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{goal.title}</p>
                    <p className="text-xs text-muted-foreground">Contributes to {goal.progress}% progress</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/portfolio/goals">
                      View Goal
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Reflection Tab */}
        <TabsContent value="reflection" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                AI-Guided Reflection
              </CardTitle>
              <CardDescription>
                Use these prompts to reflect on your learning and growth
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prompt Selector */}
              <div className="space-y-2">
                <Label>Reflection Prompt</Label>
                <div className="flex flex-wrap gap-2">
                  {reflectionPrompts.map((prompt, index) => (
                    <Button
                      key={index}
                      variant={selectedPrompt === index ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedPrompt(index)}
                    >
                      Prompt {index + 1}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Selected Prompt */}
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-sm">{reflectionPrompts[selectedPrompt]}</p>
                </div>
              </div>

              {/* Reflection Input */}
              <div className="space-y-2">
                <Label>Your Reflection</Label>
                <Textarea
                  placeholder="Write your reflection here..."
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                  rows={6}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedPrompt((prev) => (prev + 1) % reflectionPrompts.length)}>
                  Try Another Prompt
                </Button>
                <Button onClick={handleSaveReflection}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Save Reflection
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Feedback & Comments
              </CardTitle>
              <CardDescription>
                Comments from teachers, parents, and mentors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Comments List */}
              {artifactData.comments.map((comment) => (
                <div key={comment.id} className="p-4 rounded-lg border">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Users className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{comment.author}</span>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {comment.role}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{comment.date}</span>
                      </div>
                      <p className="text-sm mt-2">{comment.content}</p>
                      <div className="flex items-center gap-2 mt-3">
                        <Button variant="ghost" size="sm" className="h-7">
                          <ThumbsUp className={`h-3 w-3 mr-1 ${comment.liked ? 'text-primary fill-primary' : ''}`} />
                          {comment.liked ? 'Liked' : 'Like'}
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7">
                          Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add Comment */}
              <div className="p-4 rounded-lg bg-muted/50">
                <Label className="mb-2 block">Add a response</Label>
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Write your response..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={2}
                    className="flex-1"
                  />
                  <Button onClick={handleSubmitComment} className="shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Work Tab */}
        <TabsContent value="related" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Related Artifacts</CardTitle>
              <CardDescription>
                Connected work from your curriculum journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {artifactData.relatedArtifacts.map((artifact) => {
                  const RelatedIcon = typeIcon[artifact.type] || FileText;
                  const relatedColor = typeColor[artifact.type] || 'blue';
                  return (
                    <Card key={artifact.id} className="cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`rounded-lg bg-${relatedColor}-500/10 p-2`}>
                            <RelatedIcon className={`h-5 w-5 text-${relatedColor}-500`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-sm font-semibold">{artifact.title}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{artifact.description}</p>
                            <Badge variant="secondary" className="mt-2 text-xs capitalize">
                              {artifact.type}
                            </Badge>
                          </div>
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/portfolio/artifacts/${artifact.id}`}>
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Curriculum Journey */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Curriculum Journey</CardTitle>
              <CardDescription>
                See how this artifact fits into your learning path
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="rounded-lg bg-primary/10 p-3">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{artifactData.journey?.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    This artifact is part of your active learning journey
                  </p>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/portfolio/journeys">
                    View Journey
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
