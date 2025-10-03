/**
 * Attendance Analytics Chart Component
 * Displays attendance trends and patterns
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, TrendingUp, Users, Calendar } from 'lucide-react';

interface AttendanceData {
  date: string;
  present: number;
  absent: number;
  late: number;
  earlyLeave: number;
  total: number;
  attendanceRate: number;
}

interface AttendanceAnalyticsChartProps {
  refreshInterval?: number;
  height?: number;
  showControls?: boolean;
  department?: string;
}

export function AttendanceAnalyticsChart({ 
  refreshInterval = 300000, // 5 minutes
  height = 300,
  showControls = true,
  department: initialDepartment = 'all'
}: AttendanceAnalyticsChartProps) {
  const [data, setData] = useState<AttendanceData[]>([]);
  const [patterns, setPatterns] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [department, setDepartment] = useState(initialDepartment);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate time range
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: now.toISOString()
      });
      
      if (department && department !== 'all') {
        params.append('department', department);
      }
      
      const response = await fetch(`/api/admin/analytics/attendance?${params}`, {
        credentials: 'include',
        cache: 'no-store',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch attendance analytics');
      }
      
      const result = await response.json();
      if (result.success) {
        setData(result.data.analytics);
        setPatterns(result.data.patterns);
        setLastUpdated(new Date());
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || data.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // Clear canvas
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    // Chart dimensions
    const padding = 40;
    const chartWidth = rect.width - padding * 2;
    const chartHeight = rect.height - padding * 2;
    
    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, rect.height - padding);
    ctx.stroke();
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, rect.height - padding);
    ctx.lineTo(rect.width - padding, rect.height - padding);
    ctx.stroke();
    
    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.setLineDash([5, 5]);
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(rect.width - padding, y);
      ctx.stroke();
      
      // Y-axis labels
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'right';
      const value = Math.round(100 - (100 / 5) * i);
      ctx.fillText(`${value}%`, padding - 10, y + 4);
    }
    
    ctx.setLineDash([]);
    
    // Draw data
    if (data.length > 0) {
      if (chartType === 'line') {
        // Draw attendance rate line
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        data.forEach((point, index) => {
          const x = padding + (chartWidth / (data.length - 1)) * index;
          const y = padding + chartHeight - (point.attendanceRate / 100) * chartHeight;
          
          if (index === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        });
        
        ctx.stroke();
        
        // Draw data points
        ctx.fillStyle = '#3b82f6';
        data.forEach((point, index) => {
          const x = padding + (chartWidth / (data.length - 1)) * index;
          const y = padding + chartHeight - (point.attendanceRate / 100) * chartHeight;
          
          ctx.beginPath();
          ctx.arc(x, y, 3, 0, Math.PI * 2);
          ctx.fill();
        });
      } else {
        // Draw bar chart
        const barWidth = chartWidth / data.length * 0.6;
        const barSpacing = chartWidth / data.length;
        
        data.forEach((point, index) => {
          const x = padding + barSpacing * index + (barSpacing - barWidth) / 2;
          const barHeight = (point.attendanceRate / 100) * chartHeight;
          const y = padding + chartHeight - barHeight;
          
          // Color based on attendance rate
          if (point.attendanceRate >= 90) {
            ctx.fillStyle = '#10b981'; // Green
          } else if (point.attendanceRate >= 80) {
            ctx.fillStyle = '#f59e0b'; // Yellow
          } else {
            ctx.fillStyle = '#ef4444'; // Red
          }
          
          ctx.fillRect(x, y, barWidth, barHeight);
        });
      }
      
      // Draw X-axis labels (dates)
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      
      const labelInterval = Math.ceil(data.length / 8);
      data.forEach((point, index) => {
        if (index % labelInterval === 0 || index === data.length - 1) {
          const x = padding + (chartWidth / (data.length - 1)) * index;
          const date = new Date(point.date);
          const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          ctx.fillText(dateStr, x, rect.height - padding + 20);
        }
      });
    }
    
    // Draw title
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Attendance Rate', padding, 20);
  };

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, timeRange, department]);

  useEffect(() => {
    drawChart();
    
    const handleResize = () => {
      drawChart();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, chartType]);

  // Remove continuous animation loop; draw only on data/type resize changes

  const getAverageAttendanceRate = () => {
    if (data.length === 0) return 0;
    const sum = data.reduce((acc, point) => acc + point.attendanceRate, 0);
    return (sum / data.length).toFixed(1);
  };

  const getLatestAttendanceRate = () => {
    if (data.length === 0) return 0;
    return data[data.length - 1].attendanceRate.toFixed(1);
  };

  const getAttendanceTrend = () => {
    if (data.length < 2) return 'stable';
    
    const recent = data.slice(-7); // Last 7 days
    const previous = data.slice(-14, -7); // Previous 7 days
    
    if (previous.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((acc, point) => acc + point.attendanceRate, 0) / recent.length;
    const previousAvg = previous.reduce((acc, point) => acc + point.attendanceRate, 0) / previous.length;
    
    if (recentAvg > previousAvg + 2) return 'improving';
    if (recentAvg < previousAvg - 2) return 'declining';
    return 'stable';
  };

  const getTrendIcon = () => {
    const trend = getAttendanceTrend();
    switch (trend) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining':
        return <TrendingUp className="h-4 w-4 text-red-500 rotate-180" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = () => {
    const trend = getAttendanceTrend();
    switch (trend) {
      case 'improving':
        return 'text-green-500';
      case 'declining':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Attendance Analytics
          </CardTitle>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          Attendance trends and patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showControls && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label htmlFor="chartType" className="text-sm font-medium">
                Chart Type:
              </label>
              <Select value={chartType} onValueChange={(value: any) => setChartType(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <label htmlFor="timeRange" className="text-sm font-medium">
                Time Range:
              </label>
              <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Select range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 Days</SelectItem>
                  <SelectItem value="30d">30 Days</SelectItem>
                  <SelectItem value="90d">90 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
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
                <span className="text-sm text-muted-foreground">Average:</span>
                <span className="text-sm font-medium">{getAverageAttendanceRate()}%</span>
              </div>
              
              <div className="flex items-center gap-1">
                <span className="text-sm text-muted-foreground">Latest:</span>
                <span className="text-sm font-medium">{getLatestAttendanceRate()}%</span>
              </div>
              
              <div className={`flex items-center gap-1 ${getTrendColor()}`}>
                {getTrendIcon()}
                <span className="text-sm font-medium">{getAttendanceTrend()}</span>
              </div>
            </div>
          </div>
        )}
        
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">
            <p>Error loading attendance data: {error}</p>
            <Button onClick={fetchData} className="mt-2" variant="outline">
              Retry
            </Button>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-muted-foreground">No attendance data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: `${height}px` }}
              />
            </div>
            
            {patterns && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Peak Attendance Day</h4>
                  <p className="text-lg font-semibold">{patterns.peakDay || 'N/A'}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Lowest Attendance Day</h4>
                  <p className="text-lg font-semibold">{patterns.lowestDay || 'N/A'}</p>
                </div>
                
                <div className="p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium mb-2">Most Common Issue</h4>
                  <p className="text-lg font-semibold">{patterns.mostCommonIssue || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
