import { requirePanelSession } from "@/lib/requirePanelSession";
import { getMarteBackendBaseUrl, getSupportChatAgentKey } from "@/lib/supportChatMarte";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const denied = await requirePanelSession(request);
  if (denied) return denied;

  try {
    const key = getSupportChatAgentKey();
    const res = await fetch(
      `${getMarteBackendBaseUrl()}/support-chat/agent/threads`,
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
    if (Array.isArray(data)) {
      data = data.map((item: Record<string, unknown>) => {
        const uid =
          typeof item.userId === "string"
            ? item.userId.trim()
            : String(item.userId ?? "").trim();
        const display =
          (item.userDisplayName as string | undefined) ??
          (item.user_display_name as string | undefined);
        const awaiting =
          item.awaitingAgentReply ?? item.awaiting_agent_reply;
        return {
          ...item,
          userId: uid,
          userDisplayName: display,
          awaitingAgentReply:
            typeof awaiting === "boolean" ? awaiting : undefined,
        };
      });
    }
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
