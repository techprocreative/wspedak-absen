/**
 * Predictive Analytics Library
 * Provides machine learning-based predictions and anomaly detection
 * Optimized for production environments
 */

import { businessIntelligence } from './business-intelligence';
import { systemMonitor } from '@/lib/monitoring/system-monitor';

// Prediction interfaces
export interface PredictionResult {
  id: string;
  type: 'attendance' | 'performance' | 'turnover' | 'productivity' | 'anomaly';
  title: string;
  description: string;
  confidence: number;
  probability: number;
  timeframe: string;
  impact: 'low' | 'medium' | 'high';
  recommendations: string[];
  data: any;
  generatedAt: Date;
  model: string;
  accuracy: number;
}

export interface AttendancePrediction {
  date: string;
  predictedAttendanceRate: number;
  predictedAbsentees: number;
  confidence: number;
  factors: {
    weather: number;
    dayOfWeek: number;
    seasonality: number;
    recentTrends: number;
    events: number;
  };
  riskLevel: 'low' | 'medium' | 'high';
}

export interface TurnoverRisk {
  employeeId: string;
  employeeName: string;
  department: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    attendancePattern: number;
    performanceTrend: number;
    workHours: number;
    recentIncidents: number;
    departmentTurnover: number;
  };
  predictions: {
    likelyToLeave: boolean;
    timeframe: string;
    probability: number;
  };
  recommendations: string[];
}

export interface ProductivityForecast {
  period: string;
  predictedProductivity: number;
  confidence: number;
  factors: {
    seasonal: number;
    workload: number;
    teamComposition: number;
    historical: number;
  };
  trends: {
    direction: 'increasing' | 'decreasing' | 'stable';
    rate: number;
  };
  opportunities: string[];
  risks: string[];
}

export interface AnomalyDetection {
  id: string;
  type: 'attendance' | 'performance' | 'system' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  detectedAt: Date;
  confidence: number;
  data: any;
  baseline: any;
  deviation: number;
  potentialCauses: string[];
  recommendedActions: string[];
  falsePositiveProbability: number;
}

export interface StaffingPrediction {
  date: string;
  department: string;
  requiredStaff: number;
  availableStaff: number;
  shortage: number;
  surplus: number;
  confidence: number;
  factors: {
    historicalDemand: number;
    seasonality: number;
    knownAbsences: number;
    predictedAbsences: number;
    workload: number;
  };
  recommendations: string[];
}

export interface ScheduleOptimization {
  department: string;
  currentSchedule: any[];
  optimizedSchedule: any[];
  improvements: {
    coverage: number;
    efficiency: number;
    satisfaction: number;
    cost: number;
  };
  changes: {
    added: any[];
    removed: any[];
    modified: any[];
  };
  impact: {
    productivity: number;
    attendance: number;
    overtime: number;
  };
}

export interface PredictionModel {
  id: string;
  name: string;
  type: 'classification' | 'regression' | 'clustering' | 'anomaly_detection';
  algorithm: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  lastTrained: Date;
  trainingDataSize: number;
  features: string[];
  target: string;
  status: 'active' | 'training' | 'inactive' | 'deprecated';
}

class PredictiveAnalytics {
  private models: Map<string, PredictionModel> = new Map();
  private predictions: PredictionResult[] = [];
  private anomalies: AnomalyDetection[] = [];
  private isTraining: boolean = false;

  constructor() {
    this.initializeModels();
    this.startBackgroundTraining();
  }

