const { performance } = require('perf_hooks')
const https = require('https')
const http = require('http')

// Performance test configuration
const config = {
  baseUrl: process.env.TEST_URL || 'http://localhost:3000',
  concurrentUsers: 10,
  requestsPerUser: 50,
  testDuration: 30000, // 30 seconds
  endpoints: [
    '/api/health',
    '/api/metrics',
    '/api/attendance/stats',
    '/api/attendance/policy',
  ],
}

// Performance metrics
const metrics = {
  totalRequests: 0,
  successfulRequests: 0,
  failedRequests: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null,
}

// Make HTTP request
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const startTime = performance.now()
    const protocol = url.startsWith('https') ? https : http

    const req = protocol.get(url, (res) => {
      let data = ''
      
      res.on('data', (chunk) => {
        data += chunk
      })
      
      res.on('end', () => {
        const endTime = performance.now()
        const responseTime = endTime - startTime
        
        metrics.totalRequests++
        metrics.responseTimes.push(responseTime)
        
        if (res.statusCode >= 200 && res.statusCode < 400) {
          metrics.successfulRequests++
        } else {
          metrics.failedRequests++
          metrics.errors.push({
            url,
            statusCode: res.statusCode,
            error: data,
          })
        }
        
        resolve({
          statusCode: res.statusCode,
          responseTime,
          dataSize: data.length,
        })
      })
    })

    req.on('error', (error) => {
      const endTime = performance.now()
      const responseTime = endTime - startTime
      
      metrics.totalRequests++
      metrics.failedRequests++
      metrics.responseTimes.push(responseTime)
      metrics.errors.push({
        url,
        error: error.message,
      })
      
      reject(error)
    })

    req.setTimeout(10000, () => {
      req.destroy()
      reject(new Error('Request timeout'))
    })
  })
}

// Simulate user load
async function simulateUser(userId) {
  console.log(`User ${userId}: Starting load simulation`)
  
  const userMetrics = {
    requests: 0,
    errors: 0,
    startTime: performance.now(),
  }

  const endTime = userMetrics.startTime + config.testDuration
  
  while (performance.now() < endTime && userMetrics.requests < config.requestsPerUser) {
    const endpoint = config.endpoints[Math.floor(Math.random() * config.endpoints.length)]
    const url = `${config.baseUrl}${endpoint}`
    
    try {
      await makeRequest(url)
      userMetrics.requests++
    } catch (error) {
      userMetrics.errors++
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
  }
  
  console.log(`User ${userId}: Completed ${userMetrics.requests} requests with ${userMetrics.errors} errors`)
  return userMetrics
}

// Calculate statistics
function calculateStats() {
  const sortedTimes = metrics.responseTimes.sort((a, b) => a - b)
  const total = metrics.responseTimes.length
  
  if (total === 0) {
    return {
      averageResponseTime: 0,
      medianResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      minResponseTime: 0,
      maxResponseTime: 0,
    }
  }
  
  return {
    averageResponseTime: metrics.responseTimes.reduce((a, b) => a + b, 0) / total,
    medianResponseTime: sortedTimes[Math.floor(total / 2)],
    p95ResponseTime: sortedTimes[Math.floor(total * 0.95)],
    p99ResponseTime: sortedTimes[Math.floor(total * 0.99)],
    minResponseTime: sortedTimes[0],
    maxResponseTime: sortedTimes[total - 1],
  }
}

// Generate performance report
function generateReport() {
  const stats = calculateStats()
  const duration = metrics.endTime - metrics.startTime
  const requestsPerSecond = (metrics.totalRequests / duration) * 1000
  const errorRate = (metrics.failedRequests / metrics.totalRequests) * 100

  const report = {
    summary: {
      testDuration: `${duration}ms`,
      totalRequests: metrics.totalRequests,
      successfulRequests: metrics.successfulRequests,
      failedRequests: metrics.failedRequests,
      requestsPerSecond: requestsPerSecond.toFixed(2),
      errorRate: `${errorRate.toFixed(2)}%`,
    },
    responseTime: stats,
    errors: metrics.errors.slice(0, 10), // Limit to first 10 errors
    configuration: config,
  }

  return report
}

// Main performance test function
async function runPerformanceTest() {
  console.log('🚀 Starting performance test...')
  console.log('Configuration:', config)
  
  metrics.startTime = performance.now()
  
  // Start concurrent users
  const userPromises = []
  for (let i = 1; i <= config.concurrentUsers; i++) {
    userPromises.push(simulateUser(i))
    
    // Stagger user starts
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  
  // Wait for all users to complete
  await Promise.all(userPromises)
  
  metrics.endTime = performance.now()
  
  console.log('✅ Performance test completed')
  
  // Generate and display report
  const report = generateReport()
  
  console.log('\n📊 Performance Test Results:')
  console.log('============================')
  console.log(`Total Duration: ${report.summary.testDuration}`)
  console.log(`Total Requests: ${report.summary.totalRequests}`)
  console.log(`Successful Requests: ${report.summary.successfulRequests}`)
  console.log(`Failed Requests: ${report.summary.failedRequests}`)
  console.log(`Requests/Second: ${report.summary.requestsPerSecond}`)
  console.log(`Error Rate: ${report.summary.errorRate}`)
  
  console.log('\n📈 Response Time Statistics:')
  console.log(`Average: ${report.responseTime.averageResponseTime.toFixed(2)}ms`)
  console.log(`Median: ${report.responseTime.medianResponseTime.toFixed(2)}ms`)
  console.log(`95th Percentile: ${report.responseTime.p95ResponseTime.toFixed(2)}ms`)
  console.log(`99th Percentile: ${report.responseTime.p99ResponseTime.toFixed(2)}ms`)
  console.log(`Min: ${report.responseTime.minResponseTime.toFixed(2)}ms`)
  console.log(`Max: ${report.responseTime.maxResponseTime.toFixed(2)}ms`)
  
  if (report.errors.length > 0) {
    console.log('\n❌ Errors:')
    report.errors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.url}: ${error.error || error.statusCode}`)
    })
  }
  
  // Save report to file
  const fs = require('fs')
  const reportPath = 'performance-results/performance-report.json'
  
  // Ensure directory exists
  if (!fs.existsSync('performance-results')) {
    fs.mkdirSync('performance-results')
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Detailed report saved to: ${reportPath}`)
  
  // Exit with error code if error rate is too high
  if (errorRate > 5) {
    console.error('❌ Performance test failed: Error rate too high')
    process.exit(1)
  }
  
  // Exit with error code if response times are too slow
  if (stats.p95ResponseTime > 2000) {
    console.error('❌ Performance test failed: 95th percentile response time too slow')
    process.exit(1)
  }
  
  console.log('✅ Performance test passed!')
  process.exit(0)
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error)
  process.exit(1)
})

// Run the test
if (require.main === module) {
  runPerformanceTest().catch(error => {
    console.error('Performance test failed:', error)
    process.exit(1)
  })
}

module.exports = { runPerformanceTest, config }