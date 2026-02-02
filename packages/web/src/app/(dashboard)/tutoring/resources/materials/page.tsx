'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  FileText,
  Search,
  Upload,
  Folder,
  File,
  Download,
  Trash2,
  Eye,
  MoreHorizontal,
  Plus,
  Image,
  Video,
  FileSpreadsheet,
} from 'lucide-react';

const folders = [
  { id: 1, name: 'Algebra', files: 24, lastModified: '2 days ago' },
  { id: 2, name: 'Calculus', files: 18, lastModified: '1 week ago' },
  { id: 3, name: 'Statistics', files: 12, lastModified: '3 days ago' },
  { id: 4, name: 'General Resources', files: 8, lastModified: '1 day ago' },
];

const recentFiles = [
  {
    id: 1,
    name: 'Quadratic Equations Practice.pdf',
    type: 'pdf',
    size: '2.4 MB',
    folder: 'Algebra',
    lastModified: 'Today',
    downloads: 45,
  },
  {
    id: 2,
    name: 'Integration Techniques Summary.pdf',
    type: 'pdf',
    size: '1.8 MB',
    folder: 'Calculus',
    lastModified: 'Yesterday',
    downloads: 32,
  },
  {
    id: 3,
    name: 'Statistics Formula Sheet.xlsx',
    type: 'spreadsheet',
    size: '890 KB',
    folder: 'Statistics',
    lastModified: '2 days ago',
    downloads: 28,
  },
  {
    id: 4,
    name: 'Linear Equations Video Tutorial.mp4',
    type: 'video',
    size: '45 MB',
    folder: 'Algebra',
    lastModified: '3 days ago',
    downloads: 67,
  },
  {
    id: 5,
    name: 'Derivatives Graph Examples.png',
    type: 'image',
    size: '1.2 MB',
    folder: 'Calculus',
    lastModified: '4 days ago',
    downloads: 21,
  },
];

const getFileIcon = (type: string) => {
  switch (type) {
    case 'pdf':
      return <FileText className="h-5 w-5 text-red-500" />;
    case 'spreadsheet':
      return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
    case 'video':
      return <Video className="h-5 w-5 text-purple-500" />;
    case 'image':
      return <Image className="h-5 w-5 text-blue-500" />;
    default:
      return <File className="h-5 w-5 text-gray-500" />;
  }
};

export default function MaterialsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            My Materials
          </h1>
          <p className="text-muted-foreground">
            Manage your tutoring resources and materials
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      {/* Storage Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <File className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Files</span>
            </div>
            <div className="mt-2 text-2xl font-bold">62</div>
            <p className="text-xs text-muted-foreground mt-1">across all folders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Folder className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Folders</span>
            </div>
            <div className="mt-2 text-2xl font-bold">4</div>
            <p className="text-xs text-muted-foreground mt-1">organized by subject</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Downloads</span>
            </div>
            <div className="mt-2 text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground mt-1">by students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Storage Used</span>
            </div>
            <div className="mt-2 text-2xl font-bold">2.4 GB</div>
            <p className="text-xs text-muted-foreground mt-1">of 10 GB</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files and folders..."
                className="pl-10"
              />
            </div>
            <select className="p-2 rounded border">
              <option>All Types</option>
              <option>Documents</option>
              <option>Spreadsheets</option>
              <option>Videos</option>
              <option>Images</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Folders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Folders</CardTitle>
            <CardDescription>Organize your materials by subject</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100">
                    <Folder className="h-5 w-5 text-yellow-600" />
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
                <p className="font-medium mt-3">{folder.name}</p>
                <p className="text-sm text-muted-foreground">
                  {folder.files} files
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Modified {folder.lastModified}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Files */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Files</CardTitle>
          <CardDescription>Your recently added or modified files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {recentFiles.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {file.folder} &bull; {file.size} &bull; {file.lastModified}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    <Download className="mr-1 h-3 w-3" />
                    {file.downloads}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
