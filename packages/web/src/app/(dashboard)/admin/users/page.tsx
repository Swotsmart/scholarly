'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Users,
  Search,
  MoreHorizontal,
  UserPlus,
  Edit,
  Ban,
  Trash2,
  Shield,
  GraduationCap,
  BookOpen,
  UserCheck,
} from 'lucide-react';

const users = [
  { id: 'u1', firstName: 'Liam', lastName: 'O\'Connor', email: 'liam.oconnor@scholarly.edu.au', role: 'learner' as const, status: 'active' as const, lastLogin: '2026-01-26T08:15:00Z', createdAt: '2025-02-10' },
  { id: 'u2', firstName: 'Charlotte', lastName: 'Nguyen', email: 'charlotte.nguyen@scholarly.edu.au', role: 'teacher' as const, status: 'active' as const, lastLogin: '2026-01-26T07:45:00Z', createdAt: '2024-11-03' },
  { id: 'u3', firstName: 'Jack', lastName: 'Williams', email: 'jack.williams@scholarly.edu.au', role: 'admin' as const, status: 'active' as const, lastLogin: '2026-01-26T09:00:00Z', createdAt: '2024-06-15' },
  { id: 'u4', firstName: 'Olivia', lastName: 'Smith', email: 'olivia.smith@scholarly.edu.au', role: 'parent' as const, status: 'active' as const, lastLogin: '2026-01-25T18:30:00Z', createdAt: '2025-03-22' },
  { id: 'u5', firstName: 'Noah', lastName: 'Patel', email: 'noah.patel@scholarly.edu.au', role: 'learner' as const, status: 'inactive' as const, lastLogin: '2026-01-10T14:00:00Z', createdAt: '2025-01-08' },
  { id: 'u6', firstName: 'Amelia', lastName: 'Chen', email: 'amelia.chen@scholarly.edu.au', role: 'teacher' as const, status: 'active' as const, lastLogin: '2026-01-26T06:30:00Z', createdAt: '2024-08-19' },
  { id: 'u7', firstName: 'Thomas', lastName: 'Brown', email: 'thomas.brown@scholarly.edu.au', role: 'learner' as const, status: 'suspended' as const, lastLogin: '2026-01-15T11:20:00Z', createdAt: '2025-05-14' },
  { id: 'u8', firstName: 'Isabella', lastName: 'Murphy', email: 'isabella.murphy@scholarly.edu.au', role: 'parent' as const, status: 'active' as const, lastLogin: '2026-01-24T20:10:00Z', createdAt: '2025-07-01' },
];

const roleStats = [
  { label: 'Learners', count: 892, icon: GraduationCap, color: 'blue' },
  { label: 'Teachers', count: 74, icon: BookOpen, color: 'green' },
  { label: 'Admins', count: 12, icon: Shield, color: 'purple' },
  { label: 'Parents', count: 269, icon: UserCheck, color: 'orange' },
];

function getRoleBadgeVariant(role: string) {
  switch (role) {
    case 'admin':
      return 'destructive' as const;
    case 'teacher':
      return 'default' as const;
    case 'learner':
      return 'secondary' as const;
    case 'parent':
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'active':
      return 'default' as const;
    case 'inactive':
      return 'secondary' as const;
    case 'suspended':
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}

export default function AdminUsersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchQuery === '' ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">User Management</h1>
          <p className="text-muted-foreground">
            Manage platform accounts, roles, and permissions
          </p>
        </div>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Role Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {roleStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.count}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="learner">Learner</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left font-medium">Name</th>
                <th className="p-4 text-left font-medium">Email</th>
                <th className="p-4 text-left font-medium">Role</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Last Login</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {user.firstName[0]}{user.lastName[0]}
                        </span>
                      </div>
                      <span className="font-medium">
                        {user.firstName} {user.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{user.email}</td>
                  <td className="p-4">
                    <Badge variant={getRoleBadgeVariant(user.role)} className="capitalize">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="p-4">
                    <Badge variant={getStatusBadgeVariant(user.status)} className="capitalize">
                      {user.status}
                    </Badge>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(user.lastLogin).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="mr-2 h-4 w-4" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Ban className="mr-2 h-4 w-4" />
                          {user.status === 'suspended' ? 'Reactivate' : 'Disable Account'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {filteredUsers.length} of {users.length} users
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
            1
          </Button>
          <Button variant="outline" size="sm">
            2
          </Button>
          <Button variant="outline" size="sm">
            3
          </Button>
          <Button variant="outline" size="sm">
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
