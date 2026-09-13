import { NextRequest, NextResponse } from 'next/server';
import { PANEL_AUTH_COOKIE, getPanelBackendBaseUrl } from '@/lib/panelAuthConfig';
export const dynamic = 'force-dynamic';
async function forward(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const token = req.cookies.get(PANEL_AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'ავტორიზაცია საჭიროა' }, { status: 401 });
  const { path } = await context.params;
  const endpoint = path.join('/');
  if (!/^invoices(?:\/[a-f0-9-]{36}\/(?:file|review))?$/.test(endpoint)) return new NextResponse(null, { status: 404 });
  try {
    const response = await fetch(`${getPanelBackendBaseUrl()}/cashback-admin/${endpoint}${req.nextUrl.search}`, {
      method: req.method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: req.method === 'POST' ? await req.text() : undefined, cache: 'no-store', signal: AbortSignal.timeout(30000),
    });
    const headers = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
    for (const name of ['content-type', 'content-disposition', 'content-security-policy']) {
      const value = response.headers.get(name); if (value) headers.set(name, value);
    }
    return new NextResponse(response.body, { status: response.status, headers });
  } catch { return NextResponse.json({ message: 'სერვერთან კავშირი ვერ მოხერხდა' }, { status: 502 }); }
}
export const GET = forward;
export const POST = forward;
