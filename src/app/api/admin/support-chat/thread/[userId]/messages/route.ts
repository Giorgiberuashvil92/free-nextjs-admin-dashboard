import { requirePanelSession } from "@/lib/requirePanelSession";
import { getMarteBackendBaseUrl, getSupportChatAgentKey } from "@/lib/supportChatMarte";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const denied = await requirePanelSession(request);
  if (denied) return denied;

  try {
    const { userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: "userId required" }, { status: 400 });
    }
    const key = getSupportChatAgentKey();
    const encoded = encodeURIComponent(userId);
    const res = await fetch(
      `${getMarteBackendBaseUrl()}/support-chat/agent/thread/${encoded}/messages`,
      {
        method: "GET",
        headers: { "x-support-agent-key": key },
        cache: "no-store",
      },
    );
    const text = await res.text();
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
