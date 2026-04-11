"use client";

import React, { useCallback, useEffect, useState } from "react";

type ThreadRow = {
  userId: string;
  /** Marte: users-ის firstName/lastName ან phone; guest/curl — fallback userId */
  userDisplayName?: string;
  lastMessage: string;
  lastAt: number;
  lastSender: "user" | "agent";
  /** Marte: true = საპორტს პასუხი სჭირდება; false = უკვე ნახილია (მწვანე) */
  awaitingAgentReply?: boolean;
};

/** Marte JSON + უსაფრთხო snake_case; ტიპის შეუსაბამობა aggregation _id ↔ users.id */
function threadDisplayLabel(row: ThreadRow): string {
  const r = row as ThreadRow & { user_display_name?: string };
  const raw = String(r.userDisplayName ?? r.user_display_name ?? "").trim();
  if (raw && raw !== row.userId) return raw;
  return row.userId;
}

/** ბოლო იუზერის მესიჯი + ადმინმა ჯერ არ გახსნა/არ ჩაიტვირთა თრედი (წითელი). false = ნახული (მწვანე). */
function threadAwaitingAgent(row: ThreadRow): boolean {
  const r = row as ThreadRow & { awaiting_agent_reply?: boolean };
  const ar = r.awaitingAgentReply ?? r.awaiting_agent_reply;
  if (row.lastSender !== "user") return false;
  if (typeof ar === "boolean") return ar;
  return true;
}

function threadSeenByAgent(row: ThreadRow): boolean {
  const r = row as ThreadRow & { awaiting_agent_reply?: boolean };
  const ar = r.awaitingAgentReply ?? r.awaiting_agent_reply;
  return row.lastSender === "user" && ar === false;
}

type ChatMessage = {
  id: string;
  text: string;
  sender: "user" | "agent";
  ts: number;
};

