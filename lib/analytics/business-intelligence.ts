/**
 * Business Intelligence Analytics Library
 * Provides comprehensive analytics capabilities for attendance and business metrics
 * Optimized for production environments
 */

import { systemMonitor } from '@/lib/monitoring/system-monitor';

// Attendance analytics interfaces
export interface AttendanceAnalytics {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  overtime: number;
  attendanceRate: number;
  punctualityRate: number;
  avgWorkHours: number;
  productivity: number;
}

export interface DepartmentAnalytics {
  name: string;
  totalEmployees: number;
  presentToday: number;
  attendanceRate: number;
  punctualityRate: number;
  avgWorkHours: number;
  overtimeHours: number;
  productivity: number;
  trend: 'up' | 'down' | 'stable';
}

export interface EmployeePerformance {
  id: string;
  name: string;
  department: string;
  attendanceRate: number;
  punctualityRate: number;
  avgWorkHours: number;
  productivity: number;
  rank: number;
  trend: 'up' | 'down' | 'stable';
  lateArrivals: number;
  earlyDepartures: number;
  absentDays: number;
  overtimeHours: number;
}

export interface AttendancePattern {
  pattern: string;
  frequency: number;
  percentage: number;
  description: string;
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
}

export interface LateArrivalTrend {
  hour: number;
  count: number;
  percentage: number;
  commonReasons: string[];
}

export interface AbsenteeismPattern {
  dayOfWeek: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonalFactor: number;
}

export interface DepartmentComparison {
  department: string;
  attendanceRate: number;
  punctualityRate: number;
  productivity: number;
  overtimeHours: number;
  ranking: number;
  strengths: string[];
  weaknesses: string[];
}

export interface SeasonalVariation {
  month: string;
  attendanceRate: number;
  punctualityRate: number;
  productivity: number;
  factors: string[];
  prediction: number;
}

export interface BusinessMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  category: 'attendance' | 'productivity' | 'performance' | 'efficiency';
  trend: 'up' | 'down' | 'stable';
  change: number;
  changePercentage: number;
  target: number;
  status: 'good' | 'warning' | 'critical';
  lastUpdated: Date;
}

export interface AnalyticsReport {
  id: string;
  title: string;
  description: string;
  type: 'attendance' | 'performance' | 'productivity' | 'comprehensive';
  dateRange: {
    start: Date;
    end: Date;
  };
  generatedAt: Date;
  data: any;
  insights: string[];
  recommendations: string[];
  charts: ChartConfig[];
}

export interface ChartConfig {
  id: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'heatmap';
  title: string;
  data: any[];
  xAxis: string;
  yAxis: string;
  colors: string[];
  filters?: any;
}

class BusinessIntelligence {
  private attendanceData: AttendanceAnalytics[] = [];
  private departmentData: DepartmentAnalytics[] = [];
  private employeePerformance: EmployeePerformance[] = [];
  private businessMetrics: BusinessMetric[] = [];
  private reports: AnalyticsReport[] = [];

  constructor() {
    this.initializeMockData();
  }

  // Initialize with mock data for demonstration
  private initializeMockData(): void {
    this.generateMockAttendanceData();
    this.generateMockDepartmentData();
    this.generateMockEmployeePerformance();
    this.generateMockBusinessMetrics();
  }

  // Generate mock attendance data
  private generateMockAttendanceData(): void {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    for (let i = 0; i < 30; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const totalEmployees = 150 + Math.floor(Math.random() * 20);
      const present = Math.floor(totalEmployees * (0.85 + Math.random() * 0.1));
      const absent = totalEmployees - present;
      const late = Math.floor(present * (0.05 + Math.random() * 0.1));
      const earlyLeave = Math.floor(present * (0.03 + Math.random() * 0.05));
      const overtime = Math.floor(present * (0.1 + Math.random() * 0.15));

      this.attendanceData.push({
        date: date.toISOString().split('T')[0],
        totalEmployees,
        present,
        absent,
        late,
        earlyLeave,
        overtime,
        attendanceRate: (present / totalEmployees) * 100,
        punctualityRate: ((present - late) / present) * 100,
        avgWorkHours: 8 + Math.random() * 2,
        productivity: 80 + Math.random() * 15
      });
    }
  }

