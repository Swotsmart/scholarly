'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookOpen, Camera, MessageSquare, Image, Plus } from 'lucide-react';

export default function ClassStoryPage() {
  const stories = [
    { id: 1, title: 'Science Experiment Success!', date: 'Today', likes: 12, comments: 5, image: true },
    { id: 2, title: 'Art Class Creations', date: 'Yesterday', likes: 24, comments: 8, image: true },
    { id: 3, title: 'Math Challenge Winners', date: '2 days ago', likes: 18, comments: 3, image: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Class Story</h1>
          <p className="text-muted-foreground">Share moments and achievements with families</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Post
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stories.map((story) => (
          <Card key={story.id}>
            {story.image && (
              <div className="aspect-video bg-muted flex items-center justify-center">
                <Image className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            <CardHeader>
              <CardTitle className="text-lg">{story.title}</CardTitle>
              <CardDescription>{story.date}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <BookOpen className="h-4 w-4" />
                  {story.likes} likes
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" />
                  {story.comments} comments
                </span>
              </div>
            </CardContent>
          </Card>
        ))}

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center h-full min-h-[200px] text-center">
            <Camera className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="font-medium">Share a Moment</p>
            <p className="text-sm text-muted-foreground">Capture and share classroom activities</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
