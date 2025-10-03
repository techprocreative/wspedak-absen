/**
 * API Route for System Monitoring Metrics
 * Provides access to system performance metrics and health status
 */

import { NextRequest, NextResponse } from 'next/server';
import { systemMonitor } from '@/lib/monitoring/system-monitor';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;

    // Get metrics history
    const metrics = systemMonitor.getMetricsHistory({
      limit,
      startTime,
      endTime
    });

    // Get current metrics
    const currentMetrics = systemMonitor.getCurrentMetrics();

    // Get health status
    const healthStatus = await systemMonitor.getHealthStatus();

    return NextResponse.json({
      success: true,
      data: {
        current: currentMetrics,
        history: metrics,
        health: healthStatus,
        thresholds: systemMonitor.getThresholds()
      }
    });
  } catch (error) {
    console.error('Error fetching monitoring metrics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitoring metrics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, thresholds } = body;

    switch (action) {
      case 'updateThresholds':
        if (thresholds) {
          systemMonitor.updateThresholds(thresholds);
          return NextResponse.json({
            success: true,
            message: 'Thresholds updated successfully',
            data: systemMonitor.getThresholds()
          });
        }
        break;
      
      case 'forceGC':
        // Force garbage collection
        if (global.gc) {
          global.gc();
          return NextResponse.json({
            success: true,
            message: 'Garbage collection forced successfully'
          });
        } else {
          return NextResponse.json({
            success: false,
            error: 'Garbage collection not available'
          }, { status: 400 });
        }
      
      case 'clearMetrics':
        const olderThanHours = body.olderThanHours || 24;
        systemMonitor.clearOldMetrics(olderThanHours);
        return NextResponse.json({
          success: true,
          message: `Metrics older than ${olderThanHours} hours cleared`
        });
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid request'
    }, { status: 400 });
  } catch (error) {
    console.error('Error in monitoring metrics POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}