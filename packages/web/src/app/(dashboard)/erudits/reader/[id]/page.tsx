'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  BookmarkCheck,
  StickyNote,
  Maximize2,
  Minimize2,
  Shield,
  Type,
  Sun,
  Moon,
  X,
  Plus,
  Trash2,
} from 'lucide-react';

interface ReaderNote {
  id: string;
  page: number;
  text: string;
  createdAt: string;
}

export default function ReaderPage() {
  const params = useParams();
  const resourceId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(24);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>('md');
  const [darkReader, setDarkReader] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>([3, 12]);
  const [notes, setNotes] = useState<ReaderNote[]>([
    { id: 'n-1', page: 3, text: 'Key vocabulary for Unit 1 conversation topics', createdAt: '2026-03-01T10:00:00Z' },
    { id: 'n-2', page: 12, text: 'Grammar rule: subjunctive mood usage', createdAt: '2026-03-02T14:30:00Z' },
  ]);
  const [showNotes, setShowNotes] = useState(false);
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  function toggleBookmark() {
    setBookmarks((prev) =>
      prev.includes(currentPage) ? prev.filter((p) => p !== currentPage) : [...prev, currentPage]
    );
  }

  function addNote() {
    if (!newNote.trim()) return;
    setNotes((prev) => [
      ...prev,
      { id: `n-${Date.now()}`, page: currentPage, text: newNote.trim(), createdAt: new Date().toISOString() },
    ]);
    setNewNote('');
  }

  function deleteNote(id: string) {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  const isBookmarked = bookmarks.includes(currentPage);
  const currentNotes = notes.filter((n) => n.page === currentPage);

  const fontSizeClass = fontSize === 'sm' ? 'text-sm' : fontSize === 'lg' ? 'text-lg' : 'text-base';

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Skeleton className="h-[600px] w-[400px]" />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-screen ${isFullscreen ? 'fixed inset-0 z-50 bg-background' : ''}`}>
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 shrink-0">
        <div className="flex items-center gap-3">
          {!isFullscreen && (
            <Button variant="ghost" size="icon" asChild>
              <Link href="/erudits/storefront"><ArrowLeft className="h-4 w-4" /></Link>
            </Button>
          )}
          <div>
            <p className="font-medium text-sm">Protected Content Reader</p>
            <p className="text-xs text-muted-foreground">Resource: {resourceId}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setFontSize(fontSize === 'sm' ? 'md' : fontSize === 'md' ? 'lg' : 'sm')}
            title="Change font size"
          >
            <Type className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setDarkReader(!darkReader)}
            title="Toggle dark reader"
          >
            {darkReader ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          <Button
            variant={isBookmarked ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={toggleBookmark}
            title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
          >
            {isBookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
          </Button>
          <Button
            variant={showNotes ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowNotes(!showNotes)}
            title="Notes"
          >
            <StickyNote className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Reading Area */}
        <div className={`flex-1 flex flex-col items-center justify-center p-8 ${darkReader ? 'bg-gray-900 text-gray-200' : 'bg-white'}`}>
          <div className={`max-w-2xl w-full ${fontSizeClass}`}>
            {/* DRM Notice */}
            <div className={`flex items-center gap-2 rounded-lg p-3 mb-6 text-xs ${darkReader ? 'bg-gray-800 text-gray-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-400'}`}>
              <Shield className="h-4 w-4 shrink-0" />
              <p>This content is DRM-protected. Copying, printing, and screenshots are restricted by your licence terms.</p>
            </div>

            {/* Page Content Placeholder */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold">Page {currentPage}</h2>
              <p className="leading-relaxed">
                This is a placeholder for the protected content reader. In the full implementation, this area displays
                the purchased resource content with DRM protection. The content is fetched page-by-page from the server
                to prevent bulk downloading, and each page request is authenticated against the reader session.
              </p>
              <p className="leading-relaxed">
                The reader supports bookmarks, notes, font size adjustment, and a dark reading mode. Content is
                watermarked with the purchaser&apos;s information for forensic tracking of unauthorised distribution.
              </p>
              {currentPage === 1 && (
                <div className="rounded-lg border p-4 mt-6">
                  <h3 className="font-semibold mb-2">Table of Contents</h3>
                  <ol className="space-y-1 text-sm text-muted-foreground">
                    <li className="flex justify-between"><span>1. Introduction</span><span>p. 1</span></li>
                    <li className="flex justify-between"><span>2. Core Concepts</span><span>p. 5</span></li>
                    <li className="flex justify-between"><span>3. Practice Exercises</span><span>p. 10</span></li>
                    <li className="flex justify-between"><span>4. Advanced Topics</span><span>p. 16</span></li>
                    <li className="flex justify-between"><span>5. Exam Preparation</span><span>p. 20</span></li>
                  </ol>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Notes Panel */}
        {showNotes && (
          <div className="w-72 border-l overflow-y-auto shrink-0">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-sm">Notes</h3>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowNotes(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>

              {/* Bookmarks */}
              {bookmarks.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Bookmarks</p>
                  <div className="flex flex-wrap gap-1">
                    {bookmarks.sort((a, b) => a - b).map((page) => (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setCurrentPage(page)}
                      >
                        p. {page}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Page Notes */}
              <div className="mb-4">
                <p className="text-xs font-medium text-muted-foreground mb-2">Page {currentPage} Notes</p>
                {currentNotes.length > 0 ? (
                  <div className="space-y-2">
                    {currentNotes.map((note) => (
                      <div key={note.id} className="rounded border p-2 text-xs">
                        <div className="flex items-start justify-between gap-2">
                          <p>{note.text}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0"
                            onClick={() => deleteNote(note.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-muted-foreground mt-1">{new Date(note.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No notes on this page</p>
                )}
              </div>

              {/* Add Note */}
              <div>
                <textarea
                  className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="Add a note..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button size="sm" className="w-full mt-2 h-7 text-xs" onClick={addNote} disabled={!newNote.trim()}>
                  <Plus className="mr-1 h-3 w-3" />Add Note
                </Button>
              </div>

              {/* All Notes */}
              {notes.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs font-medium text-muted-foreground mb-2">All Notes ({notes.length})</p>
                  <div className="space-y-2">
                    {notes.sort((a, b) => a.page - b.page).map((note) => (
                      <button
                        key={note.id}
                        className={`w-full rounded border p-2 text-left text-xs transition-colors hover:bg-muted/50 ${note.page === currentPage ? 'border-primary' : ''}`}
                        onClick={() => setCurrentPage(note.page)}
                      >
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-[10px] h-4">p. {note.page}</Badge>
                        </div>
                        <p className="mt-1 line-clamp-2">{note.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="flex items-center justify-between border-t px-4 py-2 shrink-0">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
        >
          <ChevronLeft className="mr-1 h-3 w-3" />Previous
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <div className="w-24 h-1.5 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(currentPage / totalPages) * 100}%` }}
            />
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
        >
          Next<ChevronRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