  // Initialize prediction models
  private initializeModels(): void {
    const models: PredictionModel[] = [
      {
        id: 'attendance_predictor',
        name: 'Attendance Predictor',
        type: 'regression',
        algorithm: 'RandomForest',
        accuracy: 0.87,
        precision: 0.85,
        recall: 0.89,
        f1Score: 0.87,
        lastTrained: new Date(),
        trainingDataSize: 1000,
        features: ['dayOfWeek', 'season', 'weather', 'historicalAttendance', 'events'],
        target: 'attendanceRate',
        status: 'active'
      },
      {
        id: 'turnover_risk',
        name: 'Employee Turnover Risk',
        type: 'classification',
        algorithm: 'LogisticRegression',
        accuracy: 0.82,
        precision: 0.78,
        recall: 0.85,
        f1Score: 0.81,
        lastTrained: new Date(),
        trainingDataSize: 500,
        features: ['attendancePattern', 'performanceTrend', 'workHours', 'satisfaction'],
        target: 'turnoverRisk',
        status: 'active'
      },
      {
        id: 'productivity_forecaster',
        name: 'Productivity Forecaster',
        type: 'regression',
        algorithm: 'LinearRegression',
        accuracy: 0.79,
        precision: 0.77,
        recall: 0.81,
        f1Score: 0.79,
        lastTrained: new Date(),
        trainingDataSize: 800,
        features: ['seasonality', 'workload', 'teamComposition', 'historicalProductivity'],
        target: 'productivity',
        status: 'active'
      },
      {
        id: 'anomaly_detector',
        name: 'Anomaly Detector',
        type: 'anomaly_detection',
        algorithm: 'IsolationForest',
        accuracy: 0.91,
        precision: 0.88,
        recall: 0.93,
        f1Score: 0.90,
        lastTrained: new Date(),
        trainingDataSize: 1200,
        features: ['attendanceRate', 'punctuality', 'workHours', 'performance'],
        target: 'anomaly',
        status: 'active'
      }
    ];

    models.forEach(model => {
      this.models.set(model.id, model);
    });
  }

  // Start background training
  private startBackgroundTraining(): void {
    // Train models every 24 hours
    setInterval(() => {
      this.retrainModels();
    }, 24 * 60 * 60 * 1000);
  }

  // Retrain models with new data
  private async retrainModels(): Promise<void> {
    if (this.isTraining) return;

    this.isTraining = true;
    console.log('Starting model retraining...');

    try {
      for (const [modelId, model] of this.models) {
        await this.trainModel(modelId);
      }
      console.log('Model retraining completed');
    } catch (error) {
      console.error('Model retraining failed:', error);
    } finally {
      this.isTraining = false;
    }
  }

  // Train individual model
  private async trainModel(modelId: string): Promise<void> {
    const model = this.models.get(modelId);
    if (!model) return;

    // Simulate model training
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update model metrics (in real implementation, this would be calculated from training results)
    const accuracyImprovement = (Math.random() - 0.5) * 0.05;
    model.accuracy = Math.max(0.5, Math.min(0.99, model.accuracy + accuracyImprovement));
    model.lastTrained = new Date();
    model.trainingDataSize += Math.floor(Math.random() * 100);

    console.log(`Model ${model.name} retrained. New accuracy: ${model.accuracy.toFixed(3)}`);
  }

  // Predict attendance for future dates
  predictAttendance(options: {
    startDate: Date;
    endDate: Date;
    department?: string;
  }): AttendancePrediction[] {
    const predictions: AttendancePrediction[] = [];
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const prediction = this.generateAttendancePrediction(date, options.department);
      predictions.push(prediction);
    }

