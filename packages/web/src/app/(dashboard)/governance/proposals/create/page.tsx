'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  FileText,
  Send,
  Eye,
  Info,
  Coins,
  Shield,
  Users,
  Clock,
  Plus,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

const CATEGORIES = [
  { value: 'curriculum', label: 'Curriculum', description: 'Changes to learning content, courses, or educational frameworks' },
  { value: 'treasury', label: 'Treasury', description: 'Fund allocations, grants, or financial policy changes' },
  { value: 'platform', label: 'Platform', description: 'New features, integrations, or platform improvements' },
  { value: 'policy', label: 'Policy', description: 'Governance rules, staking parameters, or operational policies' },
  { value: 'technical', label: 'Technical', description: 'Infrastructure, smart contracts, or protocol upgrades' },
];

const ACTION_TYPES = [
  { value: 'transfer_tokens', label: 'Transfer Tokens' },
  { value: 'change_parameter', label: 'Change Parameter' },
  { value: 'add_module', label: 'Add Module' },
  { value: 'update_contract', label: 'Update Smart Contract' },
  { value: 'grant_role', label: 'Grant Role' },
];

export default function CreateProposalPage() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [actions, setActions] = useState([
    { id: 1, type: '', target: '', value: '' },
  ]);
  const [showPreview, setShowPreview] = useState(false);

  const addAction = () => {
    setActions((prev) => [...prev, { id: Date.now(), type: '', target: '', value: '' }]);
  };

  const removeAction = (id: number) => {
    if (actions.length > 1) {
      setActions((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const updateAction = (id: number, field: string, value: string) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const selectedCategory = CATEGORIES.find((c) => c.value === category);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/governance/proposals" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="heading-2">Create Proposal</h1>
          </div>
          <p className="text-muted-foreground">
            Submit a new governance proposal for community voting
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(!showPreview)}>
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? 'Edit' : 'Preview'}
          </Button>
          <Button disabled={!title || !description || !category}>
            <Send className="h-4 w-4 mr-2" />
            Submit Proposal
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {!showPreview ? (
            <>
              {/* Proposal Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Details</CardTitle>
                  <CardDescription>
                    Provide a clear title and comprehensive description for your proposal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Allocate 50,000 EDU for Indigenous Language Curriculum"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      A concise title that clearly describes the proposal intent
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedCategory && (
                      <p className="text-xs text-muted-foreground">
                        {selectedCategory.description}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Provide a detailed description of the proposal, including rationale, expected outcomes, and any relevant data or references..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="min-h-[200px]"
                    />
                    <p className="text-xs text-muted-foreground">
                      Markdown is supported. Include rationale, expected impact, and timeline.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Proposed Actions</CardTitle>
                  <CardDescription>
                    Define the on-chain actions that will execute if this proposal passes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {actions.map((action, index) => (
                    <div key={action.id} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Action {index + 1}</span>
                        {actions.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAction(action.id)}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Action Type</Label>
                          <Select
                            value={action.type}
                            onValueChange={(v) => updateAction(action.id, 'type', v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTION_TYPES.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Target</Label>
                          <Input
                            placeholder="Address or parameter"
                            value={action.target}
                            onChange={(e) => updateAction(action.id, 'target', e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Value</Label>
                          <Input
                            placeholder="Amount or new value"
                            value={action.value}
                            onChange={(e) => updateAction(action.id, 'value', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button variant="outline" onClick={addAction} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Action
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            /* Preview */
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    Pending
                  </Badge>
                  {category && (
                    <Badge variant="secondary">{category}</Badge>
                  )}
                </div>
                <CardTitle className="text-xl">{title || 'Untitled Proposal'}</CardTitle>
                <CardDescription>
                  Proposed by You - Submitted just now
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <p className="text-sm whitespace-pre-wrap">
                    {description || 'No description provided.'}
                  </p>
                </div>

                {actions.some((a) => a.type) && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Proposed Actions</h4>
                    <div className="space-y-2">
                      {actions
                        .filter((a) => a.type)
                        .map((action, index) => (
                          <div key={action.id} className="rounded-lg bg-muted/50 p-3 text-sm">
                            <span className="font-medium">Action {index + 1}:</span>{' '}
                            {ACTION_TYPES.find((t) => t.value === action.type)?.label || action.type}
                            {action.target && <span> - Target: <code className="text-xs bg-muted px-1 py-0.5 rounded">{action.target}</code></span>}
                            {action.value && <span> - Value: <code className="text-xs bg-muted px-1 py-0.5 rounded">{action.value}</code></span>}
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Vote Tallies (Preview)</h4>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-green-600 dark:text-green-400">For</span>
                      <span className="text-muted-foreground">0 votes</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-muted">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-red-600 dark:text-red-400">Against</span>
                      <span className="text-muted-foreground">0 votes</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-muted">
                      <div className="h-full bg-red-500 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Abstain</span>
                      <span className="text-muted-foreground">0 votes</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden bg-muted">
                      <div className="h-full bg-gray-400 rounded-full" style={{ width: '0%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Requirements Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Info className="h-4 w-4" />
                Proposal Requirements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Coins className="h-4 w-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Minimum Stake</p>
                  <p className="text-xs text-muted-foreground">
                    You must stake at least 10,000 EDU to submit a proposal
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <Users className="h-4 w-4 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Quorum Threshold</p>
                  <p className="text-xs text-muted-foreground">
                    200,000 EDU voting power required for proposal to be valid
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-amber-500/10 p-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Voting Period</p>
                  <p className="text-xs text-muted-foreground">
                    7 days from proposal submission, with 2-day timelock after passing
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <Shield className="h-4 w-4 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium">Passing Threshold</p>
                  <p className="text-xs text-muted-foreground">
                    Simple majority (50%+1) of participating voting power, excluding abstentions
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Your Eligibility */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Eligibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Your Staked EDU</span>
                <span className="font-medium">24,500 EDU</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Minimum Required</span>
                <span className="font-medium">10,000 EDU</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Voting Power</span>
                <span className="font-medium">24,500</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Delegation Received</span>
                <span className="font-medium">8,200</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Voting Power</span>
                  <span className="font-bold">32,700</span>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 w-full justify-center">
                Eligible to submit proposals
              </Badge>
            </CardContent>
          </Card>

          {/* Recent Proposals */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Proposals</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium line-clamp-1">Indigenous Language Curriculum</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                    Active
                  </Badge>
                  <span className="text-xs text-muted-foreground">2d 14h left</span>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium line-clamp-1">Mandarin Immersion Module</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                    Active
                  </Badge>
                  <span className="text-xs text-muted-foreground">4d 6h left</span>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-sm font-medium line-clamp-1">Increase Validator Rewards</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                    Passed
                  </Badge>
                  <span className="text-xs text-muted-foreground">Ended</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
