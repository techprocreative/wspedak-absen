/**
 * Error Tracking API Endpoint
 * Provides HTTP endpoints for error tracking and management
 */

import { NextRequest, NextResponse } from 'next/server';
import { errorTracker } from '@/lib/error-tracker';

// GET /api/errors - Get error reports, groups, or alerts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'reports';
    const severity = searchParams.get('severity')?.split(',');
    const resolved = searchParams.get('resolved') === 'true';
    const acknowledged = searchParams.get('acknowledged') === 'true';
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let response: any = {};

    switch (type) {
      case 'reports':
        response.reports = errorTracker.getErrorReports({
          severity: severity as any,
          resolved,
          startTime,
          endTime,
        });
        break;

      case 'groups':
        response.groups = errorTracker.getErrorGroups({
          severity: severity as any,
          resolved,
          startTime,
          endTime,
        });
        break;

      case 'alerts':
        response.alerts = errorTracker.getAlerts({
          severity: severity as any,
          acknowledged,
          startTime,
          endTime,
        });
        break;

      case 'stats':
        response.stats = errorTracker.getErrorStats();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Must be one of: reports, groups, alerts, stats' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/errors - Track a new error
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, type, severity, context } = body;

    if (!message) {
      return NextResponse.json(
        { error: 'Missing required field: message' },
        { status: 400 }
      );
    }

    // Create error object
    const error = new Error(message);
    if (stack) {
      error.stack = stack;
    }
    if (type) {
      error.name = type;
    }

    // Track the error
    const errorId = errorTracker.trackError(
      error,
      context || {},
      severity || 'medium'
    );

    return NextResponse.json({
      success: true,
      errorId,
      message: 'Error tracked successfully',
    });
  } catch (error) {
    console.error('Error tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/errors - Update error status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, id, userId } = body;

    if (!action || !id) {
      return NextResponse.json(
        { error: 'Missing required fields: action, id' },
        { status: 400 }
      );
    }

    let success = false;
    let message = '';

    switch (action) {
      case 'resolve-group':
        success = errorTracker.resolveErrorGroup(id, userId);
        message = success ? 'Error group resolved' : 'Error group not found';
        break;

      case 'acknowledge-alert':
        success = errorTracker.acknowledgeAlert(id, userId);
        message = success ? 'Alert acknowledged' : 'Alert not found';
        break;

      case 'assign-group':
        const { assignee } = body;
        if (!assignee) {
          return NextResponse.json(
            { error: 'Missing required field: assignee' },
            { status: 400 }
          );
        }
        success = errorTracker.assignErrorGroup(id, assignee);
        message = success ? 'Error group assigned' : 'Error group not found';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: resolve-group, acknowledge-alert, assign-group' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success,
      message,
    });
  } catch (error) {
    console.error('Error tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/errors - Clear all errors
export async function DELETE(request: NextRequest) {
  try {
    errorTracker.clearErrors();
    return NextResponse.json({
      success: true,
      message: 'All errors cleared',
    });
  } catch (error) {
    console.error('Error tracking API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}