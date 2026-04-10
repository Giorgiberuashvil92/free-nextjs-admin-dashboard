import { NextResponse } from "next/server";
import { getMarteBackendBaseUrl, getSupportChatAgentKey } from "@/lib/supportChatMarte";

export async function GET() {
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
    return NextResponse.json(data, { status: res.status });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
