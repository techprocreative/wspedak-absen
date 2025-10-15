import { secureStorage } from './secure-storage'
import { UserRole } from './auth'

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Permission system configuration
const PERMISSIONS_KEY = 'system_permissions'
const ROLES_KEY = 'system_roles'
const USER_PERMISSIONS_KEY = 'user_permissions'
const ROLE_PERMISSIONS_KEY = 'role_permissions'

// Permission types
export type PermissionAction = 'create' | 'read' | 'update' | 'delete' | 'execute' | 'admin'
export type ResourceType = 
  | 'users' 
  | 'employees' 
  | 'attendance' 
  | 'reports' 
  | 'settings' 
  | 'security' 
  | 'audit' 
  | 'schedules' 
  | 'notifications' 
  | 'dashboard'
  | 'system'

// Permission interface
export interface Permission {
  id: string
  name: string
  description: string
  resource: ResourceType
  action: PermissionAction
  conditions?: string[] // Additional conditions for the permission
  isSystem: boolean // System permissions cannot be deleted
}

// Role interface
export interface Role {
  id: string
  name: string
  description: string
  isSystem: boolean // System roles cannot be deleted
  permissions: string[] // Permission IDs
  inheritsFrom?: string[] // Role IDs to inherit permissions from
  createdAt: string
  updatedAt: string
}

// User permission override interface
export interface UserPermissionOverride {
  userId: string
  permissionId: string
  granted: boolean // true to grant, false to deny
  reason?: string
  grantedBy: string
  grantedAt: string
  expiresAt?: string
}

// Permission check result
export interface PermissionCheckResult {
  granted: boolean
  reason?: string
  source: 'role' | 'direct' | 'inherited' | 'denied'
}

// Access control context
export interface AccessContext {
  userId: string
  userRole: UserRole
  resourceId?: string
  resourceOwnerId?: string
  ipAddress?: string
  userAgent?: string
  timestamp?: string
}

// Permission manager class
export class PermissionManager {
  private static instance: PermissionManager
  private permissions: Permission[]
  private roles: Role[]
  private userPermissions: UserPermissionOverride[]
  private rolePermissions: Map<string, string[]> // role ID -> permission IDs

