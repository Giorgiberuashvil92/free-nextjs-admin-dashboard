import { NextResponse } from "next/server";
import { getMarteBackendBaseUrl, getSupportChatAgentKey } from "@/lib/supportChatMarte";

export async function POST(request: Request) {
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
