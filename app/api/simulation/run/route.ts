import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/simulation/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Backend returned ${res.status}: ${errText}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error: any) {
    // Return a clear error so the frontend can surface it
    return NextResponse.json(
      { error: `Simulation failed: ${error.message}. Ensure the backend is running via launch.bat.` },
      { status: 503 }
    );
  }
}