  private constructor() {
    this.permissions = this.loadPermissions()
    this.roles = this.loadRoles()
    this.userPermissions = this.loadUserPermissions()
    this.rolePermissions = this.loadRolePermissions()
    this.initializeSystemPermissions()
  }

  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager()
    }
    return PermissionManager.instance
  }

  // Initialize system permissions and roles
  private initializeSystemPermissions(): void {
    if (this.permissions.length === 0) {
      this.createSystemPermissions()
    }
    if (this.roles.length === 0) {
      this.createSystemRoles()
    }
  }

  // Create system permissions
  private createSystemPermissions(): void {
    const systemPermissions: Permission[] = [
      // User management
      { id: 'users.create', name: 'Create Users', description: 'Create new user accounts', resource: 'users', action: 'create', isSystem: true },
      { id: 'users.read', name: 'View Users', description: 'View user information', resource: 'users', action: 'read', isSystem: true },
      { id: 'users.update', name: 'Update Users', description: 'Update user information', resource: 'users', action: 'update', isSystem: true },
      { id: 'users.delete', name: 'Delete Users', description: 'Delete user accounts', resource: 'users', action: 'delete', isSystem: true },
      { id: 'users.admin', name: 'Admin Users', description: 'Full administrative control over users', resource: 'users', action: 'admin', isSystem: true },

      // Employee management
      { id: 'employees.create', name: 'Create Employees', description: 'Create new employee records', resource: 'employees', action: 'create', isSystem: true },
      { id: 'employees.read', name: 'View Employees', description: 'View employee information', resource: 'employees', action: 'read', isSystem: true },
      { id: 'employees.update', name: 'Update Employees', description: 'Update employee information', resource: 'employees', action: 'update', isSystem: true },
      { id: 'employees.delete', name: 'Delete Employees', description: 'Delete employee records', resource: 'employees', action: 'delete', isSystem: true },

      // Attendance management
      { id: 'attendance.create', name: 'Create Attendance', description: 'Create attendance records', resource: 'attendance', action: 'create', isSystem: true },
      { id: 'attendance.read', name: 'View Attendance', description: 'View attendance records', resource: 'attendance', action: 'read', isSystem: true },
      { id: 'attendance.update', name: 'Update Attendance', description: 'Update attendance records', resource: 'attendance', action: 'update', isSystem: true },
      { id: 'attendance.delete', name: 'Delete Attendance', description: 'Delete attendance records', resource: 'attendance', action: 'delete', isSystem: true },

      // Reports
      { id: 'reports.read', name: 'View Reports', description: 'View system reports', resource: 'reports', action: 'read', isSystem: true },
      { id: 'reports.create', name: 'Create Reports', description: 'Generate new reports', resource: 'reports', action: 'create', isSystem: true },
      { id: 'reports.export', name: 'Export Reports', description: 'Export reports to various formats', resource: 'reports', action: 'execute', isSystem: true },

      // Settings
      { id: 'settings.read', name: 'View Settings', description: 'View system settings', resource: 'settings', action: 'read', isSystem: true },
      { id: 'settings.update', name: 'Update Settings', description: 'Update system settings', resource: 'settings', action: 'update', isSystem: true },

      // Security
      { id: 'security.read', name: 'View Security', description: 'View security settings and logs', resource: 'security', action: 'read', isSystem: true },
      { id: 'security.update', name: 'Update Security', description: 'Update security settings', resource: 'security', action: 'update', isSystem: true },
      { id: 'security.admin', name: 'Admin Security', description: 'Full administrative control over security', resource: 'security', action: 'admin', isSystem: true },

      // Audit
      { id: 'audit.read', name: 'View Audit Logs', description: 'View system audit logs', resource: 'audit', action: 'read', isSystem: true },
      { id: 'audit.export', name: 'Export Audit Logs', description: 'Export audit logs', resource: 'audit', action: 'execute', isSystem: true },

      // Schedules
      { id: 'schedules.create', name: 'Create Schedules', description: 'Create work schedules', resource: 'schedules', action: 'create', isSystem: true },
      { id: 'schedules.read', name: 'View Schedules', description: 'View work schedules', resource: 'schedules', action: 'read', isSystem: true },
      { id: 'schedules.update', name: 'Update Schedules', description: 'Update work schedules', resource: 'schedules', action: 'update', isSystem: true },
      { id: 'schedules.delete', name: 'Delete Schedules', description: 'Delete work schedules', resource: 'schedules', action: 'delete', isSystem: true },

      // Notifications
      { id: 'notifications.read', name: 'View Notifications', description: 'View system notifications', resource: 'notifications', action: 'read', isSystem: true },
      { id: 'notifications.send', name: 'Send Notifications', description: 'Send system notifications', resource: 'notifications', action: 'create', isSystem: true },

      // Dashboard
      { id: 'dashboard.read', name: 'View Dashboard', description: 'View main dashboard', resource: 'dashboard', action: 'read', isSystem: true },

      // System
      { id: 'system.admin', name: 'System Admin', description: 'Full system administration', resource: 'system', action: 'admin', isSystem: true },
      { id: 'system.monitor', name: 'System Monitor', description: 'Monitor system health and performance', resource: 'system', action: 'read', isSystem: true },
    ]

    this.permissions = systemPermissions
    this.savePermissions()
  }

  // Create system roles
  private createSystemRoles(): void {
    const now = new Date().toISOString()
    const systemRoles: Role[] = [
      {
        id: 'admin',
        name: 'Administrator',
        description: 'Full system access with all permissions',
        isSystem: true,
        permissions: this.permissions.map(p => p.id), // All permissions
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'hr',
        name: 'HR Manager',
        description: 'Human resources management access',
        isSystem: true,
        permissions: [
          'employees.create', 'employees.read', 'employees.update',
          'attendance.create', 'attendance.read', 'attendance.update',
          'reports.read', 'reports.create', 'reports.export',
          'schedules.create', 'schedules.read', 'schedules.update',
          'notifications.read', 'notifications.send',
          'dashboard.read',
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'manager',
        name: 'Manager',
        description: 'Department management access',
        isSystem: true,
        permissions: [
          'employees.read', 'employees.update',
          'attendance.create', 'attendance.read', 'attendance.update',
          'reports.read', 'reports.create',
          'schedules.read', 'schedules.update',
          'notifications.read',
          'dashboard.read',
        ],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'employee',
        name: 'Employee',
        description: 'Basic employee access',
        isSystem: true,
        permissions: [
          'attendance.create', 'attendance.read',
          'schedules.read',
          'notifications.read',
          'dashboard.read',
        ],
        createdAt: now,
        updatedAt: now,
      },
    ]

    this.roles = systemRoles
    this.saveRoles()
    this.updateRolePermissions()
  }

  // Load permissions from storage
  private loadPermissions(): Permission[] {
    try {
      return secureStorage.getItem<Permission[]>(PERMISSIONS_KEY) || []
    } catch (error) {
      logger.error('Error loading permissions', error as Error)
      return []
    }
  }

  // Save permissions to storage
  private savePermissions(): void {
    try {
      secureStorage.setItem(PERMISSIONS_KEY, this.permissions)
    } catch (error) {
      logger.error('Error saving permissions', error as Error)
    }
  }

  // Load roles from storage
  private loadRoles(): Role[] {
    try {
      return secureStorage.getItem<Role[]>(ROLES_KEY) || []
    } catch (error) {
      logger.error('Error loading roles', error as Error)
      return []
    }
  }

  // Save roles to storage
  private saveRoles(): void {
    try {
      secureStorage.setItem(ROLES_KEY, this.roles)
    } catch (error) {
      logger.error('Error saving roles', error as Error)
    }
  }

  // Load user permissions from storage
  private loadUserPermissions(): UserPermissionOverride[] {
    try {
      return secureStorage.getItem<UserPermissionOverride[]>(USER_PERMISSIONS_KEY) || []
    } catch (error) {
      logger.error('Error loading user permissions', error as Error)
      return []
    }
  }

  // Save user permissions to storage
  private saveUserPermissions(): void {
    try {
      secureStorage.setItem(USER_PERMISSIONS_KEY, this.userPermissions)
    } catch (error) {
      logger.error('Error saving user permissions', error as Error)
    }
  }

  // Load role permissions from storage
  private loadRolePermissions(): Map<string, string[]> {
    try {
      const data = secureStorage.getItem<Record<string, string[]>>(ROLE_PERMISSIONS_KEY) || {}
      return new Map(Object.entries(data))
    } catch (error) {
      logger.error('Error loading role permissions', error as Error)
      return new Map()
    }
  }

  // Save role permissions to storage
  private saveRolePermissions(): void {
    try {
      const data = Object.fromEntries(this.rolePermissions)
      secureStorage.setItem(ROLE_PERMISSIONS_KEY, data)
    } catch (error) {
      logger.error('Error saving role permissions', error as Error)
    }
  }

  // Update role permissions mapping
  private updateRolePermissions(): void {
    this.rolePermissions.clear()
    this.roles.forEach(role => {
      this.rolePermissions.set(role.id, role.permissions)
    })
    this.saveRolePermissions()
  }

  // Get all permissions
  getPermissions(): Permission[] {
    return [...this.permissions]
  }

  // Get permission by ID
  getPermissionById(id: string): Permission | null {
    return this.permissions.find(p => p.id === id) || null
  }

  // Create new permission
  createPermission(permission: Omit<Permission, 'id' | 'isSystem'>): Permission {
    const newPermission: Permission = {
      ...permission,
      id: `${permission.resource}.${permission.action}.${Date.now()}`,
      isSystem: false,
    }

    this.permissions.push(newPermission)
    this.savePermissions()
    return newPermission
  }

  // Update permission
  updatePermission(id: string, updates: Partial<Permission>): boolean {
    const permission = this.permissions.find(p => p.id === id)
    if (!permission || permission.isSystem) {
      return false
    }

    Object.assign(permission, updates)
    this.savePermissions()
    return true
  }

  // Delete permission
  deletePermission(id: string): boolean {
    const permission = this.permissions.find(p => p.id === id)
    if (!permission || permission.isSystem) {
      return false
    }

    const index = this.permissions.indexOf(permission)
    this.permissions.splice(index, 1)
    this.savePermissions()

    // Remove from all roles
    this.roles.forEach(role => {
      const permIndex = role.permissions.indexOf(id)
      if (permIndex !== -1) {
        role.permissions.splice(permIndex, 1)
      }
    })
    this.saveRoles()
    this.updateRolePermissions()

    return true
  }

  // Get all roles
  getRoles(): Role[] {
    return [...this.roles]
  }

  // Get role by ID
  getRoleById(id: string): Role | null {
    return this.roles.find(r => r.id === id) || null
  }

  // Create new role
  createRole(role: Omit<Role, 'id' | 'isSystem' | 'createdAt' | 'updatedAt'>): Role {
    const now = new Date().toISOString()
    const newRole: Role = {
      ...role,
      id: `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      isSystem: false,
      createdAt: now,
      updatedAt: now,
    }

    this.roles.push(newRole)
    this.saveRoles()
    this.updateRolePermissions()
    return newRole
  }

  // Update role
  updateRole(id: string, updates: Partial<Role>): boolean {
    const role = this.roles.find(r => r.id === id)
    if (!role || role.isSystem) {
      return false
    }

    Object.assign(role, updates, { updatedAt: new Date().toISOString() })
    this.saveRoles()
    this.updateRolePermissions()
    return true
  }

  // Delete role
  deleteRole(id: string): boolean {
    const role = this.roles.find(r => r.id === id)
    if (!role || role.isSystem) {
      return false
    }

    const index = this.roles.indexOf(role)
    this.roles.splice(index, 1)
    this.saveRoles()
    this.updateRolePermissions()
    return true
  }

  // Add permission to role
  addPermissionToRole(roleId: string, permissionId: string): boolean {
    const role = this.roles.find(r => r.id === roleId)
    if (!role) {
      return false
    }

    if (!role.permissions.includes(permissionId)) {
      role.permissions.push(permissionId)
      role.updatedAt = new Date().toISOString()
      this.saveRoles()
      this.updateRolePermissions()
    }

    return true
  }

  // Remove permission from role
  removePermissionFromRole(roleId: string, permissionId: string): boolean {
    const role = this.roles.find(r => r.id === roleId)
    if (!role || role.isSystem) {
      return false
    }

    const index = role.permissions.indexOf(permissionId)
    if (index !== -1) {
      role.permissions.splice(index, 1)
      role.updatedAt = new Date().toISOString()
      this.saveRoles()
      this.updateRolePermissions()
    }

    return true
  }

  // Get user permission overrides
  getUserPermissionOverrides(userId: string): UserPermissionOverride[] {
    return this.userPermissions.filter(up => up.userId === userId)
  }

  // Grant permission to user
  grantPermissionToUser(
    userId: string, 
    permissionId: string, 
    grantedBy: string, 
    reason?: string, 
    expiresAt?: string
  ): boolean {
    // Remove existing override for this permission
    this.userPermissions = this.userPermissions.filter(up => !(up.userId === userId && up.permissionId === permissionId))

    const override: UserPermissionOverride = {
      userId,
      permissionId,
      granted: true,
      reason,
      grantedBy,
      grantedAt: new Date().toISOString(),
      expiresAt,
    }

    this.userPermissions.push(override)
    this.saveUserPermissions()
    return true
  }

  // Deny permission to user
  denyPermissionToUser(
    userId: string, 
    permissionId: string, 
    grantedBy: string, 
    reason?: string, 
    expiresAt?: string
  ): boolean {
    // Remove existing override for this permission
    this.userPermissions = this.userPermissions.filter(up => !(up.userId === userId && up.permissionId === permissionId))

    const override: UserPermissionOverride = {
      userId,
      permissionId,
      granted: false,
      reason,
      grantedBy,
      grantedAt: new Date().toISOString(),
      expiresAt,
    }

    this.userPermissions.push(override)
    this.saveUserPermissions()
    return true
  }

  // Remove user permission override
  removeUserPermissionOverride(userId: string, permissionId: string): boolean {
    const initialLength = this.userPermissions.length
    this.userPermissions = this.userPermissions.filter(up => !(up.userId === userId && up.permissionId === permissionId))
    
    if (this.userPermissions.length < initialLength) {
      this.saveUserPermissions()
      return true
    }

    return false
  }

  // Check if user has permission
  hasPermission(
    userId: string, 
    userRole: UserRole, 
    permissionId: string, 
    context?: Partial<AccessContext>
  ): PermissionCheckResult {
    // Check for explicit denial first (highest priority)
    const userOverrides = this.getUserPermissionOverrides(userId)
    const denialOverride = userOverrides.find(up => 
      up.permissionId === permissionId && 
      !up.granted && 
      (!up.expiresAt || new Date(up.expiresAt) > new Date())
    )

    if (denialOverride) {
      return {
        granted: false,
        reason: denialOverride.reason || 'Permission explicitly denied',
        source: 'denied',
      }
    }

    // Check for explicit grant (high priority)
    const grantOverride = userOverrides.find(up => 
      up.permissionId === permissionId && 
      up.granted && 
      (!up.expiresAt || new Date(up.expiresAt) > new Date())
    )

    if (grantOverride) {
      return {
        granted: true,
        reason: grantOverride.reason || 'Permission explicitly granted',
        source: 'direct',
      }
    }

    // Check role-based permissions
    const role = this.getRoleById(userRole)
    if (!role) {
      return {
        granted: false,
        reason: 'User role not found',
        source: 'role',
      }
    }

    // Get all permissions for the role (including inherited)
    const rolePermissions = this.getRolePermissions(userRole)
    
    if (rolePermissions.includes(permissionId)) {
      // Check additional conditions if any
      const permission = this.getPermissionById(permissionId)
      if (permission && permission.conditions) {
        const conditionsMet = this.checkConditions(permission.conditions, context)
        if (!conditionsMet) {
          return {
            granted: false,
            reason: 'Permission conditions not met',
            source: 'role',
          }
        }
      }

      return {
        granted: true,
        source: 'inherited',
      }
    }

    return {
      granted: false,
      reason: 'Permission not found in role',
      source: 'role',
    }
  }

  // Get all permissions for a role (including inherited)
  private getRolePermissions(roleId: string): string[] {
    const role = this.getRoleById(roleId)
    if (!role) {
      return []
    }

    let permissions = new Set<string>(role.permissions)

    // Add inherited permissions
    if (role.inheritsFrom) {
      for (const inheritedRoleId of role.inheritsFrom) {
        const inheritedPermissions = this.getRolePermissions(inheritedRoleId)
        inheritedPermissions.forEach(p => permissions.add(p))
      }
    }

    return Array.from(permissions)
  }

  // Check permission conditions
  private checkConditions(conditions: string[], context?: Partial<AccessContext>): boolean {
    if (!context) {
      return true
    }

    for (const condition of conditions) {
      switch (condition) {
        case 'owner_only':
          if (context.resourceOwnerId && context.resourceOwnerId !== context.userId) {
            return false
          }
          break
        case 'self_only':
          if (context.resourceId && context.resourceId !== context.userId) {
            return false
          }
          break
        case 'business_hours_only':
          const hour = new Date().getHours()
          if (hour < 8 || hour > 18) {
            return false
          }
          break
        // Add more conditions as needed
      }
    }

    return true
  }

  // Get user permissions summary
  getUserPermissionsSummary(userId: string, userRole: UserRole): {
    total: number
    granted: number
    denied: number
    direct: number
    inherited: number
    permissions: Array<{
      permission: Permission
      granted: boolean
      source: 'direct' | 'inherited' | 'denied'
      reason?: string
    }>
  } {
    const allPermissions = this.getPermissions()
    const result = {
      total: allPermissions.length,
      granted: 0,
      denied: 0,
      direct: 0,
      inherited: 0,
      permissions: [] as Array<{
        permission: Permission
        granted: boolean
        source: 'direct' | 'inherited' | 'denied'
        reason?: string
      }>,
    }

    for (const permission of allPermissions) {
      const checkResult = this.hasPermission(userId, userRole, permission.id)
      
      result.permissions.push({
        permission,
        granted: checkResult.granted,
        source: checkResult.source as 'direct' | 'inherited' | 'denied',
        reason: checkResult.reason,
      })

      if (checkResult.granted) {
        result.granted++
        if (checkResult.source === 'direct') {
          result.direct++
        } else {
          result.inherited++
        }
      } else if (checkResult.source === 'denied') {
        result.denied++
      }
    }

    return result
  }

  // Clean up expired permission overrides
  cleanupExpiredOverrides(): number {
    const now = new Date()
    const initialLength = this.userPermissions.length
    
    this.userPermissions = this.userPermissions.filter(up => 
      !up.expiresAt || new Date(up.expiresAt) > now
    )

    const removed = initialLength - this.userPermissions.length
    if (removed > 0) {
      this.saveUserPermissions()
    }

    return removed
  }
}

// Export singleton instance
export const permissionManager = PermissionManager.getInstance()

// Export convenience functions
export const hasPermission = (
  userId: string, 
  userRole: UserRole, 
  permissionId: string, 
  context?: Partial<AccessContext>
) => permissionManager.hasPermission(userId, userRole, permissionId, context)

export const getUserPermissionsSummary = (userId: string, userRole: UserRole) =>
  permissionManager.getUserPermissionsSummary(userId, userRole)

export const grantPermissionToUser = (
  userId: string, 
  permissionId: string, 
  grantedBy: string, 
  reason?: string, 
  expiresAt?: string
) => permissionManager.grantPermissionToUser(userId, permissionId, grantedBy, reason, expiresAt)

export const denyPermissionToUser = (
  userId: string, 
  permissionId: string, 
  grantedBy: string, 
  reason?: string, 
  expiresAt?: string
) => permissionManager.denyPermissionToUser(userId, permissionId, grantedBy, reason, expiresAt)