'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { logger, logApiError, logApiRequest } from '@/lib/logger'
import {
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Shield, 
  Users, 
  Key, 
  History, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download,
  RefreshCw,
  Settings,
  Lock,
  Unlock,
  UserCheck,
  UserX,
  Activity,
  Smartphone,
  Mail,
  Clock,
  Ban,
  Save
} from 'lucide-react'
import SecurityDashboard from '@/components/admin/security/SecurityDashboard'

interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  maxAge: number
  historyCount: number
  preventCommonPasswords: boolean
  preventUserInfo: boolean
}

interface SessionSettings {
  sessionTimeoutMinutes: number
  maxConcurrentSessions: number
  requireReauth: boolean
  reauthInterval: number
}

interface AuditSettings {
  maxLogEntries: number
  retentionDays: number
  logFailedAttempts: boolean
  logSuccessfulAttempts: boolean
  logSensitiveActions: boolean
}

interface MFASettings {
  enabled: boolean
  requiredForAdmins: boolean
  requiredForAllUsers: boolean
  trustedDeviceDays: number
  backupCodesCount: number
}

export default function SecuritySettingsPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [passwordPolicy, setPasswordPolicy] = useState<PasswordPolicy>({
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    maxAge: 90,
    historyCount: 5,
    preventCommonPasswords: true,
    preventUserInfo: true,
  })
  const [sessionSettings, setSessionSettings] = useState<SessionSettings>({
    sessionTimeoutMinutes: 480,
    maxConcurrentSessions: 3,
    requireReauth: true,
    reauthInterval: 60,
  })
  const [auditSettings, setAuditSettings] = useState<AuditSettings>({
    maxLogEntries: 10000,
    retentionDays: 365,
    logFailedAttempts: true,
    logSuccessfulAttempts: true,
    logSensitiveActions: true,
  })
  const [mfaSettings, setMfaSettings] = useState<MFASettings>({
    enabled: true,
    requiredForAdmins: true,
    requiredForAllUsers: false,
    trustedDeviceDays: 30,
    backupCodesCount: 10,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [showPasswordGenerator, setShowPasswordGenerator] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')

  // Fetch security settings
  const fetchSecuritySettings = async () => {
    setIsLoading(true)
    try {
      // Fetch password policy
      const policyResponse = await fetch('/api/admin/security/password?action=policy')
      if (policyResponse.ok) {
        const policyData = await policyResponse.json()
        setPasswordPolicy(policyData.data)
      }

      // Fetch other settings would go here
    } catch (error) {
      logger.error('Error fetching security settings', error as Error)
    } finally {
      setIsLoading(false)
    }
  }

  // Save security settings
  const saveSecuritySettings = async (settingsType: string) => {
    setIsLoading(true)
    try {
      let response
      
      switch (settingsType) {
        case 'password':
          response = await fetch('/api/admin/security/password', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'update-policy',
              policyUpdates: passwordPolicy
            }),
          })
          break
        case 'session':
          // Session settings API would go here
          break
        case 'audit':
          // Audit settings API would go here
          break
        case 'mfa':
          // MFA settings API would go here
          break
      }
      
      if (response && response.ok) {
        setSaveMessage('Settings saved successfully!')
        setTimeout(() => setSaveMessage(''), 3000)
      }
    } catch (error) {
      logger.error('Error saving security settings', error as Error)
      setSaveMessage('Failed to save settings')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  // Generate secure password
  const generateSecurePassword = async () => {
    try {
      const response = await fetch('/api/admin/security/password?action=generate&length=16')
      if (response.ok) {
        const data = await response.json()
        setGeneratedPassword(data.data.password)
        setShowPasswordGenerator(true)
      }
    } catch (error) {
      logger.error('Error generating password', error as Error)
    }
  }

  // Copy password to clipboard
  const copyPasswordToClipboard = () => {
    navigator.clipboard.writeText(generatedPassword)
    setSaveMessage('Password copied to clipboard!')
    setTimeout(() => setSaveMessage(''), 3000)
  }

  // Initialize settings
  useEffect(() => {
    fetchSecuritySettings()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Security Settings</h1>
          <p className="text-muted-foreground">
            Configure system security policies and settings
          </p>
        </div>
        {saveMessage && (
          <Alert className="max-w-md">
            <CheckCircle className="h-4 w-4" />
            <AlertTitle>{saveMessage}</AlertTitle>
          </Alert>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="password">Password</TabsTrigger>
          <TabsTrigger value="session">Session</TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
          <TabsTrigger value="mfa">MFA</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <SecurityDashboard />
        </TabsContent>

        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password Policy</CardTitle>
              <CardDescription>
                Configure password requirements and security policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Password Requirements</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requireUppercase"
                        checked={passwordPolicy.requireUppercase}
                        onCheckedChange={(checked) => 
                          setPasswordPolicy({ ...passwordPolicy, requireUppercase: checked })
                        }
                      />
                      <Label htmlFor="requireUppercase">Require Uppercase Letters</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requireLowercase"
                        checked={passwordPolicy.requireLowercase}
                        onCheckedChange={(checked) => 
                          setPasswordPolicy({ ...passwordPolicy, requireLowercase: checked })
                        }
                      />
                      <Label htmlFor="requireLowercase">Require Lowercase Letters</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requireNumbers"
                        checked={passwordPolicy.requireNumbers}
                        onCheckedChange={(checked) => 
                          setPasswordPolicy({ ...passwordPolicy, requireNumbers: checked })
                        }
                      />
                      <Label htmlFor="requireNumbers">Require Numbers</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requireSpecialChars"
                        checked={passwordPolicy.requireSpecialChars}
                        onCheckedChange={(checked) => 
                          setPasswordPolicy({ ...passwordPolicy, requireSpecialChars: checked })
                        }
                      />
                      <Label htmlFor="requireSpecialChars">Require Special Characters</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="preventCommonPasswords"
                        checked={passwordPolicy.preventCommonPasswords}
                        onCheckedChange={(checked) => 
                          setPasswordPolicy({ ...passwordPolicy, preventCommonPasswords: checked })
                        }
                      />
                      <Label htmlFor="preventCommonPasswords">Prevent Common Passwords</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="preventUserInfo"
                        checked={passwordPolicy.preventUserInfo}
                        onCheckedChange={(checked) => 
                          setPasswordPolicy({ ...passwordPolicy, preventUserInfo: checked })
                        }
                      />
                      <Label htmlFor="preventUserInfo">Prevent User Info in Password</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Password Settings</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="minLength">Minimum Length</Label>
                      <Input
                        id="minLength"
                        type="number"
                        value={passwordPolicy.minLength}
                        onChange={(e) => 
                          setPasswordPolicy({ ...passwordPolicy, minLength: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxAge">Password Expiry (days)</Label>
                      <Input
                        id="maxAge"
                        type="number"
                        value={passwordPolicy.maxAge}
                        onChange={(e) => 
                          setPasswordPolicy({ ...passwordPolicy, maxAge: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="historyCount">Remember Last Passwords</Label>
                      <Input
                        id="historyCount"
                        type="number"
                        value={passwordPolicy.historyCount}
                        onChange={(e) => 
                          setPasswordPolicy({ ...passwordPolicy, historyCount: parseInt(e.target.value) })
                        }
                      />
                    </div>
                    
                    <div className="pt-4">
                      <Button 
                        variant="outline" 
                        onClick={generateSecurePassword}
                        className="w-full"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Generate Secure Password
                      </Button>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveSecuritySettings('password')}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Password Policy
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Management</CardTitle>
              <CardDescription>
                Configure user session settings and policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Session Settings</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={sessionSettings.sessionTimeoutMinutes}
                        onChange={(e) => 
                          setSessionSettings({ 
                            ...sessionSettings, 
                            sessionTimeoutMinutes: parseInt(e.target.value) 
                          })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxConcurrentSessions">Max Concurrent Sessions</Label>
                      <Input
                        id="maxConcurrentSessions"
                        type="number"
                        value={sessionSettings.maxConcurrentSessions}
                        onChange={(e) => 
                          setSessionSettings({ 
                            ...sessionSettings, 
                            maxConcurrentSessions: parseInt(e.target.value) 
                          })
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Re-authentication</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requireReauth"
                        checked={sessionSettings.requireReauth}
                        onCheckedChange={(checked) => 
                          setSessionSettings({ ...sessionSettings, requireReauth: checked })
                        }
                      />
                      <Label htmlFor="requireReauth">Require Re-authentication</Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="reauthInterval">Re-auth Interval (minutes)</Label>
                      <Input
                        id="reauthInterval"
                        type="number"
                        value={sessionSettings.reauthInterval}
                        onChange={(e) => 
                          setSessionSettings({ 
                            ...sessionSettings, 
                            reauthInterval: parseInt(e.target.value) 
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveSecuritySettings('session')}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Session Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Audit Logging</CardTitle>
              <CardDescription>
                Configure audit logging settings and retention policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Log Retention</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="maxLogEntries">Max Log Entries</Label>
                      <Input
                        id="maxLogEntries"
                        type="number"
                        value={auditSettings.maxLogEntries}
                        onChange={(e) => 
                          setAuditSettings({ 
                            ...auditSettings, 
                            maxLogEntries: parseInt(e.target.value) 
                          })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="logRetentionDays">Log Retention (days)</Label>
                      <Input
                        id="logRetentionDays"
                        type="number"
                        value={auditSettings.retentionDays}
                        onChange={(e) => 
                          setAuditSettings({ 
                            ...auditSettings, 
                            retentionDays: parseInt(e.target.value) 
                          })
                        }
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Event Logging</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="logFailedAttempts"
                        checked={auditSettings.logFailedAttempts}
                        onCheckedChange={(checked) => 
                          setAuditSettings({ ...auditSettings, logFailedAttempts: checked })
                        }
                      />
                      <Label htmlFor="logFailedAttempts">Log Failed Attempts</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="logSuccessfulAttempts"
                        checked={auditSettings.logSuccessfulAttempts}
                        onCheckedChange={(checked) => 
                          setAuditSettings({ ...auditSettings, logSuccessfulAttempts: checked })
                        }
                      />
                      <Label htmlFor="logSuccessfulAttempts">Log Successful Attempts</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="logSensitiveActions"
                        checked={auditSettings.logSensitiveActions}
                        onCheckedChange={(checked) => 
                          setAuditSettings({ ...auditSettings, logSensitiveActions: checked })
                        }
                      />
                      <Label htmlFor="logSensitiveActions">Log Sensitive Actions</Label>
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between">
                  <Button variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Clear Old Logs
                  </Button>
                  <Button 
                    onClick={() => saveSecuritySettings('audit')}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Audit Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="mfa" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Multi-Factor Authentication</CardTitle>
              <CardDescription>
                Configure MFA settings and policies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">MFA Requirements</h3>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="mfaEnabled"
                        checked={mfaSettings.enabled}
                        onCheckedChange={(checked) => 
                          setMfaSettings({ ...mfaSettings, enabled: checked })
                        }
                      />
                      <Label htmlFor="mfaEnabled">Enable MFA</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requiredForAdmins"
                        checked={mfaSettings.requiredForAdmins}
                        onCheckedChange={(checked) => 
                          setMfaSettings({ ...mfaSettings, requiredForAdmins: checked })
                        }
                      />
                      <Label htmlFor="requiredForAdmins">Required for Admins</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="requiredForAllUsers"
                        checked={mfaSettings.requiredForAllUsers}
                        onCheckedChange={(checked) => 
                          setMfaSettings({ ...mfaSettings, requiredForAllUsers: checked })
                        }
                      />
                      <Label htmlFor="requiredForAllUsers">Required for All Users</Label>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium">Trusted Devices</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="trustedDeviceDays">Trust Device Duration (days)</Label>
                      <Input
                        id="trustedDeviceDays"
                        type="number"
                        value={mfaSettings.trustedDeviceDays}
                        onChange={(e) => 
                          setMfaSettings({ 
                            ...mfaSettings, 
                            trustedDeviceDays: parseInt(e.target.value) 
                          })
                        }
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="backupCodesCount">Backup Codes Count</Label>
                      <Input
                        id="backupCodesCount"
                        type="number"
                        value={mfaSettings.backupCodesCount}
                        onChange={(e) => 
                          setMfaSettings({ 
                            ...mfaSettings, 
                            backupCodesCount: parseInt(e.target.value) 
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-end">
                  <Button 
                    onClick={() => saveSecuritySettings('mfa')}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save MFA Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Password Generator Dialog */}
      <Dialog open={showPasswordGenerator} onOpenChange={setShowPasswordGenerator}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generated Password</DialogTitle>
            <DialogDescription>
              Here is a secure password that meets your policy requirements.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-md">
              <p className="font-mono text-lg">{generatedPassword}</p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPasswordGenerator(false)}>
                Close
              </Button>
              <Button onClick={copyPasswordToClipboard}>
                <Eye className="h-4 w-4 mr-2" />
                Copy to Clipboard
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}