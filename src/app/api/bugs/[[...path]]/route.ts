import { NextRequest, NextResponse } from 'next/server';
import { getPanelBackendBaseUrl, PANEL_AUTH_COOKIE } from '@/lib/panelAuthConfig';

type Context = { params: Promise<{ path?: string[] }> };
async function forward(request: NextRequest, context: Context) {
  const token = request.cookies.get(PANEL_AUTH_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: 'ავტორიზაცია საჭიროა' }, { status: 401 });
  const { path = [] } = await context.params;
  if (path.length > 1 || (path[0] && !/^[a-f\d]{24}$/i.test(path[0]))) {
    return NextResponse.json({ message: 'არასწორი მისამართი' }, { status: 400 });
  }
  try {
    const response = await fetch(`${getPanelBackendBaseUrl()}/bugs${path[0] ? `/${path[0]}` : ''}`, {
      method: request.method,
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: ['POST', 'PATCH'].includes(request.method) ? await request.text() : undefined,
      cache: 'no-store',
    });
    const body = await response.json();
    return NextResponse.json(body, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'სერვერთან დაკავშირება ვერ მოხერხდა' }, { status: 502 });
  }
}
export { forward as GET, forward as POST, forward as PATCH, forward as DELETE };
