/**
 * System Monitoring API Endpoint
 * Provides HTTP endpoints for DS223J system monitoring
 */

import { NextRequest, NextResponse } from 'next/server';
import { systemMonitor } from '@/lib/system-monitor';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// GET /api/system - Get system information, metrics, or alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'info';
    const severity = searchParams.get('severity')?.split(',');
    const resolved = searchParams.get('resolved') === 'true';
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let response: any = {};

    switch (type) {
      case 'info':
        response.info = systemMonitor.getSystemInfo();
        break;

      case 'metrics':
        response.metrics = systemMonitor.getCurrentMetrics();
        break;

      case 'history':
        response.history = systemMonitor.getMetricsHistory({
          startTime,
          endTime,
          limit,
        });
        break;

      case 'alerts':
        response.alerts = systemMonitor.getAlerts({
          severity: severity as any,
          resolved,
          startTime,
          endTime,
        });
        break;

      case 'summary':
        response.summary = systemMonitor.getPerformanceSummary();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Must be one of: info, metrics, history, alerts, summary' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('System monitoring API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/system - Perform system actions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required field: action' },
        { status: 400 }
      );
    }

    let response: any = {};

    switch (action) {
      case 'optimize':
        const result = await systemMonitor.optimizeSystem();
        response = result;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: optimize' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('System monitoring API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/system - Update system data
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id } = body;

    if (!action || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: action, id' },
        { status: 400 }
      );
    }

    let success = false;
    let message = '';

    switch (action) {
      case 'resolve-alert':
        success = systemMonitor.resolveAlert(id);
        message = success ? 'Alert resolved' : 'Alert not found';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: resolve-alert' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success,
      message,
    });
  } catch (error) {
    logger.error('System monitoring API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/system - Clear system data
export async function DELETE(request: NextRequest) {
  try {
    systemMonitor.clearData();
    return NextResponse.json({
      success: true,
      message: 'System monitoring data cleared',
    });
  } catch (error) {
    logger.error('System monitoring API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}