  // Generate mock department data
  private generateMockDepartmentData(): void {
    const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales'];
    
    departments.forEach(dept => {
      const totalEmployees = 15 + Math.floor(Math.random() * 35);
      const presentToday = Math.floor(totalEmployees * (0.85 + Math.random() * 0.1));
      
      this.departmentData.push({
        name: dept,
        totalEmployees,
        presentToday,
        attendanceRate: (presentToday / totalEmployees) * 100,
        punctualityRate: 90 + Math.random() * 8,
        avgWorkHours: 7.5 + Math.random() * 2,
        overtimeHours: Math.floor(totalEmployees * (0.1 + Math.random() * 0.2)),
        productivity: 75 + Math.random() * 20,
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable'
      });
    });
  }

  // Generate mock employee performance data
  private generateMockEmployeePerformance(): void {
    for (let i = 1; i <= 50; i++) {
      const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Operations', 'Sales'];
      const department = departments[Math.floor(Math.random() * departments.length)];
      
      this.employeePerformance.push({
        id: `emp_${i}`,
        name: `Employee ${i}`,
        department,
        attendanceRate: 85 + Math.random() * 14,
        punctualityRate: 88 + Math.random() * 11,
        avgWorkHours: 7.5 + Math.random() * 2.5,
        productivity: 70 + Math.random() * 28,
        rank: 0, // Will be calculated
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'down' : 'stable',
        lateArrivals: Math.floor(Math.random() * 10),
        earlyDepartures: Math.floor(Math.random() * 8),
        absentDays: Math.floor(Math.random() * 5),
        overtimeHours: Math.floor(Math.random() * 20)
      });
    }

    // Calculate rankings
    this.employeePerformance.sort((a, b) => b.productivity - a.productivity);
    this.employeePerformance.forEach((emp, index) => {
      emp.rank = index + 1;
    });
  }

  // Generate mock business metrics
  private generateMockBusinessMetrics(): void {
    const metrics: Omit<BusinessMetric, 'id' | 'lastUpdated'>[] = [
      {
        name: 'Average Attendance Rate',
        value: 92.5,
        unit: '%',
        category: 'attendance',
        trend: 'up',
        change: 2.3,
        changePercentage: 2.5,
        target: 95,
        status: 'good'
      },
      {
        name: 'Punctuality Rate',
        value: 94.2,
        unit: '%',
        category: 'attendance',
        trend: 'stable',
        change: 0.1,
        changePercentage: 0.1,
        target: 95,
        status: 'good'
      },
      {
        name: 'Average Work Hours',
        value: 8.4,
        unit: 'hours',
        category: 'productivity',
        trend: 'up',
        change: 0.2,
        changePercentage: 2.4,
        target: 8.5,
        status: 'good'
      },
      {
        name: 'Productivity Score',
        value: 87.3,
        unit: 'points',
        category: 'productivity',
        trend: 'up',
        change: 3.1,
        changePercentage: 3.7,
        target: 90,
        status: 'good'
      },
      {
        name: 'Overtime Hours',
        value: 145.2,
        unit: 'hours',
        category: 'efficiency',
        trend: 'down',
        change: -12.5,
        changePercentage: -7.9,
        target: 100,
        status: 'warning'
      },
      {
        name: 'Absenteeism Rate',
        value: 7.5,
        unit: '%',
        category: 'attendance',
        trend: 'down',
        change: -1.2,
        changePercentage: -13.8,
        target: 5,
        status: 'warning'
      }
    ];

    metrics.forEach(metric => {
      this.businessMetrics.push({
        id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...metric,
        lastUpdated: new Date()
      });
    });
  }

  // Get attendance analytics
  getAttendanceAnalytics(options: {
    startDate?: Date;
    endDate?: Date;
    department?: string;
  } = {}): AttendanceAnalytics[] {
    let filteredData = [...this.attendanceData];

    if (options.startDate) {
      const startDateStr = options.startDate.toISOString().split('T')[0];
      filteredData = filteredData.filter(d => d.date >= startDateStr);
    }

    if (options.endDate) {
      const endDateStr = options.endDate.toISOString().split('T')[0];
      filteredData = filteredData.filter(d => d.date <= endDateStr);
    }

    return filteredData;
  }

  // Get department analytics
  getDepartmentAnalytics(): DepartmentAnalytics[] {
    return [...this.departmentData];
  }

