/**
 * Face Recognition Logging API
 * Receives logs from client-side and writes to server logs (visible in Vercel)
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use edge runtime for better performance

export async function POST(request: NextRequest) {
  try {
    const { logs, sessionId } = await request.json();

    if (!logs || !Array.isArray(logs)) {
      return NextResponse.json(
        { error: 'Invalid logs format' },
        { status: 400 }
      );
    }

    // Process and write logs to server console (appears in Vercel logs)
    for (const log of logs) {
      const timestamp = log.timestamp || new Date().toISOString();
      const level = log.level;
      const message = log.message;
      const context = log.context ? JSON.stringify(log.context) : '';
      
      // Format log for Vercel
      const formattedLog = `[CLIENT] [${timestamp}] [${level}] [FR-${sessionId}] ${message} ${context}`;
      
      // Write to appropriate console level
      switch (level) {
        case 0: // DEBUG
        case 1: // INFO
          console.log(formattedLog);
          break;
        case 2: // WARN
          console.warn(formattedLog);
          break;
        case 3: // ERROR
        case 4: // FATAL
          console.error(formattedLog);
          if (log.error?.stack) {
            console.error('Stack trace:', log.error.stack);
          }
          break;
        default:
          console.log(formattedLog);
      }

      // Log performance metrics if available
      if (log.performance) {
        console.log(`[PERF] [FR-${sessionId}] Performance metrics:`, JSON.stringify(log.performance));
      }
    }

    // Log summary
    const errorCount = logs.filter(l => l.level >= 3).length;
    const warnCount = logs.filter(l => l.level === 2).length;
    
    if (errorCount > 0 || warnCount > 0) {
      console.warn(`[CLIENT] [FR-${sessionId}] Batch summary: ${logs.length} logs received (${errorCount} errors, ${warnCount} warnings)`);
    }

    return NextResponse.json({ 
      success: true, 
      received: logs.length,
      sessionId 
    });

  } catch (error) {
    console.error('[LOG-API] Error processing face recognition logs:', error);
    return NextResponse.json(
      { error: 'Failed to process logs' },
      { status: 500 }
    );
  }
}

// GET endpoint for health check
export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    service: 'face-recognition-logger',
    timestamp: new Date().toISOString()
  });
}
