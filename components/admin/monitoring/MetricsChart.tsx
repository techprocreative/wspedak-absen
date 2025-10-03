/**
 * Metrics Chart Component
 * Displays system metrics over time in a chart
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, TrendingUp, Activity } from 'lucide-react';

interface MetricsChartProps {
  refreshInterval?: number;
  height?: number;
  showControls?: boolean;
}

interface ChartData {
  timestamp: string;
  cpu: number;
  memory: number;
  storage: number;
}

export function MetricsChart({ 
  refreshInterval = 60000, 
  height = 300,
  showControls = true
}: MetricsChartProps) {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metric, setMetric] = useState<'cpu' | 'memory' | 'storage'>('cpu');
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h'>('1h');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Calculate time range
      const now = new Date();
      let startTime: Date;
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '6h':
          startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
      }
      
      const response = await fetch(
        `/api/admin/monitoring/metrics?startTime=${startTime.toISOString()}&endTime=${now.toISOString()}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      
      const result = await response.json();
      if (result.success) {
        const chartData: ChartData[] = result.data.history.map((item: any) => ({
          timestamp: item.timestamp,
          cpu: item.cpu.usage,
          memory: item.memory.usagePercentage,
          storage: item.storage.usagePercentage
        }));
        
        setData(chartData);
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
    
    // Get metric data
    const metricData = data.map(d => d[metric]);
    const maxValue = Math.max(...metricData, 100);
    
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
      const value = Math.round(maxValue - (maxValue / 5) * i);
      ctx.fillText(`${value}%`, padding - 10, y + 4);
    }
    
    ctx.setLineDash([]);
    
    // Draw data line
    if (data.length > 0) {
      // Set line color based on metric
      switch (metric) {
        case 'cpu':
          ctx.strokeStyle = '#ef4444';
          break;
        case 'memory':
          ctx.strokeStyle = '#f59e0b';
          break;
        case 'storage':
          ctx.strokeStyle = '#10b981';
          break;
      }
      
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      data.forEach((point, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = padding + chartHeight - (point[metric] / maxValue) * chartHeight;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.stroke();
      
      // Draw data points
      ctx.fillStyle = ctx.strokeStyle;
      data.forEach((point, index) => {
        const x = padding + (chartWidth / (data.length - 1)) * index;
        const y = padding + chartHeight - (point[metric] / maxValue) * chartHeight;
        
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Draw X-axis labels (time)
      ctx.fillStyle = '#6b7280';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      
      const labelInterval = Math.ceil(data.length / 6);
      data.forEach((point, index) => {
        if (index % labelInterval === 0 || index === data.length - 1) {
          const x = padding + (chartWidth / (data.length - 1)) * index;
          const date = new Date(point.timestamp);
          const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          ctx.fillText(time, x, rect.height - padding + 20);
        }
      });
    }
    
    // Draw title
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    const metricTitle = metric.charAt(0).toUpperCase() + metric.slice(1);
    ctx.fillText(`${metricTitle} Usage`, padding, 20);
  };

  useEffect(() => {
    fetchData();
    
    if (refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, timeRange]);

  useEffect(() => {
    drawChart();
    
    const handleResize = () => {
      drawChart();
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [data, metric]);

  // Remove continuous animation loop; draw only on data/metric and on resize

  const getMetricColor = (metric: string) => {
    switch (metric) {
      case 'cpu':
        return 'text-red-500';
      case 'memory':
        return 'text-yellow-500';
      case 'storage':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'cpu':
        return <Activity className="h-4 w-4" />;
      case 'memory':
        return <Activity className="h-4 w-4" />;
      case 'storage':
        return <Activity className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Metrics Chart
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
          System metrics over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        {showControls && (
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label htmlFor="metric" className="text-sm font-medium">
                Metric:
              </label>
              <Select value={metric} onValueChange={(value: any) => setMetric(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpu">CPU</SelectItem>
                  <SelectItem value="memory">Memory</SelectItem>
                  <SelectItem value="storage">Storage</SelectItem>
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
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <div className={`flex items-center gap-1 ${getMetricColor(metric)}`}>
                {getMetricIcon(metric)}
                <span className="text-sm font-medium">
                  {metric.charAt(0).toUpperCase() + metric.slice(1)}
                </span>
              </div>
              {data.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Current: {data[data.length - 1][metric].toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}
        
        {loading && data.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-center text-red-500 p-4">
            <p>Error loading chart data: {error}</p>
            <Button onClick={fetchData} className="mt-2" variant="outline">
              Retry
            </Button>
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No data available</p>
          </div>
        ) : (
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="w-full"
              style={{ height: `${height}px` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