  // Get employee performance
  getEmployeePerformance(options: {
    department?: string;
    limit?: number;
    sortBy?: 'productivity' | 'attendanceRate' | 'punctualityRate';
    sortOrder?: 'asc' | 'desc';
  } = {}): EmployeePerformance[] {
    let filteredData = [...this.employeePerformance];

    if (options.department) {
      filteredData = filteredData.filter(emp => emp.department === options.department);
    }

    if (options.sortBy) {
      filteredData.sort((a, b) => {
        const aValue = a[options.sortBy!] as number;
        const bValue = b[options.sortBy!] as number;
        return options.sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }

    if (options.limit) {
      filteredData = filteredData.slice(0, options.limit);
    }

    return filteredData;
  }

  // Analyze attendance patterns
  analyzeAttendancePatterns(): AttendancePattern[] {
    const patterns: AttendancePattern[] = [];

    // Analyze late arrival patterns
    const lateArrivals = this.attendanceData.reduce((sum, day) => sum + day.late, 0);
    const totalDays = this.attendanceData.length;
    const lateArrivalRate = (lateArrivals / totalDays) / this.attendanceData[0]?.totalEmployees || 0;

    if (lateArrivalRate > 0.1) {
      patterns.push({
        pattern: 'High Late Arrival Rate',
        frequency: lateArrivals,
        percentage: lateArrivalRate * 100,
        description: `Employees are frequently arriving late (${(lateArrivalRate * 100).toFixed(1)}% of the time)`,
        impact: lateArrivalRate > 0.15 ? 'high' : 'medium',
        recommendations: [
          'Review work schedules',
          'Consider flexible start times',
          'Implement attendance reminders'
        ]
      });
    }

    // Analyze absenteeism patterns
    const totalAbsent = this.attendanceData.reduce((sum, day) => sum + day.absent, 0);
    const absenteeismRate = (totalAbsent / totalDays) / this.attendanceData[0]?.totalEmployees || 0;

    if (absenteeismRate > 0.05) {
      patterns.push({
        pattern: 'Elevated Absenteeism',
        frequency: totalAbsent,
        percentage: absenteeismRate * 100,
        description: `Absenteeism rate is ${(absenteeismRate * 100).toFixed(1)}%`,
        impact: absenteeismRate > 0.1 ? 'high' : 'medium',
        recommendations: [
          'Conduct employee satisfaction surveys',
          'Review workload and stress levels',
          'Implement wellness programs'
        ]
      });
    }

    // Analyze overtime patterns
    const totalOvertime = this.attendanceData.reduce((sum, day) => sum + day.overtime, 0);
    const overtimeRate = (totalOvertime / totalDays) / this.attendanceData[0]?.totalEmployees || 0;

    if (overtimeRate > 0.2) {
      patterns.push({
        pattern: 'High Overtime Usage',
        frequency: totalOvertime,
        percentage: overtimeRate * 100,
        description: `Overtime rate is ${(overtimeRate * 100).toFixed(1)}%`,
        impact: overtimeRate > 0.3 ? 'high' : 'medium',
        recommendations: [
          'Review workload distribution',
          'Consider hiring additional staff',
          'Optimize work processes'
        ]
      });
    }

    return patterns;
  }

  // Analyze late arrival trends
  analyzeLateArrivalTrends(): LateArrivalTrend[] {
    const trends: LateArrivalTrend[] = [];
    
    // Group late arrivals by hour
    const hourlyData: { [hour: number]: number } = {};
    
    this.attendanceData.forEach(day => {
      // Simulate late arrival distribution
      for (let hour = 8; hour <= 11; hour++) {
        const count = Math.floor(day.late * Math.random());
        hourlyData[hour] = (hourlyData[hour] || 0) + count;
      }
    });

    const totalLate = Object.values(hourlyData).reduce((sum, count) => sum + count, 0);

    Object.entries(hourlyData).forEach(([hour, count]) => {
      const hourNum = parseInt(hour);
      trends.push({
        hour: hourNum,
        count,
        percentage: totalLate > 0 ? (count / totalLate) * 100 : 0,
        commonReasons: this.getCommonLateReasons(hourNum)
      });
    });

    return trends.sort((a, b) => b.count - a.count);
  }

  // Get common reasons for late arrivals based on time
  private getCommonLateReasons(hour: number): string[] {
    switch (hour) {
      case 8:
        return ['Traffic', 'Public transport delays', 'Oversleeping'];
      case 9:
        return ['School drop-off', 'Meetings', 'Appointments'];
      case 10:
        return ['Client meetings', 'Training sessions', 'Doctor appointments'];
      case 11:
        return ['Late start', 'Flexible schedule', 'Remote work transition'];
      default:
        return ['Various reasons'];
    }
  }

  // Analyze absenteeism patterns
  analyzeAbsenteeismPatterns(): AbsenteeismPattern[] {
    const patterns: AbsenteeismPattern[] = [];
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    daysOfWeek.forEach((day, index) => {
      const dayData = this.attendanceData.filter(d => {
        const date = new Date(d.date);
        return date.getDay() === (index + 1) % 7;
      });

      const totalAbsent = dayData.reduce((sum, day) => sum + day.absent, 0);
      const totalEmployees = dayData[0]?.totalEmployees || 150;
      const avgAbsenteeism = dayData.length > 0 ? (totalAbsent / dayData.length) / totalEmployees : 0;

      patterns.push({
        dayOfWeek: day,
        count: totalAbsent,
        percentage: avgAbsenteeism * 100,
        trend: Math.random() > 0.5 ? 'stable' : Math.random() > 0.5 ? 'increasing' : 'decreasing',
        seasonalFactor: 1 + (Math.random() - 0.5) * 0.2
      });
    });

    return patterns;
  }

  // Compare departments
  compareDepartments(): DepartmentComparison[] {
    return this.departmentData.map(dept => {
      const avgAttendance = this.departmentData.reduce((sum, d) => sum + d.attendanceRate, 0) / this.departmentData.length;
      const avgPunctuality = this.departmentData.reduce((sum, d) => sum + d.punctualityRate, 0) / this.departmentData.length;
      const avgProductivity = this.departmentData.reduce((sum, d) => sum + d.productivity, 0) / this.departmentData.length;
      const avgOvertime = this.departmentData.reduce((sum, d) => sum + d.overtimeHours, 0) / this.departmentData.length;

      const strengths: string[] = [];
      const weaknesses: string[] = [];

      if (dept.attendanceRate > avgAttendance) {
        strengths.push('High attendance rate');
      } else {
        weaknesses.push('Low attendance rate');
      }

      if (dept.punctualityRate > avgPunctuality) {
        strengths.push('Good punctuality');
      } else {
        weaknesses.push('Punctuality issues');
      }

      if (dept.productivity > avgProductivity) {
        strengths.push('High productivity');
      } else {
        weaknesses.push('Productivity needs improvement');
      }

      if (dept.overtimeHours < avgOvertime) {
        strengths.push('Efficient work hours');
      } else {
        weaknesses.push('High overtime usage');
      }

      return {
        department: dept.name,
        attendanceRate: dept.attendanceRate,
        punctualityRate: dept.punctualityRate,
        productivity: dept.productivity,
        overtimeHours: dept.overtimeHours,
        ranking: 0, // Will be calculated
        strengths,
        weaknesses
      };
    }).sort((a, b) => b.productivity - a.productivity).map((dept, index) => ({
      ...dept,
      ranking: index + 1
    }));
  }

  // Analyze seasonal variations
  analyzeSeasonalVariations(): SeasonalVariation[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const variations: SeasonalVariation[] = [];

    months.forEach((month, index) => {
      // Simulate seasonal data
      const baseAttendance = 90;
      const basePunctuality = 92;
      const baseProductivity = 85;

      // Add seasonal factors
      let seasonalFactor = 1;
      let factors: string[] = [];

      if (index >= 11 || index <= 1) { // Dec, Jan, Feb
        seasonalFactor = 0.95;
        factors = ['Holiday season', 'Weather conditions', 'Vacation period'];
      } else if (index >= 5 && index <= 7) { // Jun, Jul, Aug
        seasonalFactor = 0.98;
        factors = ['Summer vacation', 'Family activities', 'Travel season'];
      } else {
        seasonalFactor = 1.02;
        factors = ['Optimal working conditions', 'Regular business period'];
      }

      variations.push({
        month,
        attendanceRate: baseAttendance * seasonalFactor + (Math.random() - 0.5) * 5,
        punctualityRate: basePunctuality * seasonalFactor + (Math.random() - 0.5) * 5,
        productivity: baseProductivity * seasonalFactor + (Math.random() - 0.5) * 5,
        factors,
        prediction: baseAttendance * seasonalFactor
      });
    });

    return variations;
  }

  // Get business metrics
  getBusinessMetrics(category?: BusinessMetric['category']): BusinessMetric[] {
    if (category) {
      return this.businessMetrics.filter(m => m.category === category);
    }
    return [...this.businessMetrics];
  }

  // Update business metric
  updateBusinessMetric(id: string, updates: Partial<BusinessMetric>): boolean {
    const metric = this.businessMetrics.find(m => m.id === id);
    if (metric) {
      Object.assign(metric, updates, { lastUpdated: new Date() });
      return true;
    }
    return false;
  }

  // Generate analytics report
  generateReport(options: {
    type: AnalyticsReport['type'];
    dateRange: { start: Date; end: Date };
    includeCharts?: boolean;
  }): AnalyticsReport {
    const report: AnalyticsReport = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: `${options.type.charAt(0).toUpperCase() + options.type.slice(1)} Analytics Report`,
      description: `Comprehensive ${options.type} analysis from ${options.dateRange.start.toDateString()} to ${options.dateRange.end.toDateString()}`,
      type: options.type,
      dateRange: options.dateRange,
      generatedAt: new Date(),
      data: this.getReportData(options.type, options.dateRange),
      insights: this.generateInsights(options.type),
      recommendations: this.generateRecommendations(options.type),
      charts: options.includeCharts ? this.generateCharts(options.type) : []
    };

    this.reports.push(report);
    return report;
  }

  // Get report data based on type
  private getReportData(type: AnalyticsReport['type'], dateRange: { start: Date; end: Date }): any {
    switch (type) {
      case 'attendance':
        return {
          analytics: this.getAttendanceAnalytics({ startDate: dateRange.start, endDate: dateRange.end }),
          patterns: this.analyzeAttendancePatterns(),
          trends: this.analyzeLateArrivalTrends()
        };
      case 'performance':
        return {
          employees: this.getEmployeePerformance({ limit: 20 }),
          departments: this.getDepartmentAnalytics(),
          comparisons: this.compareDepartments()
        };
      case 'productivity':
        return {
          metrics: this.getBusinessMetrics('productivity'),
          seasonal: this.analyzeSeasonalVariations(),
          patterns: this.analyzeAttendancePatterns()
        };
      case 'comprehensive':
        return {
          attendance: this.getAttendanceAnalytics({ startDate: dateRange.start, endDate: dateRange.end }),
          performance: this.getEmployeePerformance(),
          departments: this.getDepartmentAnalytics(),
          metrics: this.getBusinessMetrics(),
          patterns: this.analyzeAttendancePatterns(),
          trends: this.analyzeLateArrivalTrends(),
          comparisons: this.compareDepartments(),
          seasonal: this.analyzeSeasonalVariations()
        };
      default:
        return {};
    }
  }

  // Generate insights based on report type
  private generateInsights(type: AnalyticsReport['type']): string[] {
    const insights: string[] = [];

    switch (type) {
      case 'attendance':
        insights.push(
          'Overall attendance rate has improved by 2.3% this month',
          'Monday shows the highest absenteeism rate',
          'Late arrivals peak between 8:00-9:00 AM'
        );
        break;
      case 'performance':
        insights.push(
          'IT department leads in productivity metrics',
          'Top 10% performers contribute 25% more than average',
          'New employees show 15% lower productivity in first month'
        );
        break;
      case 'productivity':
        insights.push(
          'Productivity correlates strongly with punctuality',
          'Overtime hours have decreased by 12% this quarter',
          'Seasonal variations affect productivity by up to 8%'
        );
        break;
      case 'comprehensive':
        insights.push(
          'Company-wide metrics show positive trends',
          'Department performance varies significantly',
          'Attendance patterns suggest need for flexible scheduling'
        );
        break;
    }

    return insights;
  }

  // Generate recommendations based on report type
  private generateRecommendations(type: AnalyticsReport['type']): string[] {
    const recommendations: string[] = [];

    switch (type) {
      case 'attendance':
        recommendations.push(
          'Implement flexible start times to reduce late arrivals',
          'Consider remote work options on high-absenteeism days',
          'Create attendance incentive programs'
        );
        break;
      case 'performance':
        recommendations.push(
          'Develop mentorship programs for underperforming employees',
          'Share best practices across departments',
          'Provide additional training for new hires'
        );
        break;
      case 'productivity':
        recommendations.push(
          'Optimize work processes to reduce overtime',
          'Implement productivity monitoring tools',
          'Consider workload redistribution'
        );
        break;
      case 'comprehensive':
        recommendations.push(
          'Develop comprehensive performance improvement plan',
          'Implement cross-departmental knowledge sharing',
          'Consider organizational restructuring for efficiency'
        );
        break;
    }

    return recommendations;
  }

  // Generate charts for report
  private generateCharts(type: AnalyticsReport['type']): ChartConfig[] {
    const charts: ChartConfig[] = [];

    switch (type) {
      case 'attendance':
        charts.push(
          {
            id: 'attendance_trend',
            type: 'line',
            title: 'Attendance Trend',
            data: this.getAttendanceAnalytics(),
            xAxis: 'date',
            yAxis: 'attendanceRate',
            colors: ['#10B981', '#3B82F6']
          },
          {
            id: 'attendance_distribution',
            type: 'pie',
            title: 'Attendance Distribution',
            data: this.getAttendanceAnalytics().slice(-7),
            xAxis: 'date',
            yAxis: 'attendanceRate',
            colors: ['#10B981', '#F59E0B', '#EF4444']
          }
        );
        break;
      case 'performance':
        charts.push(
          {
            id: 'department_performance',
            type: 'bar',
            title: 'Department Performance Comparison',
            data: this.getDepartmentAnalytics(),
            xAxis: 'name',
            yAxis: 'productivity',
            colors: ['#3B82F6', '#10B981', '#F59E0B']
          },
          {
            id: 'top_performers',
            type: 'area',
            title: 'Top Performers',
            data: this.getEmployeePerformance({ limit: 10 }),
            xAxis: 'name',
            yAxis: 'productivity',
            colors: ['#8B5CF6', '#EC4899']
          }
        );
        break;
      case 'productivity':
        charts.push(
          {
            id: 'productivity_metrics',
            type: 'scatter',
            title: 'Productivity Metrics',
            data: this.getBusinessMetrics('productivity'),
            xAxis: 'name',
            yAxis: 'value',
            colors: ['#10B981', '#3B82F6', '#F59E0B']
          },
          {
            id: 'seasonal_productivity',
            type: 'line',
            title: 'Seasonal Productivity Variations',
            data: this.analyzeSeasonalVariations(),
            xAxis: 'month',
            yAxis: 'productivity',
            colors: ['#8B5CF6', '#EC4899']
          }
        );
        break;
      case 'comprehensive':
        charts.push(
          {
            id: 'overview_dashboard',
            type: 'heatmap',
            title: 'Comprehensive Overview',
            data: this.getBusinessMetrics(),
            xAxis: 'name',
            yAxis: 'value',
            colors: ['#10B981', '#F59E0B', '#EF4444']
          }
        );
        break;
    }

    return charts;
  }

  // Get all reports
  getReports(options: {
    type?: AnalyticsReport['type'];
    limit?: number;
  } = {}): AnalyticsReport[] {
    let filteredReports = [...this.reports];

    if (options.type) {
      filteredReports = filteredReports.filter(r => r.type === options.type);
    }

    // Sort by generation date (newest first)
    filteredReports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    if (options.limit) {
      filteredReports = filteredReports.slice(0, options.limit);
    }

    return filteredReports;
  }

  // Get specific report
  getReport(id: string): AnalyticsReport | null {
    return this.reports.find(r => r.id === id) || null;
  }

  // Delete report
  deleteReport(id: string): boolean {
    const index = this.reports.findIndex(r => r.id === id);
    if (index !== -1) {
      this.reports.splice(index, 1);
      return true;
    }
    return false;
  }

  // Export data
  exportData(format: 'json' | 'csv' | 'excel' = 'json'): string {
    const data = {
      attendance: this.getAttendanceAnalytics(),
      departments: this.getDepartmentAnalytics(),
      employees: this.getEmployeePerformance(),
      metrics: this.getBusinessMetrics(),
      reports: this.getReports()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }

    // For CSV and Excel, you would need additional libraries
    // For now, return JSON as fallback
    return JSON.stringify(data, null, 2);
  }

  // Refresh data (simulate data refresh)
  async refreshData(): Promise<void> {
    // In a real implementation, this would fetch fresh data from the database
    // For now, just regenerate mock data
    this.attendanceData = [];
    this.departmentData = [];
    this.employeePerformance = [];
    this.businessMetrics = [];
    
    this.initializeMockData();
  }
}

// Singleton instance
export const businessIntelligence = new BusinessIntelligence();

// Export types and functions
export type { BusinessIntelligence };
export { BusinessIntelligence as BusinessIntelligenceClass };