export default function SupportChatAdminPage() {
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedDisplayName, setSelectedDisplayName] = useState<string>("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async (opts?: { quiet?: boolean }) => {
    const quiet = opts?.quiet === true;
    if (!quiet) {
      setLoading(true);
      setError("");
    }
    try {
      const res = await fetch("/api/admin/support-chat/threads", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : JSON.stringify(data?.message || data),
        );
      }
      setThreads(Array.isArray(data) ? data : []);
    } catch (e: unknown) {
      if (!quiet) {
        setError(e instanceof Error ? e.message : "ჩატვირთვა ვერ მოხერხდა");
      }
      if (!quiet) setThreads([]);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (userId: string) => {
    setMsgLoading(true);
    setError("");
    try {
      const enc = encodeURIComponent(userId);
      const res = await fetch(
        `/api/admin/support-chat/thread/${enc}/messages`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : JSON.stringify(data?.message || data),
        );
      }
      setMessages(Array.isArray(data) ? data : []);
      void loadThreads({ quiet: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "მესიჯები ვერ ჩაიტვირთა");
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, [loadThreads]);

  useEffect(() => {
    void loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedUserId) {
      void loadMessages(selectedUserId);
    } else {
      setMessages([]);
    }
  }, [selectedUserId, loadMessages]);

  const sendReply = async () => {
    const t = replyText.trim();
    if (!t || !selectedUserId || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/admin/support-chat/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId, text: t }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data?.error === "string"
            ? data.error
            : JSON.stringify(data?.message || data),
        );
      }
      setReplyText("");
      await loadMessages(selectedUserId);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "გაგზავნა ვერ მოხერხდა");
    } finally {
      setSending(false);
    }
  };

  const formatTime = (ts: number) => {
    try {
      return new Intl.DateTimeFormat("ka-GE", {
        dateStyle: "short",
        timeStyle: "short",
      }).format(new Date(ts));
    } catch {
      return String(ts);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
          საპორტის ჩატი
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Marte ბექენდის <code className="rounded bg-gray-100 px-1">support_messages</code>{" "}
          — თრედებში ჩანს მომხმარებლის სახელი/ტელეფონი (როცა <code className="rounded bg-gray-100 px-1">usr_…</code>{" "}
          users-შია), ქვემოთ — ტექნიკური ID. წითელი + „მოგწერეს“ — პასუხი გჭირდება; მწვანე + „ნახული“ — თრედი უკვე გახსნილია.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              თრედები
            </h2>
            <button
              type="button"
              onClick={() => void loadThreads()}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
            >
              განახლება
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-gray-500">იტვირთება…</p>
          ) : threads.length === 0 ? (
            <p className="text-sm text-gray-500">ჯერ არავინ წერია საპორტში.</p>
          ) : (
            <ul className="max-h-[480px] space-y-2 overflow-y-auto">
              {threads.map((row) => {
                const awaiting = threadAwaitingAgent(row);
                const seen = threadSeenByAgent(row);
                const sel = selectedUserId === row.userId;
                const rowTone = awaiting
                  ? "border-rose-400 bg-rose-50 hover:bg-rose-100/90 dark:border-rose-500 dark:bg-rose-950/40 dark:hover:bg-rose-950/55"
                  : seen
                    ? "border-emerald-400 bg-emerald-50 hover:bg-emerald-100/90 dark:border-emerald-600 dark:bg-emerald-950/35 dark:hover:bg-emerald-950/50"
                    : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800";
                const rowSelected = sel
                  ? awaiting
                    ? "border-rose-500 bg-rose-50 ring-2 ring-brand-500 dark:bg-rose-950/50 dark:ring-brand-400/70"
                    : seen
                      ? "border-emerald-500 bg-emerald-50 ring-2 ring-brand-500 dark:bg-emerald-950/45 dark:ring-brand-400/70"
                      : "border-brand-500 bg-brand-50 ring-2 ring-brand-400/80 dark:bg-brand-500/10 dark:ring-brand-400/50"
                  : rowTone;
                return (
                <li key={row.userId}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUserId(row.userId);
                      setSelectedDisplayName(threadDisplayLabel(row));
                    }}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${rowSelected}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {threadDisplayLabel(row)}
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        {awaiting ? (
                          <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            მოგწერეს
                          </span>
                        ) : null}
                        {seen ? (
                          <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            ნახული
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-gray-500">
                      {row.userId}
                    </div>
                    <div className="mt-1 line-clamp-2 text-gray-800 dark:text-gray-200">
                      {row.lastSender === "agent" ? "საპორტი: " : "იუზერი: "}
                      {row.lastMessage}
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      {formatTime(row.lastAt)}
                    </div>
                  </button>
                </li>
              );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="mb-3">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              საუბარი
            </h2>
            {selectedUserId ? (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                <span className="font-medium">{selectedDisplayName}</span>
                <span className="ml-2 font-mono text-xs text-gray-400">
                  {selectedUserId}
                </span>
              </p>
            ) : null}
          </div>
          {!selectedUserId ? (
            <p className="text-sm text-gray-500">აირჩიე თრედი მარცხნივ.</p>
          ) : msgLoading ? (
            <p className="text-sm text-gray-500">მესიჯები იტვირთება…</p>
          ) : (
            <>
              <div className="mb-4 max-h-[320px] space-y-2 overflow-y-auto rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                        m.sender === "user"
                          ? "bg-brand-500 text-white"
                          : "border border-gray-200 bg-white text-gray-900 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                      }`}
                    >
                      <div className="text-xs opacity-80">
                        {m.sender === "user" ? "იუზერი" : "საპორტი"} ·{" "}
                        {formatTime(m.ts)}
                      </div>
                      <div className="mt-1 whitespace-pre-wrap">{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="საპორტის პასუხი…"
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800"
              />
              <button
                type="button"
                disabled={sending || !replyText.trim()}
                onClick={() => void sendReply()}
                className="mt-2 w-full rounded-lg bg-brand-500 py-2.5 text-sm font-medium text-white disabled:opacity-50"
              >
                {sending ? "იგზავნება…" : "გაგზავნა"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
