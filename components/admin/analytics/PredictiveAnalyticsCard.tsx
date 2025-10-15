/**
 * Predictive Analytics Card Component
 * Displays predictions and forecasts
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger'
import {
  RefreshCw, 
  TrendingUp, 
  Users, 
  Calendar,
  AlertTriangle,
  Target,
  Activity
} from 'lucide-react';

interface PredictionData {
  date: string;
  predictedValue?: number;
  predictedAttendanceRate?: number;
  predictedProductivity?: number;
  period?: string;
  confidence: number;
}

interface TurnoverRisk {
  employeeId: string;
  employeeName: string;
  department: string;
  riskScore: number;
  factors: string[];
}

interface PredictiveAnalyticsCardProps {
  refreshInterval?: number;
  department?: string;
}

export function PredictiveAnalyticsCard({ 
  refreshInterval = 300000, // 5 minutes
  department: initialDepartment = 'all'
}: PredictiveAnalyticsCardProps) {
  const [attendancePredictions, setAttendancePredictions] = useState<PredictionData[]>([]);
  const [turnoverRisks, setTurnoverRisks] = useState<TurnoverRisk[]>([]);
  const [productivityForecasts, setProductivityForecasts] = useState<PredictionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState(initialDepartment);
  const [predictionType, setPredictionType] = useState<'attendance' | 'turnover' | 'productivity'>('attendance');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams();
      if (department && department !== 'all') {
        params.append('department', department);
      }
      
      // Fetch attendance predictions
      const attendanceResponse = await fetch(`/api/admin/analytics/predictive?type=attendance&${params}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (attendanceResponse.ok) {
        const attendanceResult = await attendanceResponse.json();
        if (attendanceResult.success) {
          logger.info('Attendance predictions data', { value: attendanceResult.data.predictions });
          setAttendancePredictions(attendanceResult.data.predictions);
        }
      }
      
      // Fetch turnover risks
      const turnoverResponse = await fetch(`/api/admin/analytics/predictive?type=turnover&${params}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (turnoverResponse.ok) {
        const turnoverResult = await turnoverResponse.json();
        if (turnoverResult.success) {
          setTurnoverRisks(turnoverResult.data.risks);
        }
      }
      
      // Fetch productivity forecasts
      const productivityResponse = await fetch(`/api/admin/analytics/predictive?type=productivity&${params}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      if (productivityResponse.ok) {
        const productivityResult = await productivityResponse.json();
        if (productivityResult.success) {
          logger.info('Productivity forecasts data', { value: productivityResult.data.forecasts });
          setProductivityForecasts(productivityResult.data.forecasts);
        }
      }
      
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchPredictions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, department]);

  const getRiskColor = (riskScore: number) => {
    if (riskScore >= 0.8) return 'destructive';
    if (riskScore >= 0.6) return 'secondary';
    if (riskScore >= 0.4) return 'outline';
    return 'outline';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore >= 0.8) return 'High';
    if (riskScore >= 0.6) return 'Medium';
    if (riskScore >= 0.4) return 'Low';
    return 'Very Low';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-500';
    if (confidence >= 0.6) return 'text-yellow-500';
    return 'text-red-500';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getAverageAttendancePrediction = () => {
    if (attendancePredictions.length === 0) return 0;
    const sum = attendancePredictions.reduce((acc, pred) => acc + (pred.predictedValue || pred.predictedAttendanceRate || 0), 0);
    return (sum / attendancePredictions.length).toFixed(1);
  };

  const getAverageProductivityForecast = () => {
    if (productivityForecasts.length === 0) return 0;
    const sum = productivityForecasts.reduce((acc, pred) => acc + (pred.predictedValue || pred.predictedProductivity || 0), 0);
    return (sum / productivityForecasts.length).toFixed(1);
  };

  const getHighRiskEmployees = () => {
    return turnoverRisks.filter(risk => risk.riskScore >= 0.7).length;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Predictive Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={fetchPredictions}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Predictions and forecasts based on historical data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label htmlFor="department" className="text-sm font-medium">
              Department:
            </label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="engineering">Engineering</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="hr">HR</SelectItem>
                <SelectItem value="marketing">Marketing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Avg. Attendance:</span>
              <span className="text-sm font-medium">{getAverageAttendancePrediction()}%</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">Avg. Productivity:</span>
              <span className="text-sm font-medium">{getAverageProductivityForecast()}%</span>
            </div>
            
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">High Risk:</span>
              <span className="text-sm font-medium">{getHighRiskEmployees()}</span>
            </div>
          </div>
        </div>
        
        {loading && attendancePredictions.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">
            <p>Error loading prediction data: {error}</p>
            <Button onClick={fetchPredictions} className="mt-2" variant="outline">
              Retry
            </Button>
          </div>
        ) : (
          <Tabs value={predictionType} onValueChange={(value: any) => setPredictionType(value)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attendance" className="flex items-center gap-1">
                <Users className="h-4 w-4" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="turnover" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Turnover
              </TabsTrigger>
              <TabsTrigger value="productivity" className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                Productivity
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="attendance" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Attendance Predictions</h3>
                
                {attendancePredictions.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">No attendance predictions available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {attendancePredictions.map((prediction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{formatDate(prediction.date)}</p>
                            <p className="text-sm text-muted-foreground">
                              Predicted attendance rate
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              {(prediction.predictedValue || prediction.predictedAttendanceRate || 0).toFixed(1)}%
                            </p>
                            <p className={`text-sm ${getConfidenceColor(prediction.confidence)}`}>
                              {prediction.confidence > 0.7 ? 'High' : prediction.confidence > 0.5 ? 'Medium' : 'Low'} confidence
                            </p>
                          </div>
                          
                          <div className="w-16">
                            <Progress value={prediction.predictedValue || prediction.predictedAttendanceRate || 0} className="h-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="turnover" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Turnover Risk Analysis</h3>
                
                {turnoverRisks.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">No turnover risk data available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {turnoverRisks.slice(0, 10).map((risk, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{risk.employeeName}</p>
                            <p className="text-sm text-muted-foreground">
                              {risk.department}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <Badge variant={getRiskColor(risk.riskScore)}>
                              {getRiskLabel(risk.riskScore)}
                            </Badge>
                            <p className="text-sm text-muted-foreground mt-1">
                              Risk score: {(risk.riskScore * 100).toFixed(0)}%
                            </p>
                          </div>
                          
                          <div className="w-16">
                            <Progress value={risk.riskScore * 100} className="h-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
            
            <TabsContent value="productivity" className="mt-4">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Productivity Forecasts</h3>
                
                {productivityForecasts.length === 0 ? (
                  <div className="text-center py-8">
                    <Activity className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-muted-foreground">No productivity forecasts available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {productivityForecasts.map((forecast, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium">{forecast.date || forecast.period}</p>
                            <p className="text-sm text-muted-foreground">
                              Predicted productivity
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-lg font-semibold">
                              {(forecast.predictedValue || forecast.predictedProductivity || 0).toFixed(1)}%
                            </p>
                            <p className={`text-sm ${getConfidenceColor(forecast.confidence)}`}>
                              {forecast.confidence > 0.7 ? 'High' : forecast.confidence > 0.5 ? 'Medium' : 'Low'} confidence
                            </p>
                          </div>
                          
                          <div className="w-16">
                            <Progress value={forecast.predictedValue || forecast.predictedProductivity || 0} className="h-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
