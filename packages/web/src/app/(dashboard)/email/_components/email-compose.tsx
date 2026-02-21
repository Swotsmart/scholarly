'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Send, Paperclip, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { EmailComposeData } from '@/types/email';

interface EmailComposeProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (data: EmailComposeData) => void;
  defaultTo?: string;
  defaultSubject?: string;
  defaultBody?: string;
  replyToId?: string;
  threadId?: string;
}

export function EmailCompose({
  open,
  onOpenChange,
  onSend,
  defaultTo = '',
  defaultSubject = '',
  defaultBody = '',
  replyToId,
  threadId,
}: EmailComposeProps) {
  const [to, setTo] = useState(defaultTo);
  const [cc, setCc] = useState('');
  const [bcc, setBcc] = useState('');
  const [subject, setSubject] = useState(defaultSubject);
  const [body, setBody] = useState(defaultBody);
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const handleSend = () => {
    if (!to.trim() || !body.trim()) return;

    const toAddresses = to.split(',').map((e) => e.trim()).filter(Boolean);
    const ccAddresses = cc ? cc.split(',').map((e) => e.trim()).filter(Boolean) : undefined;
    const bccAddresses = bcc ? bcc.split(',').map((e) => e.trim()).filter(Boolean) : undefined;

    onSend({
      to: toAddresses,
      cc: ccAddresses,
      bcc: bccAddresses,
      subject,
      body,
      inReplyTo: replyToId,
      threadId,
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    // Reset
    setTo('');
    setCc('');
    setBcc('');
    setSubject('');
    setBody('');
    setAttachments([]);
    onOpenChange(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {replyToId ? 'Reply' : 'New Message'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="to" className="w-10 text-sm text-muted-foreground">
                To
              </Label>
              <Input
                id="to"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1"
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCcBcc(!showCcBcc)}
                className="text-xs text-muted-foreground"
              >
                Cc/Bcc
                {showCcBcc ? (
                  <ChevronUp className="h-3 w-3 ml-1" />
                ) : (
                  <ChevronDown className="h-3 w-3 ml-1" />
                )}
              </Button>
            </div>

            {showCcBcc && (
              <>
                <div className="flex items-center gap-2">
                  <Label htmlFor="cc" className="w-10 text-sm text-muted-foreground">
                    Cc
                  </Label>
                  <Input
                    id="cc"
                    value={cc}
                    onChange={(e) => setCc(e.target.value)}
                    placeholder="cc@example.com"
                    className="flex-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label htmlFor="bcc" className="w-10 text-sm text-muted-foreground">
                    Bcc
                  </Label>
                  <Input
                    id="bcc"
                    value={bcc}
                    onChange={(e) => setBcc(e.target.value)}
                    placeholder="bcc@example.com"
                    className="flex-1"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Label htmlFor="subject" className="w-10 text-sm text-muted-foreground">
                Subj
              </Label>
              <Input
                id="subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="flex-1"
              />
            </div>
          </div>

          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your message..."
            rows={10}
            className="resize-none"
          />

          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeAttachment(idx)}>
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button onClick={handleSend} disabled={!to.trim() || !body.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
            </div>
            <label className="cursor-pointer">
              <input
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors">
                <Paperclip className="h-4 w-4" />
                Attach
              </div>
            </label>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
