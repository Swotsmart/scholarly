'use client';

/**
 * User Management Page
 * Comprehensive user administration with DataTable, bulk actions, and import
 * Updated to follow UI/UX Design System v2.0
 */

import { useState, useMemo } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, PageHeader, StatsCard } from '@/components/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  Upload,
  Download,
  CheckCircle2,
  XCircle,
  Mail,
  RefreshCw,
  ChevronDown,
  Check,
  AlertCircle,
  FileSpreadsheet,
  Clock,
  Calendar,
} from 'lucide-react';

// User type definition
interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'learner' | 'teacher' | 'admin' | 'parent';
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdAt: string;
  avatar?: string;
}

// Mock data
const usersData: User[] = [
  { id: 'u1', firstName: 'Liam', lastName: "O'Connor", email: 'liam.oconnor@scholarly.edu.au', role: 'learner', status: 'active', lastLogin: '2026-01-29T08:15:00Z', createdAt: '2025-02-10' },
  { id: 'u2', firstName: 'Charlotte', lastName: 'Nguyen', email: 'charlotte.nguyen@scholarly.edu.au', role: 'teacher', status: 'active', lastLogin: '2026-01-29T07:45:00Z', createdAt: '2024-11-03' },
  { id: 'u3', firstName: 'Jack', lastName: 'Williams', email: 'jack.williams@scholarly.edu.au', role: 'admin', status: 'active', lastLogin: '2026-01-29T09:00:00Z', createdAt: '2024-06-15' },
  { id: 'u4', firstName: 'Olivia', lastName: 'Smith', email: 'olivia.smith@scholarly.edu.au', role: 'parent', status: 'active', lastLogin: '2026-01-28T18:30:00Z', createdAt: '2025-03-22' },
  { id: 'u5', firstName: 'Noah', lastName: 'Patel', email: 'noah.patel@scholarly.edu.au', role: 'learner', status: 'inactive', lastLogin: '2026-01-10T14:00:00Z', createdAt: '2025-01-08' },
  { id: 'u6', firstName: 'Amelia', lastName: 'Chen', email: 'amelia.chen@scholarly.edu.au', role: 'teacher', status: 'active', lastLogin: '2026-01-29T06:30:00Z', createdAt: '2024-08-19' },
  { id: 'u7', firstName: 'Thomas', lastName: 'Brown', email: 'thomas.brown@scholarly.edu.au', role: 'learner', status: 'suspended', lastLogin: '2026-01-15T11:20:00Z', createdAt: '2025-05-14' },
  { id: 'u8', firstName: 'Isabella', lastName: 'Murphy', email: 'isabella.murphy@scholarly.edu.au', role: 'parent', status: 'active', lastLogin: '2026-01-27T20:10:00Z', createdAt: '2025-07-01' },
  { id: 'u9', firstName: 'William', lastName: 'Taylor', email: 'william.taylor@scholarly.edu.au', role: 'learner', status: 'active', lastLogin: '2026-01-29T07:00:00Z', createdAt: '2025-02-28' },
  { id: 'u10', firstName: 'Sophie', lastName: 'Anderson', email: 'sophie.anderson@scholarly.edu.au', role: 'teacher', status: 'active', lastLogin: '2026-01-29T08:30:00Z', createdAt: '2024-09-15' },
  { id: 'u11', firstName: 'James', lastName: 'Wilson', email: 'james.wilson@scholarly.edu.au', role: 'learner', status: 'active', lastLogin: '2026-01-28T15:45:00Z', createdAt: '2025-04-20' },
  { id: 'u12', firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@scholarly.edu.au', role: 'admin', status: 'active', lastLogin: '2026-01-29T08:00:00Z', createdAt: '2024-03-10' },
];

const roleStats = [
  { label: 'Learners', count: 892, icon: GraduationCap, variant: 'primary' as const },
  { label: 'Teachers', count: 74, icon: BookOpen, variant: 'success' as const },
  { label: 'Admins', count: 12, icon: Shield, variant: 'warning' as const },
  { label: 'Parents', count: 269, icon: UserCheck, variant: 'primary' as const },
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

function getStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Active
        </Badge>
      );
    case 'inactive':
      return (
        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          <Clock className="mr-1 h-3 w-3" />
          Inactive
        </Badge>
      );
    case 'suspended':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="mr-1 h-3 w-3" />
          Suspended
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>(usersData);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [bulkAction, setBulkAction] = useState<'enable' | 'disable' | 'delete' | 'changeRole' | null>(null);
  const [newUserRole, setNewUserRole] = useState<string>('learner');

  // Form state for new user
  const [newUser, setNewUser] = useState<{
    firstName: string;
    lastName: string;
    email: string;
    role: User['role'];
  }>({
    firstName: '',
    lastName: '',
    email: '',
    role: 'learner',
  });

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      return matchesRole && matchesStatus;
    });
  }, [users, roleFilter, statusFilter]);

  const toggleUserSelection = (userId: string) => {
    const newSelection = new Set(selectedUsers);
    if (newSelection.has(userId)) {
      newSelection.delete(userId);
    } else {
      newSelection.add(userId);
    }
    setSelectedUsers(newSelection);
  };

  const toggleAllSelection = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const handleBulkAction = (action: 'enable' | 'disable' | 'delete' | 'changeRole') => {
    setBulkAction(action);
    setBulkActionDialogOpen(true);
  };

  const executeBulkAction = () => {
    const selectedIds = Array.from(selectedUsers);

    switch (bulkAction) {
      case 'enable':
        setUsers(prev => prev.map(u =>
          selectedIds.includes(u.id) ? { ...u, status: 'active' as const } : u
        ));
        break;
      case 'disable':
        setUsers(prev => prev.map(u =>
          selectedIds.includes(u.id) ? { ...u, status: 'inactive' as const } : u
        ));
        break;
      case 'delete':
        setUsers(prev => prev.filter(u => !selectedIds.includes(u.id)));
        break;
      case 'changeRole':
        setUsers(prev => prev.map(u =>
          selectedIds.includes(u.id) ? { ...u, role: newUserRole as User['role'] } : u
        ));
        break;
    }

    setSelectedUsers(new Set());
    setBulkActionDialogOpen(false);
    setBulkAction(null);
  };

  const handleAddUser = () => {
    const newId = `u${Date.now()}`;
    const user: User = {
      id: newId,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      role: newUser.role,
      status: 'active',
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setUsers(prev => [user, ...prev]);
    setNewUser({ firstName: '', lastName: '', email: '', role: 'learner' });
    setAddUserDialogOpen(false);
  };

  const columns: ColumnDef<User>[] = [
    {
      id: 'select',
      header: () => (
        <input
          type="checkbox"
          checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
          onChange={toggleAllSelection}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedUsers.has(row.original.id)}
          onChange={() => toggleUserSelection(row.original.id)}
          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={row.original.avatar} />
            <AvatarFallback className="text-xs">
              {row.original.firstName[0]}{row.original.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.original.firstName} {row.original.lastName}</p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
      accessorFn: (row) => `${row.firstName} ${row.lastName}`,
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.email}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant={getRoleBadgeVariant(row.original.role)} className="capitalize">
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => getStatusBadge(row.original.status),
    },
    {
      accessorKey: 'lastLogin',
      header: 'Last Login',
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.lastLogin)}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
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
              <Mail className="mr-2 h-4 w-4" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuItem>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Ban className="mr-2 h-4 w-4" />
              {row.original.status === 'suspended' ? 'Reactivate' : 'Suspend Account'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage platform accounts, roles, and permissions"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button onClick={() => setAddUserDialogOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </div>
        }
      />

      {/* Role Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {roleStats.map((stat) => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.count}
            icon={stat.icon}
            variant={stat.variant}
          />
        ))}
      </div>

      {/* Filters and Bulk Actions */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="learner">Learner</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.size > 0 && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {selectedUsers.size} selected
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      Bulk Actions
                      <ChevronDown className="ml-2 h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBulkAction('enable')}>
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                      Enable Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('disable')}>
                      <XCircle className="mr-2 h-4 w-4 text-gray-500" />
                      Disable Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBulkAction('changeRole')}>
                      <Shield className="mr-2 h-4 w-4 text-blue-500" />
                      Change Role
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => handleBulkAction('delete')}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUsers(new Set())}
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <DataTable
            columns={columns}
            data={filteredUsers}
            searchPlaceholder="Search users by name or email..."
            searchColumn="name"
          />
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={addUserDialogOpen} onOpenChange={setAddUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account. An invitation email will be sent automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  placeholder="Enter first name"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Enter last name"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="user@scholarly.edu.au"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value as User['role'] }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learner">Learner</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="flex items-start gap-2">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Invitation Email</p>
                  <p className="text-muted-foreground">
                    An email will be sent with login instructions and a temporary password.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddUserDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUser}
              disabled={!newUser.firstName || !newUser.lastName || !newUser.email}
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Users from CSV</DialogTitle>
            <DialogDescription>
              Bulk import users by uploading a CSV file with user data.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Upload area */}
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <FileSpreadsheet className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop your CSV file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Maximum file size: 10MB
              </p>
              <Button variant="outline">
                <Upload className="mr-2 h-4 w-4" />
                Browse Files
              </Button>
            </div>

            {/* Template download */}
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Download Template</p>
                    <p className="text-xs text-muted-foreground">
                      Get the CSV template with required columns
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  Download
                </Button>
              </div>
            </div>

            {/* Required columns info */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Required Columns</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-3 w-3 text-green-500" />
                  first_name
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-3 w-3 text-green-500" />
                  last_name
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-3 w-3 text-green-500" />
                  email
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Check className="h-3 w-3 text-green-500" />
                  role
                </div>
              </div>
            </div>

            {/* Warnings */}
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 text-amber-600" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">Important</p>
                  <ul className="text-amber-700 dark:text-amber-300 list-disc list-inside mt-1 space-y-1">
                    <li>Duplicate emails will be skipped</li>
                    <li>Invalid roles will default to &quot;learner&quot;</li>
                    <li>Users will receive invitation emails</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Import Users
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation Dialog */}
      <Dialog open={bulkActionDialogOpen} onOpenChange={setBulkActionDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'enable' && 'Enable Users'}
              {bulkAction === 'disable' && 'Disable Users'}
              {bulkAction === 'delete' && 'Delete Users'}
              {bulkAction === 'changeRole' && 'Change User Roles'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'enable' && `Enable ${selectedUsers.size} selected user(s)? They will regain access to the platform.`}
              {bulkAction === 'disable' && `Disable ${selectedUsers.size} selected user(s)? They will lose access to the platform.`}
              {bulkAction === 'delete' && `Permanently delete ${selectedUsers.size} selected user(s)? This action cannot be undone.`}
              {bulkAction === 'changeRole' && `Change the role of ${selectedUsers.size} selected user(s).`}
            </DialogDescription>
          </DialogHeader>

          {bulkAction === 'changeRole' && (
            <div className="py-4">
              <Label htmlFor="newRole">New Role</Label>
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learner">Learner</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {bulkAction === 'delete' && (
            <div className="py-4">
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-red-600" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <p className="font-medium">Warning: This action is permanent</p>
                    <p className="mt-1">All user data, progress, and associated records will be permanently deleted.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
              onClick={executeBulkAction}
            >
              {bulkAction === 'enable' && 'Enable Users'}
              {bulkAction === 'disable' && 'Disable Users'}
              {bulkAction === 'delete' && 'Delete Users'}
              {bulkAction === 'changeRole' && 'Change Roles'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
