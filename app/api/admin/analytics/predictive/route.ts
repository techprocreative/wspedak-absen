/**
 * API Route for Predictive Analytics
 * Provides access to predictions, forecasts, and anomaly detection
 */

import { NextRequest, NextResponse } from 'next/server';
import { predictiveAnalytics } from '@/lib/analytics/predictive-analytics';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'attendance';
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : undefined;
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined;
    const department = searchParams.get('department') || undefined;

    let data: any = {};

    switch (type) {
      case 'attendance':
        data.predictions = predictiveAnalytics.predictAttendance({
          startDate: startDate || new Date(),
          endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          department
        });
        break;
      
      case 'turnover':
        data.risks = predictiveAnalytics.predictTurnoverRisk();
        break;
      
      case 'productivity':
        data.forecasts = predictiveAnalytics.forecastProductivity(4);
        break;
      
      case 'anomalies':
        data.anomalies = predictiveAnalytics.detectAnomalies();
        break;
      
      case 'staffing':
        data.staffing = predictiveAnalytics.predictStaffing({
          startDate: startDate || new Date(),
          endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          department
        });
        break;
      
      case 'models':
        data.models = predictiveAnalytics.getModels();
        break;
      
      case 'comprehensive':
        data.predictions = predictiveAnalytics.predictAttendance({
          startDate: startDate || new Date(),
          endDate: endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          department
        });
        data.risks = predictiveAnalytics.predictTurnoverRisk();
        data.forecasts = predictiveAnalytics.forecastProductivity(4);
        data.anomalies = predictiveAnalytics.detectAnomalies();
        data.models = predictiveAnalytics.getModels();
        break;
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid prediction type'
        }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        type,
        ...data
      }
    });
  } catch (error) {
    console.error('Error fetching predictive analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch predictive analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, department, period } = body;

    switch (action) {
      case 'generateReport':
        const report = predictiveAnalytics.generatePredictionReport();
        return NextResponse.json({
          success: true,
          data: report
        });
      
      case 'optimizeSchedule':
        if (!department) {
          return NextResponse.json({
            success: false,
            error: 'Department is required for schedule optimization'
          }, { status: 400 });
        }
        
        const optimization = predictiveAnalytics.optimizeSchedule(
          department,
          period || 'week'
        );
        
        return NextResponse.json({
          success: true,
          data: optimization
        });
      
      case 'cleanup':
        predictiveAnalytics.cleanup();
        return NextResponse.json({
          success: true,
          message: 'Predictive analytics data cleaned up'
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
    console.error('Error in predictive analytics POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}