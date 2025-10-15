/**
 * Visualization and Chart Builder Library
 * Provides comprehensive chart generation and data visualization capabilities
 * Optimized for production environments
 */

import { businessIntelligence } from '@/lib/analytics/business-intelligence';
import { predictiveAnalytics } from '@/lib/analytics/predictive-analytics';
import { systemMonitor } from '@/lib/monitoring/system-monitor';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// Chart interfaces
export interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  description?: string;
  data: any[];
  xAxis: ChartAxis;
  yAxis: ChartAxis;
  series: ChartSeries[];
  colors: string[];
  legend?: ChartLegend;
  tooltip?: ChartTooltip;
  animations?: ChartAnimations;
  interactions?: ChartInteractions;
  filters?: ChartFilter[];
  responsive: boolean;
  theme: 'light' | 'dark' | 'auto';
  size: ChartSize;
  layout: ChartLayout;
  exportOptions: ChartExportOptions;
  metadata: any;
}

export type ChartType = 
  | 'line'
  | 'bar'
  | 'column'
  | 'pie'
  | 'donut'
  | 'area'
  | 'scatter'
  | 'bubble'
  | 'heatmap'
  | 'treemap'
  | 'radar'
  | 'polar'
  | 'gauge'
  | 'funnel'
  | 'sankey'
  | 'histogram'
  | 'boxplot'
  | 'candlestick'
  | 'ohlc'
  | 'waterfall'
  | 'wordcloud';

export interface ChartAxis {
  label: string;
  type: 'category' | 'value' | 'datetime' | 'log';
  min?: number;
  max?: number;
  tickInterval?: number;
  format?: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  reversed?: boolean;
  title?: string;
  gridLines?: boolean;
  tickMarks?: boolean;
  labels?: boolean;
}

export interface ChartSeries {
  id: string;
  name: string;
  data: any[];
  type?: ChartType;
  color?: string;
  lineWidth?: number;
  marker?: ChartMarker;
  visible?: boolean;
  stack?: string;
  yAxis?: number;
  zIndex?: number;
  dashStyle?: string;
}

export interface ChartMarker {
  enabled: boolean;
  symbol: string;
  radius: number;
  fillColor?: string;
  lineColor?: string;
  lineWidth?: number;
}

export interface ChartLegend {
  enabled: boolean;
  position: 'top' | 'bottom' | 'left' | 'right';
  align: 'center' | 'left' | 'right';
  layout: 'horizontal' | 'vertical';
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  itemStyle?: any;
}

export interface ChartTooltip {
  enabled: boolean;
  format: string;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  style?: any;
  shared?: boolean;
  crosshairs?: boolean;
}

export interface ChartAnimations {
  enabled: boolean;
  duration: number;
  easing: string;
}

export interface ChartInteractions {
  zoom: boolean;
  pan: boolean;
  crosshair: boolean;
  dataLabels: boolean;
  drilldown: boolean;
  selection: boolean;
}

export interface ChartFilter {
  id: string;
  field: string;
  type: 'select' | 'multiselect' | 'range' | 'date';
  label: string;
  options?: any[];
  defaultValue?: any;
  required?: boolean;
}

export interface ChartSize {
  width: number | string;
  height: number | string;
  aspectRatio?: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

export interface ChartLayout {
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  margin: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface ChartExportOptions {
  enabled: boolean;
  formats: ('png' | 'jpg' | 'svg' | 'pdf' | 'csv' | 'xlsx')[];
  filename: string;
  scale: number;
  backgroundColor?: string;
}

export interface DashboardWidget {
  id: string;
  type: 'chart' | 'metric' | 'table' | 'text' | 'image' | 'custom';
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: any;
  dataSource: string;
  refreshInterval?: number;
  filters?: string[];
  interactions?: any;
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  layout: 'grid' | 'flex' | 'absolute';
  widgets: DashboardWidget[];
  theme: 'light' | 'dark' | 'auto';
  filters: ChartFilter[];
  refreshInterval?: number;
  autoRefresh: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  shared: boolean;
  public: boolean;
  permissions: {
    view: string[];
    edit: string[];
    share: string[];
  };
}

export interface ChartTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  type: ChartType;
  config: Partial<ChartConfig>;
  preview?: string;
  tags: string[];
  popular: boolean;
  createdAt: Date;
  createdBy: string;
}

class ChartBuilder {
  private charts: Map<string, ChartConfig> = new Map();
  private dashboards: Map<string, Dashboard> = new Map();
  private templates: Map<string, ChartTemplate> = new Map();
  private colorPalettes: Map<string, string[]> = new Map();

