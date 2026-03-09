"use client";
import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { apiGetJson, apiDelete } from "@/lib/api";

type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  category?: string;
  image?: string;
  views: number;
  likes: number;
  publishedAt?: string;
  isActive?: boolean;
  createdAt?: string;
};

type ApiResponse = {
  success: boolean;
  data: NewsArticle[];
  count?: number;
};

export default function AdminNewsFeedPage() {
  const [rows, setRows] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiGetJson<ApiResponse>("/news-feed?activeOnly=false");
      const data = Array.isArray(res) ? res : (res?.data || []);
      setRows(data);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Request failed";
      setErr(message);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        `დარწმუნებული ხართ რომ გსურთ ამ სტატიის წაშლა? (ID: ${id})`
      )
    )
      return;
    try {
      await apiDelete(`/news-feed/${id}`);
      await load();
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Delete failed";
      alert(`წაშლა ვერ მოხერხდა: ${message}`);
    }
  };

  useEffect(() => {
    load();
  }, [load]);

  const formatDate = (date?: string) => {
    if (!date) return "-";
    const d = new Date(date);
    return d.toLocaleString("ka-GE");
  };

  const categoryLabel = (cat?: string) => {
    if (!cat) return "-";
    const map: Record<string, string> = {
      technology: "ტექნოლოგია",
      tips: "რჩევები",
      general: "ზოგადი",
    };
    return map[cat] || cat;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">სიახლეები</h1>
          <p className="text-sm text-gray-500">
            სტატიების მართვა და ნახვა
          </p>
        </div>
        <Link
          href="/news-feed/new"
          className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 text-sm font-medium"
        >
          + ახალი სტატია
        </Link>
      </div>

      {err && (
        <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{err}</div>
      )}

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">სურათი</th>
              <th className="px-3 py-2 text-left">სათაური</th>
              <th className="px-3 py-2 text-left">კატეგორია</th>
              <th className="px-3 py-2 text-left">ნახვა</th>
              <th className="px-3 py-2 text-left">ლაიქი</th>
              <th className="px-3 py-2 text-left">სტატუსი</th>
              <th className="px-3 py-2 text-left">გამოქვეყნება</th>
              <th className="px-3 py-2 text-left">მოქმედებები</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-gray-500"
                  colSpan={8}
                >
                  იტვირთება...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-gray-500"
                  colSpan={8}
                >
                  სტატიები ვერ მოიძებნა. დაუმატეთ პირველი სტატია.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((row) => (
                <tr key={row.id} className="border-t border-gray-100">
                  <td className="px-3 py-2">
                    {row.image ? (
                      <img
                        src={row.image}
                        alt=""
                        className="w-12 h-12 object-cover rounded"
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-[200px] truncate" title={row.title}>
                      {row.title}
                    </div>
                    <div className="text-xs text-gray-500 max-w-[200px] truncate">
                      {row.summary}
                    </div>
                  </td>
                  <td className="px-3 py-2">{categoryLabel(row.category)}</td>
                  <td className="px-3 py-2">{row.views ?? 0}</td>
                  <td className="px-3 py-2">{row.likes ?? 0}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        row.isActive !== false
                          ? "text-green-600"
                          : "text-gray-500"
                      }
                    >
                      {row.isActive !== false ? "აქტიური" : "არააქტიური"}
                    </span>
                  </td>
                  <td className="px-3 py-2">{formatDate(row.publishedAt)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Link
                        href={`/news-feed/${row.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        რედაქტირება
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDelete(row.id)}
                        className="text-red-600 hover:underline"
                      >
                        წაშლა
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
