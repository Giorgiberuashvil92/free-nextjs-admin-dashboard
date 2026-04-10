"use client";

import React, { useCallback, useEffect, useState } from "react";

type ThreadRow = {
  userId: string;
  lastMessage: string;
  lastAt: number;
  lastSender: "user" | "agent";
};

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgLoading, setMsgLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

  const loadThreads = useCallback(async () => {
    setLoading(true);
    setError("");
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
      setError(e instanceof Error ? e.message : "ჩატვირთვა ვერ მოხერხდა");
      setThreads([]);
    } finally {
      setLoading(false);
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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "მესიჯები ვერ ჩაიტვირთა");
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  }, []);

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
      await loadThreads();
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
          — აირჩიე მომხმარებელი და უპასუხე. სერვერზე დაყენებული უნდა იყოს{" "}
          <code className="rounded bg-gray-100 px-1">SUPPORT_CHAT_AGENT_KEY</code>{" "}
          (Next: იგივე <code className="rounded bg-gray-100 px-1">.env.local</code>).
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
              {threads.map((row) => (
                <li key={row.userId}>
                  <button
                    type="button"
                    onClick={() => setSelectedUserId(row.userId)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                      selectedUserId === row.userId
                        ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                        : "border-gray-200 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                    }`}
                  >
                    <div className="font-mono text-xs text-gray-500">
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
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-3 text-lg font-medium text-gray-900 dark:text-white">
            საუბარი
          </h2>
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
