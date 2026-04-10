import { NextResponse } from "next/server";
import { getMarteBackendBaseUrl, getSupportChatAgentKey } from "@/lib/supportChatMarte";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
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
