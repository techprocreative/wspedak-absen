"use client"

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Eye, EyeOff, Loader2, Lock, User, Wifi, WifiOff } from 'lucide-react'
import { useAuth } from './AuthProvider'
import { supabaseService } from '@/lib/supabase'

import { logger } from '@/lib/logger'
interface LoginFormProps {
  onSuccess?: () => void
  redirectTo?: string
  title?: string
  description?: string
  showDemoCredentials?: boolean
}

export function LoginForm({
  onSuccess,
  redirectTo,
  title = "Login",
  description = "Enter your credentials to access the system",
  showDemoCredentials = false,
}: LoginFormProps) {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  // Start with a deterministic value to avoid SSR/CSR mismatch,
  // then sync actual status on mount.
  const [isOnline, setIsOnline] = useState(true)
  
  const { login, authState } = useAuth()

  // Update online status
  useEffect(() => {
    // Sync initial state on mount (client only)
    setIsOnline(supabaseService.isOnline())

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Check for remembered credentials
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('remembered_email')
    if (rememberedEmail) {
      setFormData(prev => ({ ...prev, email: rememberedEmail }))
      setRememberMe(true)
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")
    setSuccess("")

    // Debug logging
    logger.info('Login attempt', {
      email: formData.email,
      passwordLength: formData.password.length,
      isOnline,
      rememberMe
    })

    try {
      await login(formData.email, formData.password, rememberMe)
      
      // Show success message
      setSuccess("Login berhasil! Mengarahkan...")
      
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem('remembered_email', formData.email)
      } else {
        localStorage.removeItem('remembered_email')
      }
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess()
      }
      
      // Redirect immediately after session is set to avoid race with cookie
      if (redirectTo) {
        window.location.assign(redirectTo)
      }
    } catch (err: any) {
      // Provide more specific error messages based on the error type
      let errorMessage = "Authentication failed. Please check your credentials."
      
      if (err.message) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = "Invalid email or password. Please try again."
        } else if (err.message.includes('Email not confirmed')) {
          errorMessage = "Please confirm your email address before logging in."
        } else if (err.message.includes('Too many requests')) {
          errorMessage = "Too many login attempts. Please try again later."
        } else if (err.message.includes('Network error')) {
          errorMessage = "Network error. Please check your connection and try again."
        } else {
          errorMessage = err.message
        }
      }
      
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
    if (error) setError("")
    if (success) setSuccess("")
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-center flex items-center justify-center gap-2">
          <Shield className="w-5 h-5" />
          {title}
        </CardTitle>
        <CardDescription className="text-center">
          {description}
        </CardDescription>
        
        {/* Connection Status */}
        <div className="flex items-center justify-center gap-2 text-sm">
          {isOnline ? (
            <>
              <Wifi className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Online</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-amber-500" />
              <span className="text-amber-500">Offline - Using cached credentials</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email"
                className="pl-10"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="pl-10 pr-10"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="rememberMe"
              checked={rememberMe}
              onCheckedChange={(checked: boolean) => setRememberMe(checked)}
              disabled={isLoading}
            />
            <Label htmlFor="rememberMe" className="text-sm">
              Remember me
            </Label>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert className="border-destructive bg-destructive/10">
              <AlertDescription className="text-destructive">{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isOnline ? "Signing in..." : "Verifying offline..."}
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-500 bg-green-500/10">
            <AlertDescription className="text-green-700 dark:text-green-400">{success}</AlertDescription>
          </Alert>
        )}

        {/* Demo Credentials removed for production */}

        {/* Offline Notice */}
        {!isOnline && (
          <div className="mt-4 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <p className="text-xs text-amber-700 dark:text-amber-400 text-center">
              You are currently offline. You can only sign in with credentials that have been used before while online.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
