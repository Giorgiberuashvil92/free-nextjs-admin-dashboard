import { requirePanelSession } from "@/lib/requirePanelSession";
import { getMarteBackendBaseUrl, getSupportChatAgentKey } from "@/lib/supportChatMarte";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const denied = await requirePanelSession(request);
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      userId?: string;
      text?: string;
    };
    const key = getSupportChatAgentKey();
    const res = await fetch(
      `${getMarteBackendBaseUrl()}/support-chat/agent/reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-support-agent-key": key,
        },
        body: JSON.stringify({
          userId: body.userId ?? "",
          text: body.text ?? "",
        }),
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
