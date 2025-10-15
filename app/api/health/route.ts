/**
 * Health Check API Endpoint
 * Provides HTTP endpoints for health monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { healthCheckManager } from '@/lib/health-check';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// GET /api/health - Get current health status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const history = searchParams.get('history') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Get current health status
    const currentHealth = healthCheckManager.getCurrentHealth();
    
    if (!currentHealth) {
      return NextResponse.json(
        { error: 'Health check not available' },
        { status: 503 }
      );
    }

    const response: any = {
      status: currentHealth.status,
      timestamp: currentHealth.timestamp,
      summary: currentHealth.summary,
    };

    // Include detailed information if requested
    if (detailed) {
      response.checks = currentHealth.checks;
      response.recommendations = currentHealth.recommendations;
      response.duration = currentHealth.duration;
    }

    // Include history if requested
    if (history) {
      response.history = healthCheckManager.getHealthHistory(limit);
    }

    // Set appropriate status code based on health
    let statusCode = 200;
    if (currentHealth.status === 'critical') {
      statusCode = 503;
    } else if (currentHealth.status === 'unhealthy') {
      statusCode = 503;
    } else if (currentHealth.status === 'warning') {
      statusCode = 200; // Still OK but with warnings
    }

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    logger.error('Health check API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/health - Force a new health check
export async function POST(request: NextRequest) {
  try {
    // Force a new health check
    const healthResult = await healthCheckManager.forceHealthCheck();
    
    return NextResponse.json({
      status: healthResult.status,
      timestamp: healthResult.timestamp,
      summary: healthResult.summary,
      checks: healthResult.checks,
      recommendations: healthResult.recommendations,
      duration: healthResult.duration,
    });
  } catch (error) {
    logger.error('Force health check API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}