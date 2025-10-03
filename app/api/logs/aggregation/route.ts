/**
 * Log Aggregation API Endpoint
 * Provides HTTP endpoints for log aggregation and analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { logAggregator } from '@/lib/log-aggregator';

// GET /api/logs/aggregation - Get log aggregations or analyses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'aggregations';
    const analysisType = searchParams.get('analysisType');
    const startTime = searchParams.get('startTime') ? new Date(searchParams.get('startTime')!) : undefined;
    const endTime = searchParams.get('endTime') ? new Date(searchParams.get('endTime')!) : undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const id = searchParams.get('id');

    let response: any = {};

    switch (type) {
      case 'aggregations':
        if (id) {
          // Get specific aggregation
          const aggregations = logAggregator.getAggregations({ limit: 100 });
          const aggregation = aggregations.find(a => a.id === id);
          response.aggregation = aggregation || null;
        } else {
          // Get aggregations with filters
          response.aggregations = logAggregator.getAggregations({
            startTime,
            endTime,
            limit,
          });
        }
        break;

      case 'latest':
        response.aggregation = logAggregator.getLatestAggregation();
        break;

      case 'analyses':
        if (id) {
          // Get specific analysis
          response.analysis = logAggregator.getAnalysis(id || '');
        } else {
          // Get analyses with filters
          response.analyses = logAggregator.getAnalyses({
            type: analysisType as any,
            startTime,
            endTime,
            limit,
          });
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type parameter. Must be one of: aggregations, latest, analyses' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Log aggregation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/logs/aggregation - Perform log analysis
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
      case 'analyze':
        const { name, description, type, timeRange, filters } = body;
        
        if (!name || !description || !type || !timeRange) {
          return NextResponse.json(
            { error: 'Missing required fields: name, description, type, timeRange' },
            { status: 400 }
          );
        }
        
        const analysisId = await logAggregator.performAnalysis(
          name,
          description,
          type,
          {
            start: new Date(timeRange.start),
            end: new Date(timeRange.end),
          },
          filters || []
        );
        
        response = {
          success: true,
          analysisId,
          message: 'Analysis completed successfully',
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: analyze' },
          { status: 400 }
        );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Log aggregation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/logs/aggregation - Delete analysis or clear data
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
      case 'delete-analysis':
        if (!id) {
          return NextResponse.json(
            { error: 'Missing required parameter: id' },
            { status: 400 }
          );
        }
        success = logAggregator.deleteAnalysis(id);
        message = success ? 'Analysis deleted' : 'Analysis not found';
        break;

      case 'clear-data':
        logAggregator.clearData();
        success = true;
        message = 'All log aggregation data cleared';
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Must be one of: delete-analysis, clear-data' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success,
      message,
    });
  } catch (error) {
    console.error('Log aggregation API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}