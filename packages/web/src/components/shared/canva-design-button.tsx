'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Palette, Search, ExternalLink, Loader2, Plus,
} from 'lucide-react';
import { api } from '@/lib/api';

interface CanvaTemplate {
  id: string;
  title: string;
  thumbnail: string;
  designType: string;
}

interface CanvaDesignButtonProps {
  designTypeFilter?: string | string[];
  onDesignCreated?: (designUrl: string, designId: string) => void;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const DESIGN_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'document', label: 'Document' },
  { value: 'presentation', label: 'Presentation' },
  { value: 'poster', label: 'Poster' },
  { value: 'infographic', label: 'Infographic' },
  { value: 'worksheet', label: 'Worksheet' },
];

export function CanvaDesignButton({
  designTypeFilter,
  onDesignCreated,
  variant = 'outline',
  size = 'sm',
  className,
}: CanvaDesignButtonProps) {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>(
    typeof designTypeFilter === 'string' ? designTypeFilter : 'all'
  );
  const [templates, setTemplates] = useState<CanvaTemplate[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [designTitle, setDesignTitle] = useState('');

  // Check connection status when dialog opens
  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        const res = await api.canva.getConnection();
        if (res.success && res.data) {
          setConnected(res.data.connected);
        }
      } catch {
        setConnected(false);
      }
    })();
  }, [open]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await api.canva.searchTemplates(
        searchQuery,
        selectedType !== 'all' ? selectedType : undefined
      );
      if (res.success && res.data) {
        setTemplates(res.data.templates);
      }
    } catch {
      // Search failed silently
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateDesign = async (templateId?: string) => {
    setIsCreating(true);
    try {
      const res = await api.canva.createDesign({
        templateId,
        designType: selectedType !== 'all' ? selectedType : 'document',
        title: designTitle || 'Untitled Design',
      });
      if (res.success && res.data) {
        onDesignCreated?.(res.data.designUrl, res.data.designId);
        setOpen(false);
      }
    } catch {
      // Creation failed silently
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnect = async () => {
    try {
      const res = await api.canva.getAuthUrl();
      if (res.success && res.data) {
        window.open(res.data.url, '_blank');
      }
    } catch {
      // Failed to get auth URL
    }
  };

  // Filter available design types based on the filter prop
  const availableTypes = designTypeFilter
    ? DESIGN_TYPES.filter(
        (t) =>
          t.value === 'all' ||
          (Array.isArray(designTypeFilter)
            ? designTypeFilter.includes(t.value)
            : designTypeFilter === t.value)
      )
    : DESIGN_TYPES;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
      >
        <Palette className="h-4 w-4 mr-2" />
        Design with Canva
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Design with Canva
            </DialogTitle>
            <DialogDescription>
              Search templates or start a blank design.
            </DialogDescription>
          </DialogHeader>

          {connected === null ? (
            <div className="space-y-4 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ) : !connected ? (
            <div className="py-8 text-center space-y-4">
              <Palette className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="font-medium">Connect your Canva account</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Authorise Scholarly to create and manage designs on your behalf.
                </p>
              </div>
              <Button onClick={handleConnect}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Connect Canva
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search & filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search Canva templates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="pl-9"
                  />
                </div>
                {availableTypes.length > 2 && (
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Template results */}
              {templates.length > 0 ? (
                <div className="grid grid-cols-3 gap-3 max-h-[300px] overflow-y-auto">
                  {templates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => handleCreateDesign(template.id)}
                      className="group relative rounded-lg border overflow-hidden hover:ring-2 hover:ring-primary transition-all"
                    >
                      <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                        {template.thumbnail ? (
                          <img
                            src={template.thumbnail}
                            alt={template.title}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Palette className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      <div className="p-2">
                        <p className="text-xs font-medium truncate">{template.title}</p>
                        <Badge variant="secondary" className="text-[10px] mt-1">
                          {template.designType}
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery ? (
                <p className="text-center text-sm text-muted-foreground py-8">
                  No templates found. Try a different search.
                </p>
              ) : null}

              {/* Create blank design */}
              <div className="border-t pt-4 space-y-3">
                <p className="text-sm font-medium">Start from scratch</p>
                <div className="flex gap-2">
                  <Input
                    placeholder="Design title"
                    value={designTitle}
                    onChange={(e) => setDesignTitle(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={() => handleCreateDesign()}
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