  constructor() {
    this.initializeColorPalettes();
    this.initializeTemplates();
  }

  // Initialize color palettes
  private initializeColorPalettes(): void {
    this.colorPalettes.set('default', [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#14B8A6', '#F97316', '#06B6D4', '#84CC16'
    ]);

    this.colorPalettes.set('pastel', [
      '#93C5FD', '#86EFAC', '#FCD34D', '#FCA5A5', '#C4B5FD',
      '#F9A8D4', '#5EEAD4', '#FDBA74', '#67E8F9', '#BEF264'
    ]);

    this.colorPalettes.set('vibrant', [
      '#2563EB', '#059669', '#D97706', '#DC2626', '#7C3AED',
      '#DB2777', '#0D9488', '#EA580C', '#0891B2', '#65A30D'
    ]);

    this.colorPalettes.set('monochrome', [
      '#1F2937', '#374151', '#4B5563', '#6B7280', '#9CA3AF',
      '#D1D5DB', '#E5E7EB', '#F3F4F6', '#F9FAFB', '#FFFFFF'
    ]);
  }

  // Initialize chart templates
  private initializeTemplates(): void {
    const templates: Omit<ChartTemplate, 'id'>[] = [
      {
        name: 'Attendance Trend',
        description: 'Line chart showing attendance trends over time',
        category: 'Attendance',
        type: 'line',
        config: {
          title: 'Attendance Trend',
          xAxis: {
            label: 'Date',
            type: 'datetime',
            title: 'Date',
            position: 'bottom'
          },
          yAxis: {
            label: 'Attendance Rate',
            type: 'value',
            min: 0,
            max: 100,
            title: 'Attendance Rate (%)',
            position: 'left'
          },
          series: [
            {
              id: 'attendance',
              name: 'Attendance Rate',
              data: [],
              color: '#3B82F6',
              lineWidth: 2
            }
          ],
          colors: ['#3B82F6'],
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
            formats: ['png', 'svg', 'csv'],
            filename: 'attendance-trend',
            scale: 2
          }
        },
        tags: ['attendance', 'trend', 'line'],
        popular: true,
        createdAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'Department Performance',
        description: 'Bar chart comparing performance across departments',
        category: 'Performance',
        type: 'bar',
        config: {
          title: 'Department Performance Comparison',
          xAxis: {
            label: 'Department',
            type: 'category',
            title: 'Department',
            position: 'bottom'
          },
          yAxis: {
            label: 'Performance Score',
            type: 'value',
            min: 0,
            max: 100,
            title: 'Performance Score',
            position: 'left'
          },
          series: [
            {
              id: 'performance',
              name: 'Performance Score',
              data: [],
              color: '#10B981'
            }
          ],
          colors: ['#10B981'],
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
            formats: ['png', 'svg', 'csv'],
            filename: 'department-performance',
            scale: 2
          }
        },
        tags: ['performance', 'department', 'bar'],
        popular: true,
        createdAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'Attendance Distribution',
        description: 'Pie chart showing attendance distribution',
        category: 'Attendance',
        type: 'pie',
        config: {
          title: 'Attendance Distribution',
          series: [
            {
              id: 'attendance',
              name: 'Attendance',
              data: []
            }
          ],
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
          responsive: true,
          theme: 'auto',
          size: {
            width: '100%',
            height: 400
          },
          layout: {
            padding: { top: 10, right: 10, bottom: 10, left: 10 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 }
          },
          exportOptions: {
            enabled: true,
            formats: ['png', 'svg', 'csv'],
            filename: 'attendance-distribution',
            scale: 2
          }
        },
        tags: ['attendance', 'distribution', 'pie'],
        popular: true,
        createdAt: new Date(),
        createdBy: 'system'
      },
      {
        name: 'Productivity Heatmap',
        description: 'Heatmap showing productivity patterns',
        category: 'Productivity',
        type: 'heatmap',
        config: {
          title: 'Productivity Heatmap',
          xAxis: {
            label: 'Day of Week',
            type: 'category',
            title: 'Day',
            position: 'bottom'
          },
          yAxis: {
            label: 'Hour',
            type: 'category',
            title: 'Hour',
            position: 'left'
          },
          series: [
            {
              id: 'productivity',
              name: 'Productivity',
              data: []
            }
          ],
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
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
            formats: ['png', 'svg', 'csv'],
            filename: 'productivity-heatmap',
            scale: 2
          }
        },
        tags: ['productivity', 'heatmap', 'pattern'],
        popular: false,
        createdAt: new Date(),
        createdBy: 'system'
      }
    ];

    templates.forEach(template => {
      this.templates.set(
        `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        {
          ...template,
          id: `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }
      );
    });
  }

  // Create chart from template
  createChartFromTemplate(templateId: string, data: any[], overrides: Partial<ChartConfig> = {}): ChartConfig {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    const chartConfig: ChartConfig = {
      id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      title: template.config.title || template.name,
      data,
      xAxis: template.config.xAxis || {
        label: 'X Axis',
        type: 'category',
        position: 'bottom'
      },
      yAxis: template.config.yAxis || {
        label: 'Y Axis',
        type: 'value',
        position: 'left'
      },
      series: template.config.series || [],
      colors: template.config.colors || this.colorPalettes.get('default')!,
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
      metadata: { templateId },
      ...template.config,
      ...overrides
    };

    // Update series data
    if (data.length > 0 && chartConfig.series.length > 0) {
      chartConfig.series[0].data = data;
    }

    this.charts.set(chartConfig.id, chartConfig);
    return chartConfig;
  }

  // Create custom chart
  createChart(config: Omit<ChartConfig, 'id'>): ChartConfig {
    const chartConfig: ChartConfig = {
      id: `chart_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...config
    };

    this.charts.set(chartConfig.id, chartConfig);
    return chartConfig;
  }

  // Get chart by ID
  getChart(id: string): ChartConfig | null {
    return this.charts.get(id) || null;
  }

  // Update chart
  updateChart(id: string, updates: Partial<ChartConfig>): boolean {
    const chart = this.charts.get(id);
    if (chart) {
      Object.assign(chart, updates);
      return true;
    }
    return false;
  }

  // Delete chart
  deleteChart(id: string): boolean {
    return this.charts.delete(id);
  }

  // Get all charts
  getCharts(): ChartConfig[] {
    return Array.from(this.charts.values());
  }

  // Create attendance trend chart
  createAttendanceTrendChart(options: {
    startDate?: Date;
    endDate?: Date;
    department?: string;
  } = {}): ChartConfig {
    const attendanceData = businessIntelligence.getAttendanceAnalytics(options);
    
    const data = attendanceData.map((day: any) => ({
      x: day.date,
      y: day.attendanceRate
    }));

    return this.createChart({
      type: 'line',
      title: 'Attendance Trend',
      description: 'Daily attendance rate over time',
      data,
      xAxis: {
        label: 'Date',
        type: 'datetime',
        title: 'Date',
        format: '%Y-%m-%d',
        position: 'bottom'
      },
      yAxis: {
        label: 'Attendance Rate',
        type: 'value',
        min: 0,
        max: 100,
        title: 'Attendance Rate (%)',
        position: 'left'
      },
      series: [
        {
          id: 'attendance',
          name: 'Attendance Rate',
          data,
          color: '#3B82F6',
          lineWidth: 2
        }
      ],
      colors: ['#3B82F6'],
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
        formats: ['png', 'svg', 'csv'],
        filename: 'attendance-trend',
        scale: 2
      },
      metadata: { type: 'attendance', options }
    });
  }

  // Create department performance chart
  createDepartmentPerformanceChart(): ChartConfig {
    const departmentData = businessIntelligence.getDepartmentAnalytics();
    
    const data = departmentData.map((dept: any) => ({
      x: dept.name,
      y: dept.productivity
    }));

    return this.createChart({
      type: 'bar',
      title: 'Department Performance Comparison',
      description: 'Productivity scores by department',
      data,
      xAxis: {
        label: 'Department',
        type: 'category',
        title: 'Department',
        position: 'bottom'
      },
      yAxis: {
        label: 'Productivity Score',
        type: 'value',
        min: 0,
        max: 100,
        title: 'Productivity Score',
        position: 'left'
      },
      series: [
        {
          id: 'productivity',
          name: 'Productivity Score',
          data,
          color: '#10B981'
        }
      ],
      colors: ['#10B981'],
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
        formats: ['png', 'svg', 'csv'],
        filename: 'department-performance',
        scale: 2
      },
      metadata: { type: 'department' }
    });
  }

  // Create attendance distribution chart
  createAttendanceDistributionChart(): ChartConfig {
    const attendanceData = businessIntelligence.getAttendanceAnalytics();
    const latestData = attendanceData[attendanceData.length - 1];
    
    if (!latestData) {
      throw new Error('No attendance data available');
    }

    const data = [
      { name: 'Present', value: latestData.present },
      { name: 'Absent', value: latestData.absent },
      { name: 'Late', value: latestData.late },
      { name: 'Early Leave', value: latestData.earlyLeave }
    ];

    return this.createChart({
      type: 'pie',
      title: 'Attendance Distribution',
      description: 'Distribution of attendance statuses',
      data,
      xAxis: {
        label: 'Status',
        type: 'category',
        position: 'bottom'
      },
      yAxis: {
        label: 'Count',
        type: 'value',
        position: 'left'
      },
      series: [
        {
          id: 'attendance',
          name: 'Attendance',
          data
        }
      ],
      colors: ['#10B981', '#EF4444', '#F59E0B', '#3B82F6'],
      responsive: true,
      theme: 'auto',
      size: {
        width: '100%',
        height: 400
      },
      layout: {
        padding: { top: 10, right: 10, bottom: 10, left: 10 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 }
      },
      exportOptions: {
        enabled: true,
        formats: ['png', 'svg', 'csv'],
        filename: 'attendance-distribution',
        scale: 2
      },
      metadata: { type: 'attendance' }
    });
  }

  // Create productivity heatmap
  createProductivityHeatmap(): ChartConfig {
    // Generate mock heatmap data
    const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const hours = ['8AM', '9AM', '10AM', '11AM', '12PM', '1PM', '2PM', '3PM', '4PM', '5PM'];
    
    const data: any[] = [];
    daysOfWeek.forEach((day, dayIndex) => {
      hours.forEach((hour, hourIndex) => {
        // Generate productivity value with some patterns
        let value = 70 + Math.random() * 25;
        
        // Lower productivity at lunch time
        if (hourIndex === 4 || hourIndex === 5) value -= 15;
        
        // Lower productivity on Monday morning and Friday afternoon
        if ((dayIndex === 0 && hourIndex < 2) || (dayIndex === 4 && hourIndex > 7)) value -= 10;
        
        data.push({
          x: hour,
          y: day,
          value: Math.max(50, Math.min(100, value))
        });
      });
    });

    return this.createChart({
      type: 'heatmap',
      title: 'Productivity Heatmap',
      description: 'Productivity patterns by day and hour',
      data,
      xAxis: {
        label: 'Hour',
        type: 'category',
        title: 'Hour of Day',
        position: 'bottom'
      },
      yAxis: {
        label: 'Day',
        type: 'category',
        title: 'Day of Week',
        position: 'left'
      },
      series: [
        {
          id: 'productivity',
          name: 'Productivity',
          data
        }
      ],
      colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
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
        formats: ['png', 'svg', 'csv'],
        filename: 'productivity-heatmap',
        scale: 2
      },
      metadata: { type: 'productivity' }
    });
  }

  // Create system metrics chart
  createSystemMetricsChart(): ChartConfig {
    const systemMetrics = systemMonitor.getMetricsHistory({ limit: 24 }); // Last 24 data points
    
    const cpuData = systemMetrics.map(metric => ({
      x: metric.timestamp,
      y: metric.cpu.usage
    }));
    
    const memoryData = systemMetrics.map(metric => ({
      x: metric.timestamp,
      y: metric.memory.usagePercentage
    }));
    
    const storageData = systemMetrics.map(metric => ({
      x: metric.timestamp,
      y: metric.storage.usagePercentage
    }));

    return this.createChart({
      type: 'line',
      title: 'System Metrics',
      description: 'CPU, Memory, and Storage usage over time',
      data: [...cpuData, ...memoryData, ...storageData],
      xAxis: {
        label: 'Time',
        type: 'datetime',
        title: 'Time',
        format: '%H:%M',
        position: 'bottom'
      },
      yAxis: {
        label: 'Usage',
        type: 'value',
        min: 0,
        max: 100,
        title: 'Usage (%)',
        position: 'left'
      },
      series: [
        {
          id: 'cpu',
          name: 'CPU Usage',
          data: cpuData,
          color: '#EF4444',
          lineWidth: 2
        },
        {
          id: 'memory',
          name: 'Memory Usage',
          data: memoryData,
          color: '#F59E0B',
          lineWidth: 2
        },
        {
          id: 'storage',
          name: 'Storage Usage',
          data: storageData,
          color: '#10B981',
          lineWidth: 2
        }
      ],
      colors: ['#EF4444', '#F59E0B', '#10B981'],
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
        formats: ['png', 'svg', 'csv'],
        filename: 'system-metrics',
        scale: 2
      },
      metadata: { type: 'system' }
    });
  }

  // Create prediction chart
  createPredictionChart(type: 'attendance' | 'turnover' | 'productivity' = 'attendance'): ChartConfig {
    let data: any[] = [];
    let title: string;
    let description: string;

    switch (type) {
      case 'attendance':
        const attendancePredictions = predictiveAnalytics.predictAttendance({
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // Next 7 days
        });
        
        data = attendancePredictions.map((pred: any) => ({
          x: pred.date,
          y: pred.predictedAttendanceRate,
          confidence: pred.confidence
        }));
        
        title = 'Attendance Prediction';
        description = 'Predicted attendance rates for the next 7 days';
        break;
        
      case 'turnover':
        const turnoverRisks = predictiveAnalytics.predictTurnoverRisk().slice(0, 10);
        
        data = turnoverRisks.map((risk: any) => ({
          x: risk.employeeName,
          y: risk.riskScore * 100,
          department: risk.department
        }));
        
        title = 'Turnover Risk Prediction';
        description = 'Top 10 employees with highest turnover risk';
        break;
        
      case 'productivity':
        const productivityForecasts = predictiveAnalytics.forecastProductivity(4);
        
        data = productivityForecasts.map((forecast: any) => ({
          x: forecast.period,
          y: forecast.predictedProductivity,
          confidence: forecast.confidence
        }));
        
        title = 'Productivity Forecast';
        description = 'Predicted productivity for the next 4 periods';
        break;
    }

    return this.createChart({
      type: type === 'turnover' ? 'bar' : 'line',
      title,
      description,
      data,
      xAxis: {
        label: type === 'turnover' ? 'Employee' : 'Period',
        type: type === 'turnover' ? 'category' : 'datetime',
        title: type === 'turnover' ? 'Employee' : 'Period',
        position: 'bottom'
      },
      yAxis: {
        label: type === 'turnover' ? 'Risk Score' : 'Value',
        type: 'value',
        min: 0,
        max: type === 'turnover' ? 100 : 100,
        title: type === 'turnover' ? 'Risk Score (%)' : 'Value',
        position: 'left'
      },
      series: [
        {
          id: 'prediction',
          name: type === 'turnover' ? 'Risk Score' : 'Prediction',
          data,
          color: type === 'turnover' ? '#EF4444' : '#8B5CF6',
          lineWidth: 2
        }
      ],
      colors: [type === 'turnover' ? '#EF4444' : '#8B5CF6'],
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
        formats: ['png', 'svg', 'csv'],
        filename: `${type}-prediction`,
        scale: 2
      },
      metadata: { type: 'prediction', predictionType: type }
    });
  }

  // Create dashboard
  createDashboard(config: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>): Dashboard {
    const dashboard: Dashboard = {
      id: `dashboard_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...config
    };

    this.dashboards.set(dashboard.id, dashboard);
    return dashboard;
  }

  // Get dashboard by ID
  getDashboard(id: string): Dashboard | null {
    return this.dashboards.get(id) || null;
  }

  // Update dashboard
  updateDashboard(id: string, updates: Partial<Dashboard>): boolean {
    const dashboard = this.dashboards.get(id);
    if (dashboard) {
      Object.assign(dashboard, updates, { updatedAt: new Date() });
      return true;
    }
    return false;
  }

  // Delete dashboard
  deleteDashboard(id: string): boolean {
    return this.dashboards.delete(id);
  }

  // Get all dashboards
  getDashboards(): Dashboard[] {
    return Array.from(this.dashboards.values());
  }

  // Get chart templates
  getTemplates(): ChartTemplate[] {
    return Array.from(this.templates.values());
  }

  // Get chart template by ID
  getTemplate(id: string): ChartTemplate | null {
    return this.templates.get(id) || null;
  }

  // Get color palettes
  getColorPalettes(): Map<string, string[]> {
    return this.colorPalettes;
  }

  // Get color palette by name
  getColorPalette(name: string): string[] | null {
    return this.colorPalettes.get(name) || null;
  }

  // Export chart data
  exportChart(chartId: string, format: 'json' | 'csv' | 'xlsx' = 'json'): string {
    const chart = this.charts.get(chartId);
    if (!chart) {
      throw new Error(`Chart ${chartId} not found`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(chart, null, 2);
      case 'csv':
        return this.convertToCSV(chart.data);
      case 'xlsx':
        // Would need additional library for Excel export
        return JSON.stringify(chart, null, 2);
      default:
        return JSON.stringify(chart, null, 2);
    }
  }

  // Convert data to CSV
  private convertToCSV(data: any[]): string {
    if (!data || data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(',')];

    for (const row of data) {
      const values = headers.map(header => {
        const value = row[header];
        return typeof value === 'string' ? `"${value}"` : value;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  }

  // Generate chart image (mock implementation)
  async generateChartImage(chartId: string, options: {
    format: 'png' | 'jpg' | 'svg';
    width?: number;
    height?: number;
    scale?: number;
  } = { format: 'png' }): Promise<string> {
    const chart = this.charts.get(chartId);
    if (!chart) {
      throw new Error(`Chart ${chartId} not found`);
    }

    // Mock implementation - in real system, this would use a charting library
    // to generate an actual image
    logger.info('Generating ${options.format} image for chart ${chartId}');
    
    // Return a placeholder URL
    return `data:image/${options.format};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;
  }

  // Clear old charts
  cleanup(olderThanDays: number = 30): void {
    const cutoffTime = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    
    // This would need to be implemented based on how chart metadata is stored
    // For now, just log the action
    logger.info('Cleaning up charts older than ${olderThanDays} days');
  }
}

// Singleton instance
export const chartBuilder = new ChartBuilder();

// Export types and functions
export type { ChartBuilder };
export { ChartBuilder as ChartBuilderClass };