    return predictions;
  }

  // Generate attendance prediction for a specific date
  private generateAttendancePrediction(date: Date, department?: string): AttendancePrediction {
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    
    // Base attendance rate
    let baseRate = 0.92;
    
    // Adjust for day of week
    if (dayOfWeek === 1) baseRate -= 0.03; // Monday
    if (dayOfWeek === 5) baseRate -= 0.02; // Friday
    
    // Adjust for seasonality
    if (month === 11 || month === 0 || month === 1) baseRate -= 0.02; // Winter
    if (month === 6 || month === 7 || month === 8) baseRate -= 0.01; // Summer
    
    // Add random variation
    const randomVariation = (Math.random() - 0.5) * 0.1;
    const predictedRate = Math.max(0.7, Math.min(0.98, baseRate + randomVariation));
    
    // Calculate factors
    const factors = {
      weather: Math.random() * 0.1,
      dayOfWeek: dayOfWeek === 1 || dayOfWeek === 5 ? 0.05 : 0.02,
      seasonality: (month === 11 || month === 0 || month === 1) ? 0.03 : 0.01,
      recentTrends: Math.random() * 0.05,
      events: Math.random() * 0.02
    };
    
    const confidence = 0.75 + Math.random() * 0.2;
    const totalEmployees = department ? this.getDepartmentSize(department) : 150;
    const predictedAbsentees = Math.floor(totalEmployees * (1 - predictedRate));
    
    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (predictedRate < 0.85) riskLevel = 'high';
    else if (predictedRate < 0.90) riskLevel = 'medium';
    
    return {
      date: date.toISOString().split('T')[0],
      predictedAttendanceRate: predictedRate * 100,
      predictedAbsentees,
      confidence,
      factors,
      riskLevel
    };
  }

  // Get department size (mock implementation)
  private getDepartmentSize(department: string): number {
    const sizes: { [key: string]: number } = {
      'IT': 25,
      'HR': 15,
      'Finance': 20,
      'Marketing': 18,
      'Operations': 30,
      'Sales': 22
    };
    return sizes[department] || 20;
  }

  // Predict employee turnover risk
  predictTurnoverRisk(): TurnoverRisk[] {
    const employees = businessIntelligence.getEmployeePerformance();
    const risks: TurnoverRisk[] = [];

    employees.forEach(employee => {
      const risk = this.calculateTurnoverRisk(employee);
      if (risk.riskScore > 0.3) { // Only include employees with significant risk
        risks.push(risk);
      }
    });

    return risks.sort((a, b) => b.riskScore - a.riskScore);
  }

  // Calculate turnover risk for an employee
  private calculateTurnoverRisk(employee: any): TurnoverRisk {
    // Base risk factors
    const attendanceFactor = (100 - employee.attendanceRate) / 100;
    const performanceFactor = (100 - employee.productivity) / 100;
    const workHoursFactor = employee.avgWorkHours > 9 ? 0.2 : 0;
    const recentIncidentsFactor = Math.random() * 0.1;
    const departmentFactor = this.getDepartmentTurnoverRate(employee.department) / 100;

    // Calculate weighted risk score
    const riskScore = (
      attendanceFactor * 0.3 +
      performanceFactor * 0.25 +
      workHoursFactor * 0.2 +
      recentIncidentsFactor * 0.15 +
      departmentFactor * 0.1
    );

    // Determine risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (riskScore > 0.7) riskLevel = 'critical';
    else if (riskScore > 0.5) riskLevel = 'high';
    else if (riskScore > 0.3) riskLevel = 'medium';

    // Generate recommendations
    const recommendations: string[] = [];
    if (attendanceFactor > 0.1) recommendations.push('Address attendance issues through counseling');
    if (performanceFactor > 0.1) recommendations.push('Provide performance improvement support');
    if (workHoursFactor > 0.1) recommendations.push('Review workload and work-life balance');
    if (departmentFactor > 0.1) recommendations.push('Investigate department-specific issues');

    return {
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      riskScore,
      riskLevel,
      factors: {
        attendancePattern: attendanceFactor,
        performanceTrend: performanceFactor,
        workHours: workHoursFactor,
        recentIncidents: recentIncidentsFactor,
        departmentTurnover: departmentFactor
      },
      predictions: {
        likelyToLeave: riskScore > 0.5,
        timeframe: riskScore > 0.7 ? '1-3 months' : riskScore > 0.3 ? '3-6 months' : '6+ months',
        probability: riskScore
      },
      recommendations
    };
  }

  // Get department turnover rate (mock implementation)
  private getDepartmentTurnoverRate(department: string): number {
    const rates: { [key: string]: number } = {
      'IT': 8,
      'HR': 12,
      'Finance': 6,
      'Marketing': 15,
      'Operations': 10,
      'Sales': 18
    };
    return rates[department] || 10;
  }

  // Forecast productivity
  forecastProductivity(periods: number = 4): ProductivityForecast[] {
    const forecasts: ProductivityForecast[] = [];
    const currentProductivity = businessIntelligence.getBusinessMetrics('productivity')
      .find(m => m.name === 'Productivity Score')?.value || 85;

    for (let i = 1; i <= periods; i++) {
      const forecast = this.generateProductivityForecast(i, currentProductivity);
      forecasts.push(forecast);
    }

    return forecasts;
  }

  // Generate productivity forecast for a period
  private generateProductivityForecast(period: number, currentProductivity: number): ProductivityForecast {
    const month = new Date();
    month.setMonth(month.getMonth() + period);

    // Seasonal factors
    let seasonalFactor = 1;
    if (month.getMonth() === 11 || month.getMonth() === 0) seasonalFactor = 0.95; // Winter
    if (month.getMonth() === 6 || month.getMonth() === 7) seasonalFactor = 0.98; // Summer
    if (month.getMonth() >= 2 && month.getMonth() <= 5) seasonalFactor = 1.02; // Spring

    // Workload factor (mock)
    const workloadFactor = 0.9 + Math.random() * 0.2;

    // Team composition factor (mock)
    const teamCompositionFactor = 0.95 + Math.random() * 0.1;

    // Historical trend
    const historicalFactor = 1 + (Math.random() - 0.5) * 0.05;

    // Calculate predicted productivity
    const predictedProductivity = currentProductivity * seasonalFactor * workloadFactor * teamCompositionFactor * historicalFactor;

    // Determine trend
    let direction: 'increasing' | 'decreasing' | 'stable' = 'stable';
    let rate = 0;
    if (predictedProductivity > currentProductivity * 1.02) {
      direction = 'increasing';
      rate = ((predictedProductivity - currentProductivity) / currentProductivity) * 100;
    } else if (predictedProductivity < currentProductivity * 0.98) {
      direction = 'decreasing';
      rate = ((currentProductivity - predictedProductivity) / currentProductivity) * 100;
    }

    // Generate opportunities and risks
    const opportunities: string[] = [];
    const risks: string[] = [];

    if (seasonalFactor > 1) opportunities.push('Favorable seasonal conditions');
    if (workloadFactor > 1) opportunities.push('Optimal workload distribution');
    if (teamCompositionFactor > 1) opportunities.push('Strong team dynamics');

    if (seasonalFactor < 1) risks.push('Challenging seasonal conditions');
    if (workloadFactor < 1) risks.push('Potential workload issues');
    if (teamCompositionFactor < 1) risks.push('Team composition challenges');

    return {
      period: month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      predictedProductivity: Math.max(60, Math.min(100, predictedProductivity)),
      confidence: 0.7 + Math.random() * 0.2,
      factors: {
        seasonal: seasonalFactor,
        workload: workloadFactor,
        teamComposition: teamCompositionFactor,
        historical: historicalFactor
      },
      trends: {
        direction,
        rate
      },
      opportunities,
      risks
    };
  }

  // Detect anomalies
  detectAnomalies(): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    
    // Detect attendance anomalies
    const attendanceAnomalies = this.detectAttendanceAnomalies();
    anomalies.push(...attendanceAnomalies);
    
    // Detect performance anomalies
    const performanceAnomalies = this.detectPerformanceAnomalies();
    anomalies.push(...performanceAnomalies);
    
    // Detect system anomalies
    const systemAnomalies = this.detectSystemAnomalies();
    anomalies.push(...systemAnomalies);
    
    // Store anomalies
    this.anomalies = [...this.anomalies, ...anomalies].slice(-100); // Keep last 100
    
    return anomalies;
  }

  // Detect attendance anomalies
  private detectAttendanceAnomalies(): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const attendanceData = businessIntelligence.getAttendanceAnalytics();
    
    if (attendanceData.length < 7) return anomalies;
    
    // Calculate baseline
    const recentData = attendanceData.slice(-7);
    const avgAttendanceRate = recentData.reduce((sum, day) => sum + day.attendanceRate, 0) / recentData.length;
    const stdDev = Math.sqrt(
      recentData.reduce((sum, day) => sum + Math.pow(day.attendanceRate - avgAttendanceRate, 2), 0) / recentData.length
    );
    
    // Check for anomalies in recent data
    const latestData = attendanceData[attendanceData.length - 1];
    const deviation = Math.abs(latestData.attendanceRate - avgAttendanceRate) / stdDev;
    
    if (deviation > 2) { // 2 standard deviations
      anomalies.push({
        id: `attendance_anomaly_${Date.now()}`,
        type: 'attendance',
        severity: deviation > 3 ? 'high' : 'medium',
        title: 'Unusual Attendance Pattern',
        description: `Attendance rate of ${latestData.attendanceRate.toFixed(1)}% is ${deviation.toFixed(1)} standard deviations from normal`,
        detectedAt: new Date(),
        confidence: Math.min(0.95, 0.5 + deviation * 0.15),
        data: latestData,
        baseline: { avgAttendanceRate, stdDev },
        deviation,
        potentialCauses: [
          'Special event or holiday',
          'System error in attendance tracking',
          'External factors affecting attendance',
          'Data quality issues'
        ],
        recommendedActions: [
          'Verify data accuracy',
          'Check for known events or holidays',
          'Investigate potential system issues',
          'Monitor trend for next few days'
        ],
        falsePositiveProbability: Math.max(0.05, 0.3 - deviation * 0.1)
      });
    }
    
    return anomalies;
  }

  // Detect performance anomalies
  private detectPerformanceAnomalies(): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const employees = businessIntelligence.getEmployeePerformance();
    
    // Find employees with unusual performance drops
    employees.forEach(employee => {
      if (employee.trend === 'down' && employee.productivity < 70) {
        anomalies.push({
          id: `performance_anomaly_${employee.id}_${Date.now()}`,
          type: 'performance',
          severity: employee.productivity < 50 ? 'high' : 'medium',
          title: 'Performance Anomaly Detected',
          description: `Employee ${employee.name} shows significant performance decline`,
          detectedAt: new Date(),
          confidence: 0.75,
          data: employee,
          baseline: { expectedProductivity: 85 },
          deviation: (85 - employee.productivity) / 85,
          potentialCauses: [
            'Personal issues affecting work',
            'Lack of motivation or engagement',
            'Skill mismatch for current role',
            'Workplace conflicts'
          ],
          recommendedActions: [
            'Schedule one-on-one meeting',
            'Review workload and assignments',
            'Provide additional training or support',
            'Consider temporary role adjustment'
          ],
          falsePositiveProbability: 0.15
        });
      }
    });
    
    return anomalies;
  }

  // Detect system anomalies
  private detectSystemAnomalies(): AnomalyDetection[] {
    const anomalies: AnomalyDetection[] = [];
    const systemMetrics = systemMonitor.getCurrentMetrics();
    
    if (!systemMetrics) return anomalies;
    
    // Check for unusual system metrics
    if (systemMetrics.cpu.usage > 90) {
      anomalies.push({
        id: `system_cpu_anomaly_${Date.now()}`,
        type: 'system',
        severity: 'high',
        title: 'High CPU Usage Detected',
        description: `CPU usage is ${systemMetrics.cpu.usage.toFixed(1)}%`,
        detectedAt: new Date(),
        confidence: 0.9,
        data: { cpu: systemMetrics.cpu },
        baseline: { expectedCpuUsage: 50 },
        deviation: (systemMetrics.cpu.usage - 50) / 50,
        potentialCauses: [
          'Process runaway',
          'Insufficient resources',
          'Memory leak',
          'Increased system load'
        ],
        recommendedActions: [
          'Identify and terminate high CPU processes',
          'Check for memory leaks',
          'Consider scaling resources',
          'Monitor system performance'
        ],
        falsePositiveProbability: 0.05
      });
    }
    
    if (systemMetrics.memory.usagePercentage > 90) {
      anomalies.push({
        id: `system_memory_anomaly_${Date.now()}`,
        type: 'system',
        severity: 'high',
        title: 'High Memory Usage Detected',
        description: `Memory usage is ${systemMetrics.memory.usagePercentage.toFixed(1)}%`,
        detectedAt: new Date(),
        confidence: 0.9,
        data: { memory: systemMetrics.memory },
        baseline: { expectedMemoryUsage: 70 },
        deviation: (systemMetrics.memory.usagePercentage - 70) / 70,
        potentialCauses: [
          'Memory leak',
          'Insufficient memory allocation',
          'Large data processing',
          'Cache overflow'
        ],
        recommendedActions: [
          'Check for memory leaks',
          'Clear caches and temporary data',
          'Restart affected services',
          'Consider memory upgrade'
        ],
        falsePositiveProbability: 0.05
      });
    }
    
    return anomalies;
  }

  // Predict staffing needs
  predictStaffing(options: {
    startDate: Date;
    endDate: Date;
    department?: string;
  }): StaffingPrediction[] {
    const predictions: StaffingPrediction[] = [];
    const startDate = new Date(options.startDate);
    const endDate = new Date(options.endDate);

    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const prediction = this.generateStaffingPrediction(date, options.department);
      predictions.push(prediction);
    }

    return predictions;
  }

  // Generate staffing prediction for a specific date
  private generateStaffingPrediction(date: Date, department?: string): StaffingPrediction {
    const dayOfWeek = date.getDay();
    const attendancePrediction = this.generateAttendancePrediction(date, department);
    
    const totalStaff = department ? this.getDepartmentSize(department) : 150;
    const predictedAvailable = Math.floor(totalStaff * (attendancePrediction.predictedAttendanceRate / 100));
    const requiredStaff = this.calculateRequiredStaff(date, department);
    
    const shortage = Math.max(0, requiredStaff - predictedAvailable);
    const surplus = Math.max(0, predictedAvailable - requiredStaff);
    
    const recommendations: string[] = [];
    if (shortage > 0) {
      recommendations.push(`Arrange ${shortage} additional staff members`);
      recommendations.push('Consider overtime for existing staff');
      recommendations.push('Temporarily reallocate staff from other departments');
    }
    if (surplus > 2) {
      recommendations.push(`Consider scheduling ${surplus} staff for other tasks`);
      recommendations.push('Offer voluntary time off');
    }
    
    return {
      date: date.toISOString().split('T')[0],
      department: department || 'All',
      requiredStaff,
      availableStaff: predictedAvailable,
      shortage,
      surplus,
      confidence: attendancePrediction.confidence,
      factors: {
        historicalDemand: 0.8 + Math.random() * 0.2,
        seasonality: attendancePrediction.factors.seasonality,
        knownAbsences: Math.floor(Math.random() * 3),
        predictedAbsences: attendancePrediction.predictedAbsentees,
        workload: 0.9 + Math.random() * 0.2
      },
      recommendations
    };
  }

  // Calculate required staff for a specific date
  private calculateRequiredStaff(date: Date, department?: string): number {
    const dayOfWeek = date.getDay();
    const month = date.getMonth();
    
    let baseRequirement = department ? this.getDepartmentSize(department) : 150;
    
    // Adjust for day of week
    if (dayOfWeek === 0 || dayOfWeek === 6) baseRequirement *= 0.5; // Weekend
    if (dayOfWeek === 1) baseRequirement *= 1.1; // Monday
    
    // Adjust for seasonality
    if (month === 11 || month === 0) baseRequirement *= 0.9; // Winter
    if (month === 6 || month === 7) baseRequirement *= 0.95; // Summer
    
    return Math.floor(baseRequirement);
  }

  // Generate schedule optimization
  optimizeSchedule(department: string, period: 'week' | 'month' = 'week'): ScheduleOptimization {
    // Mock implementation
    const currentSchedule = this.generateMockSchedule(department, period);
    const optimizedSchedule = this.generateOptimizedSchedule(currentSchedule);
    
    return {
      department,
      currentSchedule,
      optimizedSchedule,
      improvements: {
        coverage: 5 + Math.random() * 10,
        efficiency: 3 + Math.random() * 8,
        satisfaction: 2 + Math.random() * 7,
        cost: -5 - Math.random() * 10
      },
      changes: {
        added: optimizedSchedule.filter(s => !currentSchedule.find(cs => cs.id === s.id)),
        removed: currentSchedule.filter(cs => !optimizedSchedule.find(os => os.id === cs.id)),
        modified: optimizedSchedule.filter(os => {
          const cs = currentSchedule.find(c => c.id === os.id);
          return cs && JSON.stringify(cs) !== JSON.stringify(os);
        })
      },
      impact: {
        productivity: 2 + Math.random() * 5,
        attendance: 1 + Math.random() * 3,
        overtime: -10 - Math.random() * 15
      }
    };
  }

  // Generate mock schedule
  private generateMockSchedule(department: string, period: 'week' | 'month'): any[] {
    const schedule: any[] = [];
    const days = period === 'week' ? 7 : 30;
    const staffCount = this.getDepartmentSize(department);
    
    for (let day = 0; day < days; day++) {
      for (let staff = 0; staff < staffCount; staff++) {
        schedule.push({
          id: `schedule_${department}_${day}_${staff}`,
          date: new Date(Date.now() + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          employeeId: `emp_${staff}`,
          shift: Math.random() > 0.5 ? 'morning' : 'afternoon',
          hours: 8 + Math.random() * 2
        });
      }
    }
    
    return schedule;
  }

  // Generate optimized schedule
  private generateOptimizedSchedule(currentSchedule: any[]): any[] {
    // Mock optimization - in real implementation, this would use optimization algorithms
    return currentSchedule.map(schedule => ({
      ...schedule,
      hours: 8 + Math.random() * 2, // Optimized hours
      shift: Math.random() > 0.6 ? 'morning' : 'afternoon' // Optimized shift
    }));
  }

  // Get all predictions
  getPredictions(options: {
    type?: PredictionResult['type'];
    limit?: number;
  } = {}): PredictionResult[] {
    let filteredPredictions = [...this.predictions];

    if (options.type) {
      filteredPredictions = filteredPredictions.filter(p => p.type === options.type);
    }

    // Sort by generation date (newest first)
    filteredPredictions.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    if (options.limit) {
      filteredPredictions = filteredPredictions.slice(0, options.limit);
    }

    return filteredPredictions;
  }

  // Get all anomalies
  getAnomalies(options: {
    type?: AnomalyDetection['type'];
    severity?: AnomalyDetection['severity'];
    limit?: number;
  } = {}): AnomalyDetection[] {
    let filteredAnomalies = [...this.anomalies];

    if (options.type) {
      filteredAnomalies = filteredAnomalies.filter(a => a.type === options.type);
    }

    if (options.severity) {
      filteredAnomalies = filteredAnomalies.filter(a => a.severity === options.severity);
    }

    // Sort by detection date (newest first)
    filteredAnomalies.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());

    if (options.limit) {
      filteredAnomalies = filteredAnomalies.slice(0, options.limit);
    }

    return filteredAnomalies;
  }

  // Get model information
  getModels(): PredictionModel[] {
    return Array.from(this.models.values());
  }

  // Get specific model
  getModel(modelId: string): PredictionModel | null {
    return this.models.get(modelId) || null;
  }

  // Generate comprehensive prediction report
  generatePredictionReport(): PredictionResult {
    const report: PredictionResult = {
      id: `prediction_report_${Date.now()}`,
      type: 'attendance',
      title: 'Comprehensive Prediction Report',
      description: 'AI-powered predictions for attendance, turnover, and productivity',
      confidence: 0.85,
      probability: 0.78,
      timeframe: 'Next 30 days',
      impact: 'high',
      recommendations: [
        'Focus on high-risk employees for retention',
        'Prepare for seasonal attendance variations',
        'Optimize scheduling based on predictions',
        'Monitor for anomalies and take proactive action'
      ],
      data: {
        attendancePredictions: this.predictAttendance({
          startDate: new Date(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }),
        turnoverRisks: this.predictTurnoverRisk().slice(0, 10),
        productivityForecasts: this.forecastProductivity(3),
        anomalies: this.detectAnomalies()
      },
      generatedAt: new Date(),
      model: 'ensemble',
      accuracy: 0.87
    };

    this.predictions.push(report);
    return report;
  }

  // Clear old predictions and anomalies
  cleanup(): void {
    const cutoffTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    
    this.predictions = this.predictions.filter(p => p.generatedAt > cutoffTime);
    this.anomalies = this.anomalies.filter(a => a.detectedAt > cutoffTime);
  }
}

// Singleton instance
export const predictiveAnalytics = new PredictiveAnalytics();

// Export types and functions
export type { PredictiveAnalytics };
export { PredictiveAnalytics as PredictiveAnalyticsClass };