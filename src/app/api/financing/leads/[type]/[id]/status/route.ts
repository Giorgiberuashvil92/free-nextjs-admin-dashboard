import { requirePanelSession } from '@/lib/requirePanelSession';
import { getPanelBackendBaseUrl, PANEL_AUTH_COOKIE } from '@/lib/panelAuthConfig';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, context: { params: Promise<{ type: string; id: string }> }) {
  const denied = await requirePanelSession(request);
  if (denied) return denied;
  const { type, id } = await context.params;
  if (!['lead', 'request'].includes(type) || !/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'არასწორი განაცხადი.' }, { status: 400 });
  }
  try {
    const body = await request.json();
    const response = await fetch(`${getPanelBackendBaseUrl()}/financing/leads/${type}/${id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${request.cookies.get(PANEL_AUTH_COOKIE)?.value}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: body.status }), cache: 'no-store',
    });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch {
    return NextResponse.json({ error: 'სტატუსის შენახვა ვერ მოხერხდა.' }, { status: 502 });
  }
}
