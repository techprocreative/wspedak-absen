import { chromium, FullConfig } from '@playwright/test'

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting E2E test setup...')
  
  // Setup test database or any other global requirements
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  // Wait for the app to be ready
  try {
    await page.goto(config.webServer?.url || 'http://localhost:3000')
    await page.waitForSelector('body', { timeout: 30000 })
    console.log('✅ Application is ready for E2E testing')
  } catch (error) {
    console.error('❌ Failed to start application:', error)
    throw error
  } finally {
    await context.close()
    await browser.close()
  }

  console.log('✅ E2E test setup completed')
}

export default globalSetup