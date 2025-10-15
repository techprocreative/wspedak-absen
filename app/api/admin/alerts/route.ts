/**
 * API Route for Alert Management
 * Provides access to alert creation, management, and notification
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertManager } from '@/lib/alerts/alert-manager';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const severity = searchParams.get('severity') as any;
    const status = searchParams.get('status') as any;
    const source = searchParams.get('source') || undefined;
    const category = searchParams.get('category') || undefined;
    const assignedTo = searchParams.get('assignedTo') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const search = searchParams.get('search') || undefined;

    // Get alerts
    const alerts = alertManager.getAlerts({
      type,
      severity,
      status,
      source,
      category,
      assignedTo,
      search
    }).slice(0, limit || 100);

    // Get alert statistics
    const statistics = alertManager.getAlertStatistics();

    return NextResponse.json({
      success: true,
      data: {
        alerts,
        statistics,
        count: alerts.length
      }
    });
  } catch (error) {
    logger.error('Error fetching alerts', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, acknowledgedBy, resolvedBy, assignedTo } = body;

    switch (action) {
      case 'createAlert':
        const { alertData } = body;
        if (alertData) {
          const alert = alertManager.createAlert(alertData);
          return NextResponse.json({
            success: true,
            data: alert,
            message: 'Alert created successfully'
          });
        }
        break;
      
      case 'acknowledgeAlert':
        if (alertId && acknowledgedBy) {
          const success = alertManager.acknowledgeAlert(alertId, acknowledgedBy);
          if (success) {
            return NextResponse.json({
              success: true,
              message: 'Alert acknowledged successfully'
            });
          } else {
            return NextResponse.json({
              success: false,
              error: 'Alert not found or already acknowledged'
            }, { status: 404 });
          }
        }
        break;
      
      case 'resolveAlert':
        if (alertId && resolvedBy) {
          const success = alertManager.resolveAlert(alertId, resolvedBy);
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
      
      case 'assignAlert':
        if (alertId && assignedTo) {
          const success = alertManager.assignAlert(alertId, assignedTo);
          if (success) {
            return NextResponse.json({
              success: true,
              message: 'Alert assigned successfully'
            });
          } else {
            return NextResponse.json({
              success: false,
              error: 'Alert not found'
            }, { status: 404 });
          }
        }
        break;
      
      case 'executeAction':
        if (alertId && body.actionId) {
          const result = await alertManager.executeAction(alertId, body.actionId);
          return NextResponse.json({
            success: true,
            data: result,
            message: 'Action executed successfully'
          });
        }
        break;
      
      case 'cleanup':
        const olderThanDays = body.olderThanDays || 30;
        alertManager.cleanup(olderThanDays);
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
    logger.error('Error in alerts POST', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}