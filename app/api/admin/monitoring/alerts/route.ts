/**
 * API Route for System Monitoring Alerts
 * Provides access to system alerts and alert management
 */

import { NextRequest, NextResponse } from 'next/server';
import { systemMonitor } from '@/lib/monitoring/system-monitor';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const severity = searchParams.get('severity') as any;
    const resolved = searchParams.get('resolved') === 'true' ? true : 
                    searchParams.get('resolved') === 'false' ? false : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    // Get alerts
    const alerts = systemMonitor.getAlerts({
      type,
      severity,
      resolved,
      limit
    });

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        count: alerts.length
      }
    });
  } catch (error) {
    logger.error('Error fetching monitoring alerts', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch monitoring alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, resolvedBy } = body;

    switch (action) {
      case 'resolveAlert':
        if (alertId && resolvedBy) {
          const success = systemMonitor.resolveAlert(alertId, resolvedBy);
          if (success) {
            return NextResponse.json({
              success: true,
              message: 'Alert resolved successfully'
            });
          } else {
            return NextResponse.json({
              success: false,
              error: 'Alert not found or already resolved'
            }, { status: 404 });
          }
        }
        break;
      
      case 'clearAlerts':
        const olderThanDays = body.olderThanDays || 7;
        systemMonitor.clearOldAlerts(olderThanDays);
        return NextResponse.json({
          success: true,
          message: `Alerts older than ${olderThanDays} days cleared`
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
    logger.error('Error in monitoring alerts POST', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}