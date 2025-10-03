import { test, expect } from '@playwright/test'

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should display login form for unauthenticated users', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome')
    await expect(page.locator('form[data-testid="login-form"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In')
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@example.com')
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    await expect(page.locator('[data-testid="error-message"]')).toBeVisible()
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Invalid credentials')
  })

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')

    // Wait for navigation to dashboard
    await page.waitForURL('/dashboard')
    
    // Verify user is logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-name"]')).toContainText('John Doe')
  })

  test('should allow users to logout', async ({ page }) => {
    // First login
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Then logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    // Verify redirected to login
    await page.waitForURL('/')
    await expect(page.locator('form[data-testid="login-form"]')).toBeVisible()
  })

  test('should persist login session across page reloads', async ({ page }) => {
    await page.fill('input[name="email"]', 'john@example.com')
    await page.fill('input[name="password"]', 'password')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Reload page
    await page.reload()

    // Verify user is still logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
    await expect(page.locator('[data-testid="user-name"]')).toContainText('John Doe')
  })
})