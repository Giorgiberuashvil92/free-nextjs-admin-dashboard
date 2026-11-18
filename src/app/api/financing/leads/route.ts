import { requirePanelSession } from '@/lib/requirePanelSession';
import { getPanelBackendBaseUrl, PANEL_AUTH_COOKIE } from '@/lib/panelAuthConfig';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const denied = await requirePanelSession(request);
  if (denied) return denied;
  const token = request.cookies.get(PANEL_AUTH_COOKIE)?.value;
  try {
    const limit = request.nextUrl.searchParams.get('limit') || '200';
    const response = await fetch(`${getPanelBackendBaseUrl()}/financing/leads?limit=${encodeURIComponent(limit)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: 'no-store',
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'განაცხადების ჩატვირთვა ვერ მოხერხდა.' }, { status: 502 });
  }
}
