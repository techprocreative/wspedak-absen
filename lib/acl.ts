import { secureStorage } from './secure-storage'
import { UserRole } from './auth'
import { hasPermission } from './permissions'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// ACL configuration
const ACL_RULES_KEY = 'acl_rules'
const ACL_RESOURCES_KEY = 'acl_resources'

// Resource types for ACL
export type ACLResourceType = 
  | 'user'
  | 'employee'
  | 'attendance'
  | 'report'
  | 'schedule'
  | 'setting'
  | 'notification'
  | 'file'
  | 'api_endpoint'
  | 'system'

// ACL actions
export type ACLAction = 
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'execute'
  | 'admin'
  | 'share'
  | 'export'
  | 'import'

// ACL rule interface
export interface ACLRule {
  id: string
  resourceType: ACLResourceType
  resourceId?: string // Specific resource ID, undefined for all resources of type
  action: ACLAction
  effect: 'allow' | 'deny'
  principal: {
    type: 'user' | 'role' | 'everyone' | 'authenticated' | 'anonymous'
    id?: string // User ID or role ID
  }
  conditions?: ACLCondition[]
  priority: number // Higher number = higher priority
  description?: string
  createdAt: string
  updatedAt: string
  createdBy: string
  isActive: boolean
}

// ACL condition interface
export interface ACLCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'exists' | 'not_exists'
  value: any
  caseSensitive?: boolean
}

// ACL resource interface
export interface ACLResource {
  id: string
  type: ACLResourceType
  name: string
  description?: string
  ownerId?: string
  metadata?: Record<string, any>
  createdAt: string
  updatedAt: string
  isPublic: boolean
  tags?: string[]
}

// ACL context interface
export interface ACLContext {
  userId: string
  userRole: UserRole
  userEmail?: string
  resourceId?: string
  resourceType?: ACLResourceType
  resourceOwnerId?: string
  action?: ACLAction
  ipAddress?: string
  userAgent?: string
  timestamp?: string
  additionalData?: Record<string, any>
}

// ACL check result interface
export interface ACLCheckResult {
  allowed: boolean
  reason?: string
  ruleId?: string
  priority?: number
  conditions?: string[]
}

// ACL manager class
export class ACLManager {
  private static instance: ACLManager
  private rules: ACLRule[]
  private resources: ACLResource[]

  private constructor() {
    this.rules = this.loadRules()
    this.resources = this.loadResources()
    this.initializeDefaultRules()
  }

  public static getInstance(): ACLManager {
    if (!ACLManager.instance) {
      ACLManager.instance = new ACLManager()
    }
    return ACLManager.instance
  }

  // Load rules from storage
  private loadRules(): ACLRule[] {
    try {
      return secureStorage.getItem<ACLRule[]>(ACL_RULES_KEY) || []
    } catch (error) {
      logger.error('Error loading ACL rules', error as Error)
      return []
    }
  }

  // Save rules to storage
  private saveRules(): void {
    try {
      secureStorage.setItem(ACL_RULES_KEY, this.rules)
    } catch (error) {
      logger.error('Error saving ACL rules', error as Error)
    }
  }

  // Load resources from storage
  private loadResources(): ACLResource[] {
    try {
      return secureStorage.getItem<ACLResource[]>(ACL_RESOURCES_KEY) || []
    } catch (error) {
      logger.error('Error loading ACL resources', error as Error)
      return []
    }
  }

  // Save resources to storage
  private saveResources(): void {
    try {
      secureStorage.setItem(ACL_RESOURCES_KEY, this.resources)
    } catch (error) {
      logger.error('Error saving ACL resources', error as Error)
    }
  }

