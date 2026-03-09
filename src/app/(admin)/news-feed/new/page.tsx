"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

export default function NewNewsArticlePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [category, setCategory] = useState("tips");
  const [image, setImage] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    setMsg("");
    setErr("");
    try {
      if (!title.trim()) throw new Error("სათაური სავალდებულოა");
      if (!summary.trim()) throw new Error("საშუალო აღწერა სავალდებულოა");
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        category: category || "general",
        image: image.trim() || undefined,
        body: body.trim() || undefined,
      };
      const created = await apiPost<{ id?: string; _id?: string }>(
        "/news-feed",
        payload
      );
      const newId = (created as { id?: string; _id?: string })?.id || (created as { id?: string; _id?: string })?._id;
      setMsg("სტატია წარმატებით დაემატა");
      setTitle("");
      setSummary("");
      setBody("");
      setImage("");
      if (newId) {
        setTimeout(() => router.push(`/news-feed/${newId}`), 800);
      } else {
        setTimeout(() => router.push("/news-feed"), 800);
      }
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">ახალი სტატია</h1>
          <p className="text-sm text-gray-500">
            სიახლეების ფიდს დაემატება ახალი სტატია
          </p>
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
            placeholder="მაგ: 5 რჩევა ზამთრის მოვლისთვის"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            მოკლე აღწერა (საშუალო) *
          </label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="მაგ: როგორ მოვამზადოთ მანქანა ზამთრისთვის"
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
            სურათი (URL) ან ატვირთე
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
            placeholder="ან შეიყვანე URL ხელით"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            სრული ტექსტი (ოფციონალური)
          </label>
          <textarea
            className="border rounded px-3 py-2 w-full"
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="სტატიის სრული ტექსტი დეტალურ გვერდზე"
          />
        </div>

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
