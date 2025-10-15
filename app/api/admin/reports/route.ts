/**
 * API Route for Report Generation
 * Provides access to report creation, management, and generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { businessIntelligence } from '@/lib/analytics/business-intelligence';
import { predictiveAnalytics } from '@/lib/analytics/predictive-analytics';
import { chartBuilder } from '@/lib/visualization/chart-builder';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as any;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;

    let data: any = {};

    switch (type) {
      case 'analytics':
        data.reports = businessIntelligence.getReports({ limit });
        break;
      
      case 'predictions':
        data.predictions = predictiveAnalytics.getPredictions({ limit });
        break;
      
      case 'charts':
        data.charts = chartBuilder.getCharts().slice(0, limit || 50);
        break;
      
      case 'templates':
        data.templates = chartBuilder.getTemplates();
        break;
      
      case 'dashboards':
        data.dashboards = chartBuilder.getDashboards();
        break;
      
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid report type'
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
    logger.error('Error fetching reports', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reports' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, reportType, dateRange, includeCharts, templateId, chartType, chartData } = body;

    switch (action) {
      case 'generateReport':
        if (!reportType || !dateRange) {
          return NextResponse.json({
            success: false,
            error: 'Report type and date range are required'
          }, { status: 400 });
        }
        
        const report = businessIntelligence.generateReport({
          type: reportType,
          dateRange: {
            start: new Date(dateRange.start),
            end: new Date(dateRange.end)
          },
          includeCharts: includeCharts !== false
        });
        
        return NextResponse.json({
          success: true,
          data: report,
          message: 'Report generated successfully'
        });
      
      case 'createChart':
        if (!chartType || !chartData) {
          return NextResponse.json({
            success: false,
            error: 'Chart type and data are required'
          }, { status: 400 });
        }
        
        let chart;
        if (templateId) {
          chart = chartBuilder.createChartFromTemplate(templateId, chartData);
        } else {
          chart = chartBuilder.createChart({
            type: chartType,
            title: body.title || 'Chart',
            data: chartData,
            xAxis: body.xAxis || {
              label: 'X Axis',
              type: 'category',
              position: 'bottom'
            },
            yAxis: body.yAxis || {
              label: 'Y Axis',
              type: 'value',
              position: 'left'
            },
            series: body.series || [{
              id: 'series1',
              name: 'Series 1',
              data: chartData
            }],
            colors: body.colors || ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
            responsive: true,
            theme: 'auto',
            size: {
              width: '100%',
              height: 400
            },
            layout: {
              padding: { top: 10, right: 10, bottom: 40, left: 50 },
              margin: { top: 0, right: 0, bottom: 0, left: 0 }
            },
            exportOptions: {
              enabled: true,
              formats: ['png', 'svg'],
              filename: 'chart',
              scale: 1
            },
            metadata: {}
          });
        }
        
        return NextResponse.json({
          success: true,
          data: chart,
          message: 'Chart created successfully'
        });
      
      case 'createDashboard':
        if (!body.name) {
          return NextResponse.json({
            success: false,
            error: 'Dashboard name is required'
          }, { status: 400 });
        }
        
        const dashboard = chartBuilder.createDashboard({
          name: body.name,
          description: body.description,
          layout: body.layout || 'grid',
          widgets: body.widgets || [],
          theme: body.theme || 'auto',
          filters: body.filters || [],
          refreshInterval: body.refreshInterval,
          autoRefresh: body.autoRefresh !== false,
          createdBy: body.createdBy || 'system',
          shared: body.shared || false,
          public: body.public || false,
          permissions: body.permissions || {
            view: ['admin'],
            edit: ['admin'],
            share: ['admin']
          }
        });
        
        return NextResponse.json({
          success: true,
          data: dashboard,
          message: 'Dashboard created successfully'
        });
      
      case 'exportChart':
        if (!body.chartId) {
          return NextResponse.json({
            success: false,
            error: 'Chart ID is required'
          }, { status: 400 });
        }
        
        const exportData = chartBuilder.exportChart(
          body.chartId,
          body.format || 'json'
        );
        
        return NextResponse.json({
          success: true,
          data: exportData,
          message: 'Chart exported successfully'
        });
      
      case 'generateChartImage':
        if (!body.chartId) {
          return NextResponse.json({
            success: false,
            error: 'Chart ID is required'
          }, { status: 400 });
        }
        
        const imageUrl = await chartBuilder.generateChartImage(
          body.chartId,
          {
            format: body.format || 'png',
            width: body.width,
            height: body.height,
            scale: body.scale
          }
        );
        
        return NextResponse.json({
          success: true,
          data: { imageUrl },
          message: 'Chart image generated successfully'
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
    logger.error('Error in reports POST', error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to process request' },
      { status: 500 }
    );
  }
}