  // Initialize default ACL rules
  private initializeDefaultRules(): void {
    if (this.rules.length === 0) {
      const now = new Date().toISOString()
      const defaultRules: ACLRule[] = [
        // Admin has full access to everything
        {
          id: 'acl_admin_full_access',
          resourceType: 'system',
          action: 'admin',
          effect: 'allow',
          principal: { type: 'role', id: 'admin' },
          priority: 1000,
          description: 'Admin has full access to all resources',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        },
        
        // HR can manage employees and attendance
        {
          id: 'acl_hr_employee_access',
          resourceType: 'employee',
          action: 'admin',
          effect: 'allow',
          principal: { type: 'role', id: 'hr' },
          priority: 900,
          description: 'HR can manage employees',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        },
        
        {
          id: 'acl_hr_attendance_access',
          resourceType: 'attendance',
          action: 'admin',
          effect: 'allow',
          principal: { type: 'role', id: 'hr' },
          priority: 900,
          description: 'HR can manage attendance',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        },
        
        // Manager can manage attendance and schedules
        {
          id: 'acl_manager_attendance_access',
          resourceType: 'attendance',
          action: 'admin',
          effect: 'allow',
          principal: { type: 'role', id: 'manager' },
          priority: 800,
          description: 'Manager can manage attendance',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        },
        
        {
          id: 'acl_manager_schedule_access',
          resourceType: 'schedule',
          action: 'admin',
          effect: 'allow',
          principal: { type: 'role', id: 'manager' },
          priority: 800,
          description: 'Manager can manage schedules',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        },
        
        // Employee can only read their own data
        {
          id: 'acl_employee_own_data',
          resourceType: 'user',
          action: 'read',
          effect: 'allow',
          principal: { type: 'user' },
          conditions: [
            { field: 'ownerId', operator: 'equals', value: 'context.userId' }
          ],
          priority: 700,
          description: 'Employee can read their own data',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        },
        
        {
          id: 'acl_employee_own_attendance',
          resourceType: 'attendance',
          action: 'read',
          effect: 'allow',
          principal: { type: 'user' },
          conditions: [
            { field: 'ownerId', operator: 'equals', value: 'context.userId' }
          ],
          priority: 700,
          description: 'Employee can read their own attendance',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        },
        
        // Deny all by default
        {
          id: 'acl_default_deny',
          resourceType: 'system',
          action: 'admin',
          effect: 'deny',
          principal: { type: 'everyone' },
          priority: 0,
          description: 'Default deny all',
          createdAt: now,
          updatedAt: now,
          createdBy: 'system',
          isActive: true,
        },
      ]
      
      this.rules = defaultRules
      this.saveRules()
    }
  }

