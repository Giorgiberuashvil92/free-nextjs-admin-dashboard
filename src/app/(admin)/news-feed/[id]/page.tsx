"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { apiGetJson, apiPatch } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

type NewsArticle = {
  id: string;
  title: string;
  summary: string;
  category?: string;
  image?: string;
  body?: string;
  isActive?: boolean;
};

export default function EditNewsArticlePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("tips");
  const [image, setImage] = useState("");
  const [body, setBody] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      setLoadingData(true);
      try {
        const res = await apiGetJson<{ success: boolean; data: NewsArticle }>(
          `/news-feed/${id}`
        );
        const data = (res as { data?: NewsArticle })?.data;
        if (data) {
          setTitle(data.title || "");
          setSummary(data.summary || "");
          setCategory(data.category || "tips");
          setImage(data.image || "");
          setBody(data.body || "");
          setIsActive(data.isActive !== false);
        }
      } catch (e) {
        setErr("სტატიის ჩატვირთვა ვერ მოხერხდა");
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, [id]);

  const save = async () => {
    setLoading(true);
    setMsg("");
    setErr("");
    try {
      if (!title.trim()) throw new Error("სათაური სავალდებულოა");
      if (!summary.trim()) throw new Error("საშუალო აღწერა სავალდებულოა");
      await apiPatch(`/news-feed/${id}`, {
        title: title.trim(),
        summary: summary.trim(),
        category: category || "general",
        image: image.trim() || undefined,
        body: body.trim() || undefined,
        isActive,
      });
      setMsg("სტატია წარმატებით განახლდა");
      setTimeout(() => setMsg(""), 2000);
    } catch (e: unknown) {
      const message =
        e && typeof e === "object" && "message" in e
          ? String((e as { message?: unknown }).message)
          : "Request failed";
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingData) {
    return (
      <div className="p-6">
        <div className="text-gray-500">იტვირთება...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">სტატიის რედაქტირება</h1>
          <p className="text-sm text-gray-500">ID: {id}</p>
        </div>
        <Link
          href="/news-feed"
          className="p-2 border rounded hover:bg-gray-50 text-sm"
        >
          ← უკან
        </Link>
      </div>

      {msg && (
        <div className="p-3 bg-green-50 text-green-700 rounded text-sm">
          {msg}
        </div>
      )}
      {err && (
        <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{err}</div>
      )}

      <div className="max-w-2xl space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სათაური *
          </label>
          <input
            className="border rounded px-3 py-2 w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="სათაური"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            მოკლე აღწერა *
          </label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="მოკლე აღწერა"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            კატეგორია
          </label>
          <select
            className="border rounded px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="tips">რჩევები</option>
            <option value="technology">ტექნოლოგია</option>
            <option value="general">ზოგადი</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სურათი
          </label>
          <ImageUpload
            value={image ? [image] : []}
            onChange={(urls) => setImage(urls.length > 0 ? urls[0] : "")}
            maxImages={1}
            folder="news"
            label=""
          />
          <input
            className="border rounded px-3 py-2 w-full mt-2"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="URL"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სრული ტექსტი
          </label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="სრული ტექსტი"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          აქტიური (სიახლეების ფიდზე ჩანს)
        </label>

        <div className="flex gap-3">
          <button
            className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50"
            onClick={save}
            disabled={loading}
          >
            {loading ? "შენახვა..." : "შენახვა"}
          </button>
          <Link
            href="/news-feed"
            className="px-4 py-2 border rounded hover:bg-gray-50"
          >
            გაუქმება
          </Link>
        </div>
      </div>
    </div>
  );
}
