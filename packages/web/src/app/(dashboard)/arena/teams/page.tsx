'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Plus,
  Loader2,
  Shield,
  Flame,
  Trophy,
  Crown,
  Hash,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArenaInsightPanel, TeamCard } from '@/components/arena';
import { useArenaIntelligence } from '@/hooks/use-arena-intelligence';
import { arenaApi } from '@/lib/arena-api';
import { cn } from '@/lib/utils';
import type { ArenaTeam, TeamType } from '@/types/arena';

// =============================================================================
// CONSTANTS
// =============================================================================

const TEAM_TYPE_OPTIONS: { value: TeamType; label: string }[] = [
  { value: 'CLASSROOM', label: 'Classroom' },
  { value: 'SCHOOL_HOUSE', label: 'School House' },
  { value: 'GLOBAL_GUILD', label: 'Global Guild' },
  { value: 'FAMILY', label: 'Family' },
];

const typeLabels: Record<string, string> = {
  CLASSROOM: 'Classroom',
  SCHOOL_HOUSE: 'School House',
  GLOBAL_GUILD: 'Global Guild',
  FAMILY: 'Family',
};

// =============================================================================
// SKELETON
// =============================================================================

function TeamGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="min-w-[260px] flex-shrink-0">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-5 rounded bg-muted animate-pulse" />
              <div className="h-5 w-32 rounded bg-muted animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="h-2 w-full rounded bg-muted animate-pulse" />
            <div className="flex gap-3">
              <div className="h-4 w-12 rounded bg-muted animate-pulse" />
              <div className="h-4 w-12 rounded bg-muted animate-pulse" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 py-2">
          <div className="h-5 w-8 rounded bg-muted animate-pulse" />
          <div className="h-5 w-40 rounded bg-muted animate-pulse" />
          <div className="h-5 w-20 rounded bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded bg-muted animate-pulse ml-auto" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// CREATE TEAM DIALOG
// =============================================================================

interface CreateTeamForm {
  name: string;
  type: TeamType;
  description: string;
  maxMembers: number;
}

function CreateTeamDialog({ onCreated }: { onCreated: (team: ArenaTeam) => void }) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<CreateTeamForm>({
    name: '',
    type: 'CLASSROOM',
    description: '',
    maxMembers: 10,
  });

  async function handleCreate() {
    if (!form.name.trim()) return;
    setCreating(true);
    try {
      const res = await arenaApi.createTeam(form);
      if (res.success && res.data) {
        onCreated(res.data);
        setOpen(false);
        setForm({ name: '', type: 'CLASSROOM', description: '', maxMembers: 10 });
      }
    } catch {
      // Failed to create team
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create a New Team</DialogTitle>
          <DialogDescription>
            Build a team and start competing together in the arena.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Team Name</label>
            <Input
              placeholder="e.g. Kookaburra Readers"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Select
              value={form.type}
              onValueChange={(v) => setForm({ ...form, type: v as TeamType })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Describe your team..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Members</label>
            <Input
              type="number"
              min={2}
              max={100}
              value={form.maxMembers}
              onChange={(e) =>
                setForm({ ...form, maxMembers: parseInt(e.target.value) || 10 })
              }
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={creating || !form.name.trim()}>
            {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create Team
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function TeamsPage() {
  const [myTeams, setMyTeams] = useState<ArenaTeam[]>([]);
  const [leaderboard, setLeaderboard] = useState<(ArenaTeam & { rank: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { insights, recommendations } = useArenaIntelligence({
    context: 'teams',
    teams: myTeams,
  });

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [myRes, lbRes] = await Promise.all([
          arenaApi.getMyTeams(),
          arenaApi.getTeamLeaderboard(),
        ]);
        if (myRes.success && myRes.data) setMyTeams(myRes.data);
        if (lbRes.success && lbRes.data?.teams) setLeaderboard(lbRes.data.teams);
      } catch {
        // Failed to load teams
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredLeaderboard = leaderboard.filter(
    (t) => typeFilter === 'all' || t.type === typeFilter
  );

  function handleTeamCreated(team: ArenaTeam) {
    setMyTeams((prev) => [...prev, team]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teams"
        description="Collaborate and compete together"
        actions={
          <div className="flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            <CreateTeamDialog onCreated={handleTeamCreated} />
          </div>
        }
      />

      <ArenaInsightPanel insights={insights} recommendations={recommendations} />

      {/* My Teams */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">My Teams</h2>
        {loading ? (
          <TeamGridSkeleton />
        ) : myTeams.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                You haven&apos;t joined a team yet
              </p>
              <p className="text-xs text-muted-foreground mb-4 max-w-xs">
                Create a new team or browse the leaderboard to find one to join.
              </p>
              <CreateTeamDialog onCreated={handleTeamCreated} />
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {myTeams.map((team) => (
              <div key={team.id} className="min-w-[280px] flex-shrink-0">
                <TeamCard team={team} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Team Leaderboard */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Team Leaderboard</h2>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {TEAM_TYPE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <TableSkeleton />
        ) : filteredLeaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
            <Trophy className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No teams found for this filter.
            </p>
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 w-14">Rank</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">XP</th>
                      <th className="px-4 py-3 text-right">Level</th>
                      <th className="px-4 py-3 text-right">Wins</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaderboard.map((team) => (
                      <tr
                        key={team.id}
                        className="border-b last:border-0 hover:bg-muted/50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center w-8">
                            {team.rank <= 3 ? (
                              <Crown
                                className={cn(
                                  'h-4.5 w-4.5',
                                  team.rank === 1 && 'text-yellow-500',
                                  team.rank === 2 && 'text-gray-400',
                                  team.rank === 3 && 'text-amber-700 dark:text-amber-600'
                                )}
                              />
                            ) : (
                              <span className="flex items-center gap-0.5 text-muted-foreground">
                                <Hash className="h-3 w-3" />
                                {team.rank}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/arena/teams/${team.id}`}
                            className="flex items-center gap-2 font-medium hover:text-primary transition-colors"
                          >
                            <Shield className="h-4 w-4 text-primary" />
                            {team.name}
                            {team.streak > 0 && (
                              <span className="flex items-center gap-0.5 text-orange-600 dark:text-orange-400">
                                <Flame className="h-3.5 w-3.5" />
                                <span className="text-xs">{team.streak}</span>
                              </span>
                            )}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[team.type] || team.type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">
                          {team.xp.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {team.level}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {team.totalWins}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}
