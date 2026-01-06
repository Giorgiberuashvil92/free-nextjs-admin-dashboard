"use client";
import React, { useEffect, useState, useCallback } from "react";
import { apiGetJson, apiDelete } from "@/lib/api";

type PostLike = {
  userId: string;
  userName: string;
  userEmail?: string;
  userPhone?: string;
  likedAt?: number | string;
};

type Post = {
  id: string;
  userId: string;
  userName?: string;
  userInitial?: string;
  title: string;
  content: string;
  images?: string[];
  category?: string;
  likes: number; // Legacy field - total likes count
  comments: number;
  isActive: boolean;
  createdAt?: number | string;
  updatedAt?: number | string;
  likesCount?: number; // Total likes count
  likesList?: PostLike[]; // List of users who liked
};

export default function AdminPostsPage() {
  const [rows, setRows] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await apiGetJson<Post[]>(
        `/community/admin/posts`
      );
      setRows(Array.isArray(res) ? res : []);
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
        `დარწმუნებული ხართ რომ გსურთ ამ პოსტის წაშლა? (ID: ${id})`
      )
    )
      return;
    try {
      await apiDelete(`/community/posts/${id}`);
      await load(); // refresh list
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

  const formatDate = (date?: number | string) => {
    if (!date) return "-";
    const d = typeof date === "string" ? new Date(date) : new Date(date);
    return d.toLocaleString("ka-GE");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">პოსტები</h1>
        <p className="text-sm text-gray-500">
          მართვა და ნახვა ვინ დაალაიქა პოსტები
        </p>
      </div>

      {err && (
        <div className="p-3 bg-red-50 text-red-600 rounded text-sm">{err}</div>
      )}

      <div className="overflow-x-auto border rounded-md">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">ავტორი</th>
              <th className="px-3 py-2 text-left">სათაური</th>
              <th className="px-3 py-2 text-left">კატეგორია</th>
              <th className="px-3 py-2 text-left">Like-ები</th>
              <th className="px-3 py-2 text-left">კომენტარები</th>
              <th className="px-3 py-2 text-left">სტატუსი</th>
              <th className="px-3 py-2 text-left">შექმნილია</th>
              <th className="px-3 py-2 text-left">მოქმედებები</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-gray-500"
                  colSpan={9}
                >
                  იტვირთება...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-8 text-center text-gray-500"
                  colSpan={9}
                >
                  პოსტები არ მოიძებნა
                </td>
              </tr>
            )}
            {rows.map((post) => (
              <React.Fragment key={post.id}>
                <tr className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="text-blue-600 font-mono text-xs">
                      {post.id.slice(-8)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {post.userInitial && (
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                          {post.userInitial}
                        </div>
                      )}
                      <span>{post.userName || post.userId || "-"}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="max-w-xs truncate" title={post.title}>
                      {post.title || "-"}
                    </div>
                  </td>
                  <td className="px-3 py-2">{post.category || "-"}</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold text-blue-600">
                      {post.likesCount ?? post.likes ?? 0}
                    </span>
                  </td>
                  <td className="px-3 py-2">{post.comments ?? 0}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        post.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {post.isActive ? "აქტიური" : "არააქტიური"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {formatDate(post.createdAt)}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      წაშლა
                    </button>
                  </td>
                </tr>
                {post.likesList && post.likesList.length > 0 && (
                  <tr className="border-t bg-gray-50">
                    <td colSpan={9} className="px-3 py-4">
                      <div className="space-y-2">
                        <h3 className="font-semibold text-sm mb-2">
                          ვინ დაალაიქა ({post.likesList.length}):
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                          {post.likesList.map((like, idx) => (
                            <div
                              key={`${like.userId}-${idx}`}
                              className="p-2 bg-white rounded border text-xs"
                            >
                              <div className="font-medium">{like.userName}</div>
                              {like.userEmail && (
                                <div className="text-gray-600">
                                  {like.userEmail}
                                </div>
                              )}
                              {like.userPhone && (
                                <div className="text-gray-600">
                                  {like.userPhone}
                                </div>
                              )}
                              {like.likedAt && (
                                <div className="text-gray-500 text-xs mt-1">
                                  {formatDate(like.likedAt)}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
                {post.likesList && post.likesList.length === 0 && (
                  <tr className="border-t bg-gray-50">
                    <td colSpan={9} className="px-3 py-2 text-sm text-gray-500">
                      არავინ დაალაიქა
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

