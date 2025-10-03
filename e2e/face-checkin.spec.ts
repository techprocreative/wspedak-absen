/**
 * E2E Tests for Face Check-in Flow
 */

import { test, expect } from '@playwright/test'

test.describe('Face Check-in Page', () => {
  test.beforeEach(async ({ context }) => {
    // Grant camera and location permissions
    await context.grantPermissions(['camera', 'geolocation'])
  })

  test('should display face check-in interface', async ({ page }) => {
    await page.goto('/face-checkin')
    
    // Check for main elements
    await expect(page.locator('h1:has-text("Face Recognition Check-in")')).toBeVisible()
    await expect(page.locator('video')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('button:has-text("Check In Now")')).toBeVisible()
  })

  test('should show loading state while loading models', async ({ page }) => {
    await page.goto('/face-checkin')
    
    // Should show loading initially
    await expect(page.locator('text=Loading face recognition')).toBeVisible({ timeout: 2000 })
  })

  test('should show tips for best results', async ({ page }) => {
    await page.goto('/face-checkin')
    
    // Wait for models to load
    await page.waitForTimeout(3000)
    
    // Check tips are visible
    await expect(page.locator('text=Position your face in the center')).toBeVisible()
    await expect(page.locator('text=Ensure good lighting')).toBeVisible()
  })

  test('should have check-in button enabled after loading', async ({ page }) => {
    await page.goto('/face-checkin')
    
    // Wait for models and camera
    await page.waitForTimeout(5000)
    
    const button = page.locator('button:has-text("Check In Now")')
    await expect(button).toBeEnabled()
  })
})

test.describe('Face Check-in Process', () => {
  test('should show processing state when checking in', async ({ page }) => {
    await page.goto('/face-checkin')
    await page.waitForTimeout(5000)
    
    const button = page.locator('button:has-text("Check In Now")')
    await button.click()
    
    // Should show processing
    await expect(page.locator('text=Processing')).toBeVisible({ timeout: 2000 })
  })
})