  // Generate unique rule ID
  private generateRuleId(): string {
    return `acl_rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Create new ACL rule
  createRule(rule: Omit<ACLRule, 'id' | 'createdAt' | 'updatedAt'>): ACLRule {
    const newRule: ACLRule = {
      ...rule,
      id: this.generateRuleId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.rules.push(newRule)
    this.saveRules()
    return newRule
  }

  // Update ACL rule
  updateRule(id: string, updates: Partial<ACLRule>): boolean {
    const rule = this.rules.find(r => r.id === id)
    if (!rule) {
      return false
    }

    Object.assign(rule, updates, { updatedAt: new Date().toISOString() })
    this.saveRules()
    return true
  }

  // Delete ACL rule
  deleteRule(id: string): boolean {
    const index = this.rules.findIndex(r => r.id === id)
    if (index === -1) {
      return false
    }

    this.rules.splice(index, 1)
    this.saveRules()
    return true
  }

  // Get all ACL rules
  getRules(): ACLRule[] {
    return [...this.rules]
  }

  // Get ACL rule by ID
  getRuleById(id: string): ACLRule | null {
    return this.rules.find(r => r.id === id) || null
  }

  // Get ACL rules for a resource
  getRulesForResource(resourceType: ACLResourceType, resourceId?: string): ACLRule[] {
    return this.rules.filter(rule => 
      rule.resourceType === resourceType && 
      (rule.resourceId === resourceId || rule.resourceId === undefined) &&
      rule.isActive
    )
  }

  // Check access using ACL
  checkAccess(context: ACLContext): ACLCheckResult {
    // First check permission-based access
    if (context.action && context.resourceType) {
      const permissionId = `${context.resourceType}.${context.action}`
      const hasPermissionResult = hasPermission(
        context.userId,
        context.userRole,
        permissionId,
        context
      )
      
      if (!hasPermissionResult.granted) {
        return {
          allowed: false,
          reason: hasPermissionResult.reason || 'Permission denied',
        }
      }
    }

    // Get applicable rules
    const applicableRules = this.getApplicableRules(context)
    
    if (applicableRules.length === 0) {
      return {
        allowed: false,
        reason: 'No applicable ACL rules found',
      }
    }

    // Sort rules by priority (highest first)
    applicableRules.sort((a, b) => b.priority - a.priority)

    // Evaluate rules in order of priority
    for (const rule of applicableRules) {
      const evaluation = this.evaluateRule(rule, context)
      
      if (evaluation.matched) {
        return {
          allowed: rule.effect === 'allow',
          reason: rule.description || `Access ${rule.effect} by rule ${rule.id}`,
          ruleId: rule.id,
          priority: rule.priority,
          conditions: evaluation.matchedConditions,
        }
      }
    }

    // Default deny
    return {
      allowed: false,
      reason: 'Default deny - no matching rules',
    }
  }

  // Get applicable rules for context
  private getApplicableRules(context: ACLContext): ACLRule[] {
    return this.rules.filter(rule => {
      if (!rule.isActive) {
        return false
      }

      // Check resource type match
      if (rule.resourceType !== 'system' && rule.resourceType !== context.resourceType) {
        return false
      }

      // Check resource ID match if specified
      if (rule.resourceId && rule.resourceId !== context.resourceId) {
        return false
      }

      // Check action match
      if (rule.action !== 'admin' && rule.action !== context.action) {
        return false
      }

      // Check principal match
      if (!this.matchesPrincipal(rule.principal, context)) {
        return false
      }

      return true
    })
  }

  // Check if principal matches context
  private matchesPrincipal(principal: ACLRule['principal'], context: ACLContext): boolean {
    switch (principal.type) {
      case 'everyone':
        return true
      case 'authenticated':
        return !!context.userId
      case 'anonymous':
        return !context.userId
      case 'user':
        return principal.id === context.userId
      case 'role':
        return principal.id === context.userRole
      default:
        return false
    }
  }

  // Evaluate rule conditions
  private evaluateRule(rule: ACLRule, context: ACLContext): { matched: boolean; matchedConditions: string[] } {
    if (!rule.conditions || rule.conditions.length === 0) {
      return { matched: true, matchedConditions: [] }
    }

    const matchedConditions: string[] = []
    let allConditionsMatched = true

    for (const condition of rule.conditions) {
      const conditionResult = this.evaluateCondition(condition, context)
      if (conditionResult) {
        matchedConditions.push(`${condition.field} ${condition.operator} ${condition.value}`)
      } else {
        allConditionsMatched = false
        break
      }
    }

    return {
      matched: allConditionsMatched,
      matchedConditions,
    }
  }

  // Evaluate single condition
  private evaluateCondition(condition: ACLCondition, context: ACLContext): boolean {
    // Get field value from context
    let fieldValue = this.getFieldValue(condition.field, context)
    let conditionValue = condition.value

    // Handle special values like 'context.userId'
    if (typeof conditionValue === 'string' && conditionValue.startsWith('context.')) {
      const contextField = conditionValue.substring(8) // Remove 'context.'
      conditionValue = this.getFieldValue(contextField, context)
    }

    // Apply case sensitivity setting
    if (!condition.caseSensitive && typeof fieldValue === 'string' && typeof conditionValue === 'string') {
      fieldValue = fieldValue.toLowerCase()
      conditionValue = conditionValue.toLowerCase()
    }

    // Evaluate based on operator
    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue
      case 'not_equals':
        return fieldValue !== conditionValue
      case 'contains':
        return typeof fieldValue === 'string' && 
               typeof conditionValue === 'string' && 
               fieldValue.includes(conditionValue)
      case 'not_contains':
        return typeof fieldValue === 'string' && 
               typeof conditionValue === 'string' && 
               !fieldValue.includes(conditionValue)
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue)
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue)
      case 'greater_than':
        return typeof fieldValue === 'number' && 
               typeof conditionValue === 'number' && 
               fieldValue > conditionValue
      case 'less_than':
        return typeof fieldValue === 'number' && 
               typeof conditionValue === 'number' && 
               fieldValue < conditionValue
      case 'exists':
        return fieldValue !== undefined && fieldValue !== null && fieldValue !== ''
      case 'not_exists':
        return fieldValue === undefined || fieldValue === null || fieldValue === ''
      default:
        return false
    }
  }

  // Get field value from context
  private getFieldValue(field: string, context: ACLContext): any {
    const parts = field.split('.')
    let value: any = context

    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part]
      } else {
        return undefined
      }
    }

    return value
  }

  // Create ACL resource
  createResource(resource: Omit<ACLResource, 'id' | 'createdAt' | 'updatedAt'>): ACLResource {
    const newResource: ACLResource = {
      ...resource,
      id: `acl_res_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    this.resources.push(newResource)
    this.saveResources()
    return newResource
  }

  // Update ACL resource
  updateResource(id: string, updates: Partial<ACLResource>): boolean {
    const resource = this.resources.find(r => r.id === id)
    if (!resource) {
      return false
    }

    Object.assign(resource, updates, { updatedAt: new Date().toISOString() })
    this.saveResources()
    return true
  }

