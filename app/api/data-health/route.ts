import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/data-health`, {
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`Backend returned ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    // Return a graceful fallback if backend is down
    return NextResponse.json(
      {
        status: 'offline',
        datasets_monitored: 0,
        registry: [],
        drift_detected: false,
        missing_data_pct: 0,
        error: 'Backend API is offline. Start the backend with launch.bat.',
      },
      { status: 200 } // Return 200 so the UI can handle it gracefully
    );
  }
}
