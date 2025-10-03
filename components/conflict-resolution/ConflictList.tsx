/**
 * Conflict List Component
 * Displays detected conflicts with filtering and sorting options
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Conflict, ConflictSeverity, ConflictCategory, ResolutionOutcome } from '@/lib/conflict-types';
import { formatDistanceToNow } from 'date-fns';

interface ConflictListProps {
  conflicts: Conflict[];
  onResolveConflict: (conflictId: string) => void;
  onViewConflict: (conflictId: string) => void;
  onClearResolved: () => void;
  isLoading?: boolean;
}

/**
 * Get severity badge color
 */
const getSeverityBadgeColor = (severity: ConflictSeverity): string => {
  switch (severity) {
    case ConflictSeverity.LOW:
      return 'bg-green-100 text-green-800';
    case ConflictSeverity.MEDIUM:
      return 'bg-yellow-100 text-yellow-800';
    case ConflictSeverity.HIGH:
      return 'bg-orange-100 text-orange-800';
    case ConflictSeverity.CRITICAL:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get category badge color
 */
const getCategoryBadgeColor = (category: ConflictCategory): string => {
  switch (category) {
    case ConflictCategory.ATTENDANCE:
      return 'bg-blue-100 text-blue-800';
    case ConflictCategory.USER:
      return 'bg-purple-100 text-purple-800';
    case ConflictCategory.SETTINGS:
      return 'bg-indigo-100 text-indigo-800';
    case ConflictCategory.SYNC_METADATA:
      return 'bg-pink-100 text-pink-800';
    case ConflictCategory.CUSTOM:
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get resolution status badge color
 */
const getResolutionBadgeColor = (resolved: boolean, outcome?: ResolutionOutcome): string => {
  if (!resolved) {
    return 'bg-yellow-100 text-yellow-800';
  }
  
  switch (outcome) {
    case ResolutionOutcome.AUTO_RESOLVED:
      return 'bg-green-100 text-green-800';
    case ResolutionOutcome.MANUALLY_RESOLVED:
      return 'bg-blue-100 text-blue-800';
    case ResolutionOutcome.IGNORED:
      return 'bg-gray-100 text-gray-800';
    case ResolutionOutcome.ESCALATED:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

/**
 * Get resolution status text
 */
const getResolutionStatusText = (resolved: boolean, outcome?: ResolutionOutcome): string => {
  if (!resolved) {
    return 'Pending';
  }
  
  switch (outcome) {
    case ResolutionOutcome.AUTO_RESOLVED:
      return 'Auto Resolved';
    case ResolutionOutcome.MANUALLY_RESOLVED:
      return 'Manually Resolved';
    case ResolutionOutcome.IGNORED:
      return 'Ignored';
    case ResolutionOutcome.ESCALATED:
      return 'Escalated';
    default:
      return 'Resolved';
  }
};

/**
 * Conflict List Component
 */
export const ConflictList: React.FC<ConflictListProps> = ({
  conflicts,
  onResolveConflict,
  onViewConflict,
  onClearResolved,
  isLoading = false
}) => {
  const [filteredConflicts, setFilteredConflicts] = useState<Conflict[]>(conflicts);
  const [searchTerm, setSearchTerm] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('timestamp');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Filter and sort conflicts
  useEffect(() => {
    let result = [...conflicts];
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(conflict => 
        conflict.metadata.entityId.toLowerCase().includes(term) ||
        conflict.metadata.entityType.toLowerCase().includes(term) ||
        conflict.conflictedFields.some(field => 
          field.name.toLowerCase().includes(term)
        )
      );
    }
    
    // Apply severity filter
    if (severityFilter !== 'all') {
      result = result.filter(conflict => conflict.metadata.severity === severityFilter);
    }
    
    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter(conflict => conflict.metadata.category === categoryFilter);
    }
    
    // Apply status filter
    if (statusFilter === 'resolved') {
      result = result.filter(conflict => conflict.metadata.resolved);
    } else if (statusFilter === 'pending') {
      result = result.filter(conflict => !conflict.metadata.resolved);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'timestamp':
          aValue = a.metadata.timestamp.getTime();
          bValue = b.metadata.timestamp.getTime();
          break;
        case 'severity':
          const severityOrder = {
            [ConflictSeverity.LOW]: 1,
            [ConflictSeverity.MEDIUM]: 2,
            [ConflictSeverity.HIGH]: 3,
            [ConflictSeverity.CRITICAL]: 4
          };
          aValue = severityOrder[a.metadata.severity];
          bValue = severityOrder[b.metadata.severity];
          break;
        case 'entityType':
          aValue = a.metadata.entityType;
          bValue = b.metadata.entityType;
          break;
        case 'status':
          aValue = a.metadata.resolved ? 1 : 0;
          bValue = b.metadata.resolved ? 1 : 0;
          break;
        default:
          aValue = a.metadata.timestamp.getTime();
          bValue = b.metadata.timestamp.getTime();
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
    
    setFilteredConflicts(result);
  }, [conflicts, searchTerm, severityFilter, categoryFilter, statusFilter, sortBy, sortOrder]);

  // Get conflict counts
  const totalConflicts = conflicts.length;
  const pendingConflicts = conflicts.filter(c => !c.metadata.resolved).length;
  const resolvedConflicts = conflicts.filter(c => c.metadata.resolved).length;
  const criticalConflicts = conflicts.filter(c => c.metadata.severity === ConflictSeverity.CRITICAL).length;

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total Conflicts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalConflicts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{pendingConflicts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Resolved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{resolvedConflicts}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Critical</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalConflicts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Conflict Filters</CardTitle>
          <CardDescription>Filter and sort conflicts to find what you're looking for</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Search</label>
              <Input
                placeholder="Search conflicts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severities</SelectItem>
                  <SelectItem value={ConflictSeverity.LOW}>Low</SelectItem>
                  <SelectItem value={ConflictSeverity.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={ConflictSeverity.HIGH}>High</SelectItem>
                  <SelectItem value={ConflictSeverity.CRITICAL}>Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Category</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value={ConflictCategory.ATTENDANCE}>Attendance</SelectItem>
                  <SelectItem value={ConflictCategory.USER}>User</SelectItem>
                  <SelectItem value={ConflictCategory.SETTINGS}>Settings</SelectItem>
                  <SelectItem value={ConflictCategory.SYNC_METADATA}>Sync Metadata</SelectItem>
                  <SelectItem value={ConflictCategory.CUSTOM}>Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-1 block">Sort By</label>
              <div className="flex space-x-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="timestamp">Date</SelectItem>
                    <SelectItem value="severity">Severity</SelectItem>
                    <SelectItem value="entityType">Entity Type</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="icon" onClick={toggleSortOrder}>
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Conflict List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Conflicts</CardTitle>
              <CardDescription>
                Showing {filteredConflicts.length} of {totalConflicts} conflicts
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              onClick={onClearResolved}
              disabled={resolvedConflicts === 0}
            >
              Clear Resolved
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : filteredConflicts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No conflicts found
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Conflicted Fields</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConflicts.map((conflict) => (
                  <TableRow key={conflict.metadata.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{conflict.metadata.entityType}</div>
                        <div className="text-sm text-muted-foreground">
                          ID: {conflict.metadata.entityId}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getSeverityBadgeColor(conflict.metadata.severity)}>
                        {conflict.metadata.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryBadgeColor(conflict.metadata.category)}>
                        {conflict.metadata.category.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {conflict.conflictedFields.length} field(s)
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {conflict.conflictedFields.slice(0, 2).map(f => f.name).join(', ')}
                        {conflict.conflictedFields.length > 2 && '...'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getResolutionBadgeColor(conflict.metadata.resolved, conflict.metadata.resolutionOutcome)}>
                        {getResolutionStatusText(conflict.metadata.resolved, conflict.metadata.resolutionOutcome)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {formatDistanceToNow(conflict.metadata.timestamp, { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewConflict(conflict.metadata.id)}
                        >
                          View
                        </Button>
                        {!conflict.metadata.resolved && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onResolveConflict(conflict.metadata.id)}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};