/**
 * API Route for Performance Analytics
 * Provides access to employee performance analytics and department comparisons
 */

import { NextRequest, NextResponse } from 'next/server';
import { businessIntelligence } from '@/lib/analytics/business-intelligence';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const sortBy = searchParams.get('sortBy') as any || 'productivity';
    const sortOrder = searchParams.get('sortOrder') as any || 'desc';

    // Get department analytics
    const departmentAnalytics = businessIntelligence.getDepartmentAnalytics();

    // Get employee performance
    const employeePerformance = businessIntelligence.getEmployeePerformance({
      department,
      limit,
      sortBy,
      sortOrder
    });

    // Get department comparisons
    const departmentComparisons = businessIntelligence.compareDepartments();

    // Get business metrics
    const businessMetrics = businessIntelligence.getBusinessMetrics();

    return NextResponse.json({
      success: true,
      data: {
        departments: departmentAnalytics,
        employees: employeePerformance,
        comparisons: departmentComparisons,
        metrics: businessMetrics
      }
    });
  } catch (error) {
    console.error('Error fetching performance analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch performance analytics' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, metricId, updates } = body;

    switch (action) {
      case 'updateMetric':
        if (metricId && updates) {
          const success = businessIntelligence.updateBusinessMetric(metricId, updates);
          if (success) {
            return NextResponse.json({
              success: true,
              message: 'Business metric updated successfully'
            });
          } else {
            return NextResponse.json({
              success: false,
              error: 'Metric not found'
            }, { status: 404 });
          }
        }
        break;
      
      case 'refreshData':
        await businessIntelligence.refreshData();
        return NextResponse.json({
          success: true,
          message: 'Performance data refreshed successfully'
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
    console.error('Error in performance analytics POST:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}