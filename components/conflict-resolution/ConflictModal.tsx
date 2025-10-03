/**
 * Conflict Modal Component
 * Provides interface for resolving individual conflicts
 */

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Conflict, ConflictedField, ResolutionStrategy, ConflictSeverity, ConflictCategory } from '@/lib/conflict-types';
import { formatDistanceToNow } from 'date-fns';

interface ConflictModalProps {
  conflict: Conflict | null;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (conflictId: string, resolution: Record<string, any>, strategy: ResolutionStrategy, notes?: string) => void;
  onAutoResolve: (conflictId: string, strategy: ResolutionStrategy) => void;
  onEscalate: (conflictId: string) => void;
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
 * Field Value Display Component
 */
const FieldValueDisplay: React.FC<{ 
  name: string; 
  value: any; 
  isLocal?: boolean;
  isSelected?: boolean;
  onSelect?: () => void;
}> = ({ name, value, isLocal = false, isSelected = false, onSelect }) => {
  const displayValue = value === null || value === undefined 
    ? 'null' 
    : typeof value === 'object' 
      ? JSON.stringify(value, null, 2) 
      : String(value);

  return (
    <div 
      className={`p-3 rounded-md border cursor-pointer transition-colors ${
        isSelected 
          ? 'border-primary bg-primary/10' 
          : 'border-border hover:border-primary/50'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-1">
        <span className="font-medium">{name}</span>
        <Badge variant="outline" className={isLocal ? 'bg-blue-50' : 'bg-green-50'}>
          {isLocal ? 'Local' : 'Remote'}
        </Badge>
      </div>
      <pre className="text-sm bg-muted p-2 rounded overflow-x-auto whitespace-pre-wrap">
        {displayValue}
      </pre>
    </div>
  );
};

/**
 * Conflict Modal Component
 */
export const ConflictModal: React.FC<ConflictModalProps> = ({
  conflict,
  isOpen,
  onClose,
  onResolve,
  onAutoResolve,
  onEscalate,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [resolutionStrategy, setResolutionStrategy] = useState<ResolutionStrategy>(ResolutionStrategy.LAST_WRITE_WINS);
  const [fieldResolutions, setFieldResolutions] = useState<Record<string, 'local' | 'remote' | 'custom'>>({});
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [applyToAllFields, setApplyToAllFields] = useState(true);

  // Initialize state when conflict changes
  useEffect(() => {
    if (conflict) {
      // Set default strategy based on severity
      if (conflict.metadata.severity === ConflictSeverity.LOW) {
        setResolutionStrategy(ResolutionStrategy.LAST_WRITE_WINS);
      } else {
        setResolutionStrategy(ResolutionStrategy.MANUAL);
      }
      
      // Initialize field resolutions
      const initialFieldResolutions: Record<string, 'local' | 'remote' | 'custom'> = {};
      conflict.conflictedFields.forEach(field => {
        initialFieldResolutions[field.name] = 'remote'; // Default to remote
      });
      setFieldResolutions(initialFieldResolutions);
      
      // Initialize custom field values
      const initialCustomValues: Record<string, string> = {};
      conflict.conflictedFields.forEach(field => {
        initialCustomValues[field.name] = '';
      });
      setCustomFieldValues(initialCustomValues);
      
      // Reset notes
      setResolutionNotes('');
    }
  }, [conflict]);

  // Handle field resolution change
  const handleFieldResolutionChange = (fieldName: string, resolution: 'local' | 'remote' | 'custom') => {
    setFieldResolutions(prev => ({
      ...prev,
      [fieldName]: resolution
    }));
  };

  // Handle custom field value change
  const handleCustomFieldValueChange = (fieldName: string, value: string) => {
    setCustomFieldValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  // Apply resolution strategy to all fields
  const applyStrategyToAllFields = () => {
    const newFieldResolutions: Record<string, 'local' | 'remote' | 'custom'> = {};
    
    conflict?.conflictedFields.forEach(field => {
      switch (resolutionStrategy) {
        case ResolutionStrategy.LAST_WRITE_WINS:
          newFieldResolutions[field.name] = 'remote';
          break;
        case ResolutionStrategy.FIRST_WRITE_WINS:
          newFieldResolutions[field.name] = 'local';
          break;
        case ResolutionStrategy.MANUAL:
          // Keep current selection
          newFieldResolutions[field.name] = fieldResolutions[field.name] || 'remote';
          break;
        default:
          newFieldResolutions[field.name] = 'remote';
      }
    });
    
    setFieldResolutions(newFieldResolutions);
  };

  // Apply strategy to all fields when strategy changes
  useEffect(() => {
    if (applyToAllFields && conflict) {
      applyStrategyToAllFields();
    }
  }, [resolutionStrategy, applyToAllFields, conflict]);

  // Build resolution object
  const buildResolution = (): Record<string, any> => {
    if (!conflict) return {};
    
    const resolution: Record<string, any> = {};
    
    conflict.conflictedFields.forEach(field => {
      const fieldResolution = fieldResolutions[field.name];
      
      switch (fieldResolution) {
        case 'local':
          resolution[field.name] = field.localValue;
          break;
        case 'remote':
          resolution[field.name] = field.remoteValue;
          break;
        case 'custom':
          try {
            // Try to parse as JSON, if fails use as string
            resolution[field.name] = JSON.parse(customFieldValues[field.name]);
          } catch {
            resolution[field.name] = customFieldValues[field.name];
          }
          break;
      }
    });
    
    return resolution;
  };

  // Handle manual resolution
  const handleManualResolve = () => {
    if (!conflict) return;
    
    const resolution = buildResolution();
    onResolve(conflict.metadata.id, resolution, resolutionStrategy, resolutionNotes);
  };

  // Handle auto resolution
  const handleAutoResolve = () => {
    if (!conflict) return;
    
    onAutoResolve(conflict.metadata.id, resolutionStrategy);
  };

  // Handle escalate
  const handleEscalate = () => {
    if (!conflict) return;
    
    onEscalate(conflict.metadata.id);
  };

  if (!conflict) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-xl">
                Conflict Resolution: {conflict.metadata.entityType}
              </DialogTitle>
              <DialogDescription className="mt-1">
                ID: {conflict.metadata.entityId} • Detected {formatDistanceToNow(conflict.metadata.timestamp, { addSuffix: true })}
              </DialogDescription>
            </div>
            <div className="flex space-x-2">
              <Badge className={getSeverityBadgeColor(conflict.metadata.severity)}>
                {conflict.metadata.severity}
              </Badge>
              <Badge className={getCategoryBadgeColor(conflict.metadata.category)}>
                {conflict.metadata.category.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="resolution">Resolution</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conflict Information</CardTitle>
                <CardDescription>
                  Details about the detected conflict
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Entity Type</Label>
                    <div className="mt-1">{conflict.metadata.entityType}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Entity ID</Label>
                    <div className="mt-1">{conflict.metadata.entityId}</div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Severity</Label>
                    <div className="mt-1">
                      <Badge className={getSeverityBadgeColor(conflict.metadata.severity)}>
                        {conflict.metadata.severity}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Category</Label>
                    <div className="mt-1">
                      <Badge className={getCategoryBadgeColor(conflict.metadata.category)}>
                        {conflict.metadata.category.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Detected</Label>
                    <div className="mt-1">
                      {conflict.metadata.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Retry Count</Label>
                    <div className="mt-1">{conflict.metadata.retryCount}</div>
                  </div>
                </div>
                
                {conflict.metadata.error && (
                  <div>
                    <Label className="text-sm font-medium">Error</Label>
                    <div className="mt-1 p-3 bg-red-50 text-red-800 rounded-md">
                      {conflict.metadata.error}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Conflicted Fields</CardTitle>
                <CardDescription>
                  {conflict.conflictedFields.length} field(s) have conflicting values
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conflict.conflictedFields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <h4 className="font-medium">{field.name}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldValueDisplay
                          name={field.name}
                          value={field.localValue}
                          isLocal={true}
                        />
                        <FieldValueDisplay
                          name={field.name}
                          value={field.remoteValue}
                          isLocal={false}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="resolution" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resolution Strategy</CardTitle>
                <CardDescription>
                  Choose how to resolve this conflict
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Strategy</Label>
                    <Select value={resolutionStrategy} onValueChange={(value: string) => setResolutionStrategy(value as ResolutionStrategy)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ResolutionStrategy.LAST_WRITE_WINS}>
                          Last Write Wins
                        </SelectItem>
                        <SelectItem value={ResolutionStrategy.FIRST_WRITE_WINS}>
                          First Write Wins
                        </SelectItem>
                        <SelectItem value={ResolutionStrategy.FIELD_LEVEL}>
                          Field Level Resolution
                        </SelectItem>
                        <SelectItem value={ResolutionStrategy.MANUAL}>
                          Manual Resolution
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="apply-to-all"
                      checked={applyToAllFields}
                      onCheckedChange={setApplyToAllFields}
                    />
                    <Label htmlFor="apply-to-all">Apply to all fields</Label>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    onClick={handleAutoResolve}
                    disabled={isLoading || resolutionStrategy === ResolutionStrategy.MANUAL}
                  >
                    Auto Resolve
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={handleEscalate}
                    disabled={isLoading}
                  >
                    Escalate
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Field Resolution</CardTitle>
                <CardDescription>
                  Choose values for each conflicted field
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {conflict.conflictedFields.map((field) => (
                    <div key={field.name} className="space-y-4">
                      <h4 className="font-medium">{field.name}</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Resolution</Label>
                          <Select 
                            value={fieldResolutions[field.name]} 
                            onValueChange={(value: string) => handleFieldResolutionChange(field.name, value as 'local' | 'remote' | 'custom')}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">Use Local Value</SelectItem>
                              <SelectItem value="remote">Use Remote Value</SelectItem>
                              <SelectItem value="custom">Custom Value</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {fieldResolutions[field.name] === 'custom' && (
                          <div className="md:col-span-2">
                            <Label className="text-sm font-medium">Custom Value</Label>
                            <Textarea
                              className="mt-1"
                              placeholder="Enter custom value (JSON format for objects)"
                              value={customFieldValues[field.name]}
                              onChange={(e) => handleCustomFieldValueChange(field.name, e.target.value)}
                              rows={3}
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FieldValueDisplay
                          name={field.name}
                          value={field.localValue}
                          isLocal={true}
                          isSelected={fieldResolutions[field.name] === 'local'}
                          onSelect={() => handleFieldResolutionChange(field.name, 'local')}
                        />
                        <FieldValueDisplay
                          name={field.name}
                          value={field.remoteValue}
                          isLocal={false}
                          isSelected={fieldResolutions[field.name] === 'remote'}
                          onSelect={() => handleFieldResolutionChange(field.name, 'remote')}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-6">
                  <Label className="text-sm font-medium">Resolution Notes</Label>
                  <Textarea
                    className="mt-1"
                    placeholder="Add notes about this resolution..."
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                  />
                </div>
                
                <div className="flex justify-end space-x-2 mt-6">
                  <Button variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleManualResolve} disabled={isLoading}>
                    Resolve Conflict
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Conflict History</CardTitle>
                <CardDescription>
                  Timeline of events for this conflict
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-md">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <div>
                      <div className="font-medium">Conflict Detected</div>
                      <div className="text-sm text-muted-foreground">
                        {conflict.metadata.timestamp.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  
                  {conflict.metadata.retryCount > 0 && (
                    <div className="flex items-center space-x-4 p-4 bg-yellow-50 rounded-md">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div>
                        <div className="font-medium">Resolution Attempted</div>
                        <div className="text-sm text-muted-foreground">
                          {conflict.metadata.lastAttemptAt?.toLocaleString()}
                        </div>
                        {conflict.metadata.error && (
                          <div className="text-sm text-red-600 mt-1">
                            Error: {conflict.metadata.error}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {conflict.metadata.resolved && (
                    <div className="flex items-center space-x-4 p-4 bg-green-50 rounded-md">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <div className="font-medium">Conflict Resolved</div>
                        <div className="text-sm text-muted-foreground">
                          {conflict.metadata.resolvedAt?.toLocaleString()}
                        </div>
                        <div className="text-sm mt-1">
                          Strategy: {conflict.metadata.resolutionStrategy?.replace('_', ' ')}
                        </div>
                        {conflict.metadata.resolvedBy && (
                          <div className="text-sm mt-1">
                            Resolved by: {conflict.metadata.resolvedBy}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};