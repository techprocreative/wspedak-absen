/**
 * Metrics API Endpoint
 * Provides HTTP endpoints for metrics collection
 */

import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/lib/metrics-collector';

import { logger, logApiError, logApiRequest } from '@/lib/logger'
// GET /api/metrics - Get current metrics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const name = searchParams.get('name');
    const aggregated = searchParams.get('aggregated') === 'true';
    const snapshots = searchParams.get('snapshots') === 'true';

    if (format === 'prometheus') {
      // Export in Prometheus format
      const prometheusFormat = metricsCollector.exportPrometheusFormat();
      return new NextResponse(prometheusFormat, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4',
        },
      });
    } else {
      // Export in JSON format
      const response: any = {
        timestamp: new Date().toISOString(),
        definitions: metricsCollector.getMetricDefinitions(),
      };

      // Get specific metric if requested
      if (name) {
        const values = metricsCollector.getMetricValues(name);
        response.metric = {
          name,
          values,
        };
      } else {
        // Get all current metric values
        response.metrics = {};
        for (const definition of metricsCollector.getMetricDefinitions()) {
          const values = metricsCollector.getMetricValues(definition.name);
          if (values.length > 0) {
            // Get the latest value
            response.metrics[definition.name] = values[values.length - 1];
          }
        }
      }

      // Include aggregated metrics if requested
      if (aggregated) {
        response.aggregated = metricsCollector.getAggregatedMetrics(name || undefined);
      }

      // Include snapshots if requested
      if (snapshots) {
        response.snapshots = metricsCollector.getSnapshots();
      }

      return NextResponse.json(response);
    }
  } catch (error) {
    logger.error('Metrics API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/metrics - Record a metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, value, labels, unit } = body;

    if (!name || type === undefined || value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, value' },
        { status: 400 }
      );
    }

    // Ensure metric is defined
    let definition = metricsCollector.getMetricDefinition(name);
    if (!definition) {
      // Define the metric if it doesn't exist
      metricsCollector.defineMetric({
        name,
        type,
        description: `Custom metric: ${name}`,
        unit,
        labels: labels ? Object.keys(labels) : undefined,
      });
      definition = metricsCollector.getMetricDefinition(name)!;
    }

    // Record the metric based on type
    switch (type) {
      case 'counter':
        metricsCollector.incrementCounter(name, value, labels);
        break;
      case 'gauge':
        metricsCollector.setGauge(name, value, labels);
        break;
      case 'histogram':
      case 'timer':
        metricsCollector.recordHistogram(name, value, labels);
        break;
      default:
        return NextResponse.json(
          { error: `Invalid metric type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Metric ${name} recorded`,
    });
  } catch (error) {
    logger.error('Metrics API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/metrics - Clear all metrics
export async function DELETE(request: NextRequest) {
  try {
    metricsCollector.clearMetrics();
    return NextResponse.json({
      success: true,
      message: 'All metrics cleared',
    });
  } catch (error) {
    logger.error('Metrics API error', error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}