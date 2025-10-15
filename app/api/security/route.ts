/**
 * Security Monitoring API Endpoint
 * Provides HTTP endpoints for security monitoring and event logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { securityMonitor } from '@/lib/security-monitor';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// GET /api/security - Get security events, threats, or rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'events';
    const severity = searchParams.get('severity')?.split(',');
    const status = searchParams.get('status');
    const resolved = searchParams.get('resolved') === 'true';
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let response: any = {};

    switch (type) {
      case 'events':
        response.events = securityMonitor.getEvents({
          severity: severity as any,
          resolved,
          startTime,
          endTime,
        });
        break;

      case 'threats':
        response.threats = securityMonitor.getThreats({
          severity: severity as any,
          status: status as any,
          startTime,
          endTime,
        });
        break;

      case 'rules':
        response.rules = securityMonitor.getRules();
        break;

      case 'stats':
        response.stats = securityMonitor.getSecurityStats();
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Must be one of: events, threats, rules, stats' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Security monitoring API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/security - Log a security event or create a rule
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
      case 'log-event':
        const { type, title, description, metadata, severity } = body;
        
        if (!type || !title || !description) {
          return NextResponse.json(
            { error: 'Missing required fields: type, title, description' },
            { status: 400 }
          );
        }
        
        const eventId = securityMonitor.logEvent(
          type,
          title,
          description,
          metadata || {},
          severity || 'medium'
        );
        
        response = {
          success: true,
          eventId,
          message: 'Security event logged successfully',
        };
        break;

      case 'create-rule':
        const { rule } = body;
        
        if (!rule || !rule.name || !rule.eventType) {
          return NextResponse.json(
            { error: 'Missing required fields in rule: name, eventType' },
            { status: 400 }
          );
        }
        
        const ruleId = securityMonitor.addRule(rule);
        
        response = {
          success: true,
          ruleId,
          message: 'Security rule created successfully',
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: log-event, create-rule' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Security monitoring API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/security - Update security data
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
      case 'resolve-event':
        success = securityMonitor.resolveEvent(id, userId);
        message = success ? 'Security event resolved' : 'Security event not found';
        break;

      case 'resolve-threat':
        const { status } = body;
        success = securityMonitor.resolveThreat(id, userId, status);
        message = success ? 'Security threat resolved' : 'Security threat not found';
        break;

      case 'update-rule':
        const { updates } = body;
        if (!updates) {
          return NextResponse.json(
            { error: 'Missing required field: updates' },
            { status: 400 }
          );
        }
        success = securityMonitor.updateRule(id, updates);
        message = success ? 'Security rule updated' : 'Security rule not found';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: resolve-event, resolve-threat, update-rule' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success,
      message,
    });
  } catch (error) {
    logger.error('Security monitoring API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/security - Delete security rules or clear data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const id = searchParams.get('id');

    if (!action) {
      return NextResponse.json(
        { error: 'Missing required parameter: action' },
        { status: 400 }
      );
    }

    let success = false;
    let message = '';

    switch (action) {
      case 'delete-rule':
        if (!id) {
          return NextResponse.json(
            { error: 'Missing required parameter: id' },
            { status: 400 }
          );
        }
        success = securityMonitor.removeRule(id);
        message = success ? 'Security rule deleted' : 'Security rule not found';
        break;

      case 'clear-data':
        securityMonitor.clearData();
        success = true;
        message = 'All security data cleared';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: delete-rule, clear-data' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success,
      message,
    });
  } catch (error) {
    logger.error('Security monitoring API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}