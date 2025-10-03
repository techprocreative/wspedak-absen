import { FullConfig } from '@playwright/test'

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up E2E test environment...')
  
  // Cleanup any test data, close connections, etc.
  // This is where you would clean up test databases, temporary files, etc.
  
  console.log('✅ E2E test cleanup completed')
}

export default globalTeardown