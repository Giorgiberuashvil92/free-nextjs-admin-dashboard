import { NextRequest, NextResponse } from 'next/server';

// Get backend URL based on environment
const getBackendUrl = (): string => {
  // Environment variable override (highest priority)
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  
  // Production: use production backend
  return 'https://marte-backend-production.up.railway.app';
};

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    const backendUrl = `${getBackendUrl()}/financing/leads${searchParams ? `?${searchParams}` : ''}`;

    console.log(`[FINANCING LEADS] GET -> ${backendUrl}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward any custom headers if needed
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const response = await fetch(backendUrl, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await response.text();
    
    console.log(`[FINANCING LEADS] Response status: ${response.status}`);
    
    let jsonData;
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }

    return NextResponse.json(jsonData, {
      status: response.status,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('[FINANCING LEADS] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch financing leads', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
