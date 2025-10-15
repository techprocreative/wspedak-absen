/**
 * Health Ping API Endpoint
 * Simple endpoint for network connectivity testing
 */

import { NextRequest, NextResponse } from 'next/server';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// GET /api/health/ping - Simple ping endpoint
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      message: 'pong',
    });
  } catch (error) {
    logger.error('Health ping API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// HEAD /api/health/ping - Head request for minimal response
export async function HEAD(request: NextRequest) {
  try {
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    logger.error('Health ping API error', error as Error);
    return new NextResponse(null, { status: 500 });
  }
}