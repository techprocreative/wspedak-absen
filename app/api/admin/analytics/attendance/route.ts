/**
 * API Route for Attendance Analytics
 * Provides access to attendance analytics and patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { businessIntelligence } from '@/lib/analytics/business-intelligence';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const department = searchParams.get('department') || undefined;

    // Get attendance analytics
    const analytics = businessIntelligence.getAttendanceAnalytics({
      startDate,
      endDate,
      department
    });

    // Get attendance patterns
    const patterns = businessIntelligence.analyzeAttendancePatterns();

    // Get late arrival trends
    const lateArrivalTrends = businessIntelligence.analyzeLateArrivalTrends();

    // Get absenteeism patterns
    const absenteeismPatterns = businessIntelligence.analyzeAbsenteeismPatterns();

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        patterns,
        lateArrivalTrends,
        absenteeismPatterns
      }
    });
  } catch (error) {
    logger.error('Error fetching attendance analytics', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch attendance analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'refreshData':
        await businessIntelligence.refreshData();
        return NextResponse.json({
          success: true,
          message: 'Attendance data refreshed successfully'
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
    logger.error('Error in attendance analytics POST', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}