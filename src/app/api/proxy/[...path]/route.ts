import { NextRequest, NextResponse } from 'next/server';

// Get backend URL based on environment
const getBackendUrl = (request: NextRequest): string => {
  // Environment variable override (highest priority)
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  
  // Development: try localhost backend first, fallback to production
  if (process.env.NODE_ENV === 'development') {
    const localhostBackend = process.env.LOCAL_BACKEND_URL || 'http://localhost:3000';
    // In development, you can set LOCAL_BACKEND_URL to use local backend
    if (process.env.LOCAL_BACKEND_URL) {
      return localhostBackend;
    }
  }
  
  // Production: use production backend
  return 'https://marte-backend-production.up.railway.app';
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'POST');
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PUT');
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'PATCH');
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  return handleRequest(request, resolvedParams, 'DELETE');
}

async function handleRequest(
  request: NextRequest,
  params: { path: string[] },
  method: string
) {
  try {
    const path = params.path.join('/');
    const url = new URL(request.url);
    const searchParams = url.searchParams.toString();
    
    // Get primary backend URL
    let backendUrl = `${getBackendUrl(request)}/${path}${searchParams ? `?${searchParams}` : ''}`;
    const primaryBackend = getBackendUrl(request);
    const localhostBackend = process.env.LOCAL_BACKEND_URL || 'http://localhost:3000';

    console.log(`[PROXY] ${method} ${path} -> ${backendUrl}`);

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Forward any custom headers if needed
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      headers['authorization'] = authHeader;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (method !== 'GET' && method !== 'HEAD') {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    }

    // Try primary backend first
    let response = await fetch(backendUrl, options);
    let data = await response.text();
    
    console.log(`[PROXY] Primary response status: ${response.status}, NODE_ENV: ${process.env.NODE_ENV}, primaryBackend: ${primaryBackend}`);
    
    // If 404 in development and primary is production, try localhost
    if (response.status === 404 && 
        process.env.NODE_ENV === 'development' && 
        primaryBackend.includes('railway.app') &&
        !primaryBackend.includes('localhost')) {
      console.log(`[PROXY] 404 from production, trying localhost: ${localhostBackend}`);
      const localhostUrl = `${localhostBackend}/${path}${searchParams ? `?${searchParams}` : ''}`;
      console.log(`[PROXY] Localhost URL: ${localhostUrl}`);
      try {
        const localhostResponse = await fetch(localhostUrl, options);
        const localhostData = await localhostResponse.text();
        console.log(`[PROXY] Localhost response status: ${localhostResponse.status}`);
        
        if (localhostResponse.ok || localhostResponse.status !== 404) {
          console.log(`[PROXY] Using localhost response`);
          response = localhostResponse;
          data = localhostData;
          backendUrl = localhostUrl;
        } else {
          console.log(`[PROXY] Localhost also returned ${localhostResponse.status}, keeping original response`);
        }
      } catch (localhostError) {
        console.log(`[PROXY] Localhost request failed:`, localhostError);
        // Fall back to original response
      }
    } else {
      console.log(`[PROXY] Not trying localhost: status=${response.status}, NODE_ENV=${process.env.NODE_ENV}, isRailway=${primaryBackend.includes('railway.app')}`);
    }
    
    console.log(`[PROXY] Final response status: ${response.status} from ${backendUrl}`);
    
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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('[PROXY] Error:', error);
    return NextResponse.json(
      { error: 'Proxy request failed', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

