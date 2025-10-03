/**
 * Conflict Status Component
 * Shows conflict status indicators and notifications
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, AlertTriangle, CheckCircle, XCircle, Info } from 'lucide-react';
import { Conflict, ConflictSeverity, ConflictNotification } from '@/lib/conflict-types';
import { useConflictResolutionContext } from './ConflictResolutionProvider';
import { formatDistanceToNow } from 'date-fns';

interface ConflictStatusProps {
  showDetails?: boolean;
  onOpenConflictList?: () => void;
  className?: string;
}

/**
 * Get severity icon
 */
const getSeverityIcon = (severity: ConflictSeverity) => {
  switch (severity) {
    case ConflictSeverity.LOW:
      return <Info className="h-4 w-4" />;
    case ConflictSeverity.MEDIUM:
      return <AlertTriangle className="h-4 w-4" />;
    case ConflictSeverity.HIGH:
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    case ConflictSeverity.CRITICAL:
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

/**
 * Get severity color
 */
const getSeverityColor = (severity: ConflictSeverity): string => {
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
 * Get notification icon
 */
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'new':
      return <AlertTriangle className="h-4 w-4" />;
    case 'resolved':
      return <CheckCircle className="h-4 w-4" />;
    case 'escalated':
      return <XCircle className="h-4 w-4" />;
    default:
      return <Info className="h-4 w-4" />;
  }
};

/**
 * Notification Item Component
 */
const NotificationItem: React.FC<{
  notification: ConflictNotification;
  conflict?: Conflict;
  onViewConflict: (conflictId: string) => void;
  onMarkAsRead: (notificationId: string) => void;
}> = ({ notification, conflict, onViewConflict, onMarkAsRead }) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    if (conflict) {
      onViewConflict(conflict.metadata.id);
    }
  };

  return (
    <div
      className={`p-3 border-b cursor-pointer transition-colors ${
        notification.read ? 'bg-background' : 'bg-blue-50'
      } ${isHovered ? 'bg-muted' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-start space-x-3">
        <div className="mt-0.5">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between">
            <p className="text-sm font-medium truncate">
              {notification.message}
            </p>
            {!notification.read && (
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
          </p>
          {conflict && (
            <div className="flex items-center mt-2 space-x-2">
              <Badge className={getSeverityColor(conflict.metadata.severity)}>
                {conflict.metadata.severity}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {conflict.metadata.entityType}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Conflict Status Component
 */
export const ConflictStatus: React.FC<ConflictStatusProps> = ({
  showDetails = true,
  onOpenConflictList,
  className = ''
}) => {
  const { state, viewConflict, markNotificationAsRead, openConflictModal } = useConflictResolutionContext();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  const { conflicts, stats, notifications } = state;
  
  // Get unread notifications count
  const unreadNotificationsCount = notifications.filter(n => !n.read).length;
  
  // Get pending conflicts count
  const pendingConflictsCount = conflicts.filter(c => !c.metadata.resolved).length;
  
  // Get highest severity among pending conflicts
  const highestSeverity = conflicts
    .filter(c => !c.metadata.resolved)
    .reduce((highest, conflict) => {
      if (!highest || conflict.metadata.severity > highest) {
        return conflict.metadata.severity;
      }
      return highest;
    }, ConflictSeverity.LOW as ConflictSeverity);

  // Get recent notifications (last 5)
  const recentNotifications = notifications
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 5);

  // Handle view conflict
  const handleViewConflict = (conflictId: string) => {
    viewConflict(conflictId);
    setIsPopoverOpen(false);
  };

  // Handle mark as read
  const handleMarkAsRead = (notificationId: string) => {
    markNotificationAsRead(notificationId);
  };

  // Handle open conflict list
  const handleOpenConflictList = () => {
    if (onOpenConflictList) {
      onOpenConflictList();
    } else {
      openConflictModal();
    }
    setIsPopoverOpen(false);
  };

  return (
    <div className={className}>
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
            {pendingConflictsCount > 0 && (
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-xs text-white">
                {pendingConflictsCount > 9 ? '9+' : pendingConflictsCount}
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="end">
          <Card className="border-0 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Conflict Status</CardTitle>
              <CardDescription>
                {pendingConflictsCount} pending conflict(s) • {unreadNotificationsCount} unread notification(s)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {showDetails && (
                <div className="border-t">
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Total Conflicts</span>
                      <Badge variant="outline">{stats.total}</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Pending</span>
                      <Badge variant="outline" className="bg-yellow-50 text-yellow-800">
                        {stats.pending}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Resolved</span>
                      <Badge variant="outline" className="bg-green-50 text-green-800">
                        {stats.resolved}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Critical</span>
                      <Badge variant="outline" className="bg-red-50 text-red-800">
                        {stats.bySeverity.critical}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
              
              {recentNotifications.length > 0 && (
                <div className="border-t">
                  <div className="p-3 border-b">
                    <h4 className="text-sm font-medium">Recent Notifications</h4>
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {recentNotifications.map(notification => {
                      const conflict = conflicts.find(c => c.metadata.id === notification.conflictId);
                      return (
                        <NotificationItem
                          key={notification.id}
                          notification={notification}
                          conflict={conflict}
                          onViewConflict={handleViewConflict}
                          onMarkAsRead={handleMarkAsRead}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
              
              <div className="p-3 border-t">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start"
                  onClick={handleOpenConflictList}
                >
                  View All Conflicts
                </Button>
              </div>
            </CardContent>
          </Card>
        </PopoverContent>
      </Popover>
    </div>
  );
};

/**
 * Compact Conflict Status Component
 * Shows a minimal indicator for conflicts
 */
export const CompactConflictStatus: React.FC<{
  onClick?: () => void;
  className?: string;
}> = ({ onClick, className = '' }) => {
  const { state } = useConflictResolutionContext();
  const { conflicts, stats } = state;
  
  const pendingConflictsCount = conflicts.filter(c => !c.metadata.resolved).length;
  
  if (pendingConflictsCount === 0) {
    return null;
  }
  
  // Get highest severity among pending conflicts
  const highestSeverity = conflicts
    .filter(c => !c.metadata.resolved)
    .reduce((highest, conflict) => {
      if (!highest || conflict.metadata.severity > highest) {
        return conflict.metadata.severity;
      }
      return highest;
    }, ConflictSeverity.LOW as ConflictSeverity);

  return (
    <div 
      className={`flex items-center space-x-1 cursor-pointer ${className}`}
      onClick={onClick}
    >
      {getSeverityIcon(highestSeverity)}
      <Badge className={getSeverityColor(highestSeverity)}>
        {pendingConflictsCount}
      </Badge>
    </div>
  );
};

/**
 * Conflict Summary Component
 * Shows a summary of conflict statistics
 */
export const ConflictSummary: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const { state, openConflictModal } = useConflictResolutionContext();
  const { stats } = state;
  
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center space-x-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Conflict Summary</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total</span>
              <span className="font-medium">{stats.total}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="font-medium text-yellow-600">{stats.pending}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Resolved</span>
              <span className="font-medium text-green-600">{stats.resolved}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Critical</span>
              <span className="font-medium text-red-600">{stats.bySeverity.critical}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">High</span>
              <span className="font-medium text-orange-600">{stats.bySeverity.high}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Medium</span>
              <span className="font-medium text-yellow-600">{stats.bySeverity.medium}</span>
            </div>
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full mt-4"
          onClick={() => openConflictModal()}
        >
          View Conflicts
        </Button>
      </CardContent>
    </Card>
  );
};