  // Delete ACL resource
  deleteResource(id: string): boolean {
    const index = this.resources.findIndex(r => r.id === id)
    if (index === -1) {
      return false
    }

    this.resources.splice(index, 1)
    this.saveResources()
    return true
  }

  // Get all ACL resources
  getResources(): ACLResource[] {
    return [...this.resources]
  }

  // Get ACL resource by ID
  getResourceById(id: string): ACLResource | null {
    return this.resources.find(r => r.id === id) || null
  }

  // Get ACL resources by type
  getResourcesByType(type: ACLResourceType): ACLResource[] {
    return this.resources.filter(r => r.type === type)
  }

  // Get ACL resources for user
  getResourcesForUser(userId: string): ACLResource[] {
    return this.resources.filter(r => r.ownerId === userId || r.isPublic)
  }

  // Check if user can access resource
  canAccessResource(
    userId: string,
    userRole: UserRole,
    resourceId: string,
    action: ACLAction,
    additionalContext?: Partial<ACLContext>
  ): ACLCheckResult {
    const resource = this.getResourceById(resourceId)
    if (!resource) {
      return {
        allowed: false,
        reason: 'Resource not found',
      }
    }

    const context: ACLContext = {
      userId,
      userRole,
      resourceId,
      resourceType: resource.type,
      resourceOwnerId: resource.ownerId,
      action,
      timestamp: new Date().toISOString(),
      ...additionalContext,
    }

    return this.checkAccess(context)
  }

  // Grant access to resource for user
  grantAccess(
    resourceId: string,
    userId: string,
    actions: ACLAction[],
    createdBy: string,
    conditions?: ACLCondition[],
    priority: number = 500
  ): ACLRule[] {
    const resource = this.getResourceById(resourceId)
    if (!resource) {
      throw new Error('Resource not found')
    }

    const rules: ACLRule[] = []
    const now = new Date().toISOString()

    for (const action of actions) {
      const rule: ACLRule = {
        id: this.generateRuleId(),
        resourceType: resource.type,
        resourceId,
        action,
        effect: 'allow',
        principal: { type: 'user', id: userId },
        conditions,
        priority,
        description: `Grant ${action} access to ${resource.name} for user ${userId}`,
        createdAt: now,
        updatedAt: now,
        createdBy,
        isActive: true,
      }

      this.rules.push(rule)
      rules.push(rule)
    }

    this.saveRules()
    return rules
  }

  // Revoke access to resource for user
  revokeAccess(
    resourceId: string,
    userId: string,
    actions?: ACLAction[]
  ): number {
    const resource = this.getResourceById(resourceId)
    if (!resource) {
      throw new Error('Resource not found')
    }

    let revokedCount = 0
    const rulesToRevoke = this.rules.filter(rule => 
      rule.resourceType === resource.type &&
      rule.resourceId === resourceId &&
      rule.principal.type === 'user' &&
      rule.principal.id === userId &&
      (!actions || actions.includes(rule.action))
    )

    for (const rule of rulesToRevoke) {
      rule.isActive = false
      rule.updatedAt = new Date().toISOString()
      revokedCount++
    }

    if (revokedCount > 0) {
      this.saveRules()
    }

    return revokedCount
  }

  // Clean up inactive rules
  cleanupInactiveRules(): number {
    const initialLength = this.rules.length
    this.rules = this.rules.filter(rule => rule.isActive)
    const removed = initialLength - this.rules.length

    if (removed > 0) {
      this.saveRules()
    }

    return removed
  }
}

// Export singleton instance
export const aclManager = ACLManager.getInstance()

// Export convenience functions
export const checkAccess = (context: ACLContext) => aclManager.checkAccess(context)
export const canAccessResource = (
  userId: string,
  userRole: UserRole,
  resourceId: string,
  action: ACLAction,
  additionalContext?: Partial<ACLContext>
) => aclManager.canAccessResource(userId, userRole, resourceId, action, additionalContext)
export const grantAccess = (
  resourceId: string,
  userId: string,
  actions: ACLAction[],
  createdBy: string,
  conditions?: ACLCondition[],
  priority?: number
) => aclManager.grantAccess(resourceId, userId, actions, createdBy, conditions, priority)
export const revokeAccess = (
  resourceId: string,
  userId: string,
  actions?: ACLAction[]
) => aclManager.revokeAccess(resourceId, userId, actions)