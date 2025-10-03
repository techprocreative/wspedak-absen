/**
 * Business Metrics API Endpoint
 * Provides HTTP endpoints for business metrics tracking
 */

import { NextRequest, NextResponse } from 'next/server';
import { businessMetricsCollector } from '@/lib/business-metrics';

// GET /api/business-metrics - Get business metrics, definitions, or goals
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'metrics';
    const category = searchParams.get('category');
    const id = searchParams.get('id');
    const achieved = searchParams.get('achieved') === 'true';
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let response: any = {};

    switch (type) {
      case 'metrics':
        if (id) {
          response.metrics = businessMetricsCollector.getMetrics(id, {
            startTime,
            endTime,
            limit,
          });
        } else if (category) {
          response.metrics = businessMetricsCollector.getMetricsByCategory(
            category as any,
            { startTime, endTime, limit }
          );
        } else {
          response.metrics = businessMetricsCollector.getMetrics(undefined, {
            startTime,
            endTime,
            limit,
          });
        }
        break;

      case 'definitions':
        response.definitions = businessMetricsCollector.getMetricDefinitions();
        break;

      case 'goals':
        response.goals = businessMetricsCollector.getGoals({
          achieved,
          category: category as any,
        });
        break;

      case 'report':
        if (!category) {
          return NextResponse.json(
            { error: 'Category parameter is required for report type' },
            { status: 400 }
          );
        }

        if (!startTime || !endTime) {
          return NextResponse.json(
            { error: 'Start and end time parameters are required for report type' },
            { status: 400 }
          );
        }

        const report = businessMetricsCollector.generateReport(
          `${category} Report`,
          `Business metrics report for ${category}`,
          category as any,
          { start: startTime, end: endTime }
        );

        response.report = report;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Must be one of: metrics, definitions, goals, report' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Business metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/business-metrics - Record a metric or create a goal
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
      case 'set-metric':
        const { id, value, tags, metadata } = body;
        
        if (!id || value === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields: id, value' },
            { status: 400 }
          );
        }
        
        businessMetricsCollector.setMetric(id, value, tags, metadata);
        
        response = {
          success: true,
          message: 'Metric recorded successfully',
        };
        break;

      case 'increment-counter':
        const { counterId, incValue, incTags } = body;
        
        if (!counterId) {
          return NextResponse.json(
            { error: 'Missing required field: counterId' },
            { status: 400 }
          );
        }
        
        businessMetricsCollector.incrementCounter(counterId, incValue, incTags);
        
        response = {
          success: true,
          message: 'Counter incremented successfully',
        };
        break;

      case 'record-timer':
        const { timerId, timerValue, timerTags } = body;
        
        if (!timerId || timerValue === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields: timerId, timerValue' },
            { status: 400 }
          );
        }
        
        businessMetricsCollector.recordTimer(timerId, timerValue, timerTags);
        
        response = {
          success: true,
          message: 'Timer recorded successfully',
        };
        break;

      case 'create-goal':
        const { name, description, metricId, targetValue, operator, dueDate } = body;
        
        if (!name || !description || !metricId || targetValue === undefined) {
          return NextResponse.json(
            { error: 'Missing required fields: name, description, metricId, targetValue' },
            { status: 400 }
          );
        }
        
        const goalId = businessMetricsCollector.createGoal(
          name,
          description,
          metricId,
          targetValue,
          operator,
          dueDate ? new Date(dueDate) : undefined
        );
        
        response = {
          success: true,
          goalId,
          message: 'Goal created successfully',
        };
        break;

      case 'define-metric':
        const { definition } = body;
        
        if (!definition || !definition.id || !definition.name || !definition.category || !definition.type) {
          return NextResponse.json(
            { error: 'Missing required fields in definition: id, name, category, type' },
            { status: 400 }
          );
        }
        
        businessMetricsCollector.defineMetric(definition);
        
        response = {
          success: true,
          message: 'Metric definition created successfully',
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: set-metric, increment-counter, record-timer, create-goal, define-metric' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Business metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/business-metrics - Clear metrics
export async function DELETE(request: NextRequest) {
  try {
    businessMetricsCollector.clearMetrics();
    return NextResponse.json({
      success: true,
      message: 'Business metrics cleared',
    });
  } catch (error) {
    console.error('Business metrics API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}