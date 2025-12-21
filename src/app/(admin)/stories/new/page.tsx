"use client";
import { useState } from "react";
import { apiPost } from "@/lib/api";
import ImageUpload from "@/components/ImageUpload";

type Item = { id: string; type: "image" | "video"; uri: string; durationMs?: number; caption?: string };

export default function NewStoryPage() {
  const [authorId, setAuthorId] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorAvatar, setAuthorAvatar] = useState("");
  const [internalImage, setInternalImage] = useState("");
  const [category, setCategory] = useState("services");
  const [highlight, setHighlight] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    const id = `itm_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;
    setItems((prev) => [...prev, { id, type: "image", uri: "", durationMs: 6000, caption: "" }]);
  };

  const updateItem = (id: string, patch: Partial<Item>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  };

  const removeItem = (id: string) => setItems((prev) => prev.filter((it) => it.id !== id));

  const moveItem = (id: string, dir: -1 | 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.id === id);
      if (idx < 0) return prev;
      const ni = idx + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const copy = [...prev];
      const [row] = copy.splice(idx, 1);
      copy.splice(ni, 0, row);
      return copy;
    });
  };

  const save = async () => {
    setLoading(true); setMsg(""); setErr("");
    try {
      if (!authorId || !authorName) throw new Error("Author required");
      const payload = {
        authorId,
        authorName,
        authorAvatar: authorAvatar || undefined,
        internalImage: internalImage || undefined,
        category,
        highlight,
        items: items.map(({ id: _id, ...rest }) => rest), // eslint-disable-line @typescript-eslint/no-unused-vars
      };
      const created = await apiPost<{ id: string }>("/stories", payload);
      const newId = (created as { id?: string })?.id;
      setMsg("Created");
      // თუ გვექნება დეტალის გვერდი, აქ გადავიყვანოთ `/stories/${newId}`; ახლა გადავიყვანოთ სიაზე
      window.location.href = newId ? `/stories` : `/stories`;
    } catch (e: unknown) {
      const message = e && typeof e === "object" && "message" in e ? String((e as { message?: unknown }).message) : "Request failed";
      setErr(message);
    } finally { setLoading(false); }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold">New Story</h1>
        {msg && <div className="text-green-700 text-sm">{msg}</div>}
        {err && <div className="text-red-600 text-sm">{err}</div>}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-3 border rounded p-4">
          <div>
            <div className="text-sm text-gray-600">Author ID</div>
            <input className="border rounded px-3 py-2 w-full" value={authorId} onChange={(e)=>setAuthorId(e.target.value)} placeholder="user id" />
          </div>
          <div>
            <div className="text-sm text-gray-600">Author name</div>
            <input className="border rounded px-3 py-2 w-full" value={authorName} onChange={(e)=>setAuthorName(e.target.value)} placeholder="display name" />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">Author avatar (URL) ან ატვირთე ფოტო</div>
            <ImageUpload
              value={authorAvatar ? [authorAvatar] : []}
              onChange={(urls) => setAuthorAvatar(urls.length > 0 ? urls[0] : "")}
              maxImages={1}
              folder="stories"
              label=""
            />
            <input 
              className="border rounded px-3 py-2 w-full mt-2" 
              value={authorAvatar} 
              onChange={(e)=>setAuthorAvatar(e.target.value)} 
              placeholder="ან შეიყვანე URL ხელით" 
            />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-2">Internal Image (URL) ან ატვირთე ფოტო</div>
            <ImageUpload
              value={internalImage ? [internalImage] : []}
              onChange={(urls) => setInternalImage(urls.length > 0 ? urls[0] : "")}
              maxImages={1}
              folder="stories"
              label=""
            />
            <input 
              className="border rounded px-3 py-2 w-full mt-2" 
              value={internalImage} 
              onChange={(e)=>setInternalImage(e.target.value)} 
              placeholder="ან შეიყვანე URL ხელით" 
            />
          </div>
          <div className="flex gap-3">
            <div>
              <div className="text-sm text-gray-600">Category</div>
              <select className="border rounded px-3 py-2" value={category} onChange={(e)=>setCategory(e.target.value)}>
                <option value="my-car">my-car</option>
                <option value="friends">friends</option>
                <option value="services">services</option>
              </select>
            </div>
            <label className="flex items-center gap-2 mt-5">
              <input type="checkbox" checked={highlight} onChange={(e)=>setHighlight(e.target.checked)} />
              Highlight
            </label>
          </div>
        </div>

        <div className="space-y-3 border rounded p-4">
          <div className="flex items-center justify-between">
            <div className="font-medium">Items</div>
            <button className="px-3 py-2 border rounded" onClick={addItem}>Add item</button>
          </div>
          <div className="space-y-4">
            {items.map((it, idx) => (
              <div key={it.id} className="border rounded p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <select className="border rounded px-2 py-1" value={it.type} onChange={(e)=>updateItem(it.id, { type: e.target.value as Item["type"] })}>
                    <option value="image">image</option>
                    <option value="video">video</option>
                  </select>
                  <button className="px-2 py-1 border rounded" disabled={idx===0} onClick={()=>moveItem(it.id, -1)}>↑</button>
                  <button className="px-2 py-1 border rounded" disabled={idx===items.length-1} onClick={()=>moveItem(it.id, 1)}>↓</button>
                  <button className="ml-auto px-2 py-1 border rounded text-red-600" onClick={()=>removeItem(it.id)}>Remove</button>
                </div>
                {it.type === 'image' ? (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Image URL ან ატვირთე ფოტო</div>
                    <ImageUpload
                      value={it.uri ? [it.uri] : []}
                      onChange={(urls) => {
                        if (urls.length > 0) {
                          updateItem(it.id, { uri: urls[0] });
                        } else {
                          updateItem(it.id, { uri: "" });
                        }
                      }}
                      maxImages={1}
                      folder="stories"
                      label=""
                    />
                    <input 
                      className="border rounded px-3 py-2 w-full mt-2" 
                      placeholder="ან შეიყვანე URL ხელით" 
                      value={it.uri} 
                      onChange={(e)=>updateItem(it.id, { uri: e.target.value })} 
                    />
                  </div>
                ) : (
                  <input 
                    className="border rounded px-3 py-2 w-full" 
                    placeholder="Video URL" 
                    value={it.uri} 
                    onChange={(e)=>updateItem(it.id, { uri: e.target.value })} 
                  />
                )}
                <input className="border rounded px-3 py-2 w-full" placeholder="Duration (ms)" type="number" value={it.durationMs ?? 6000} onChange={(e)=>updateItem(it.id, { durationMs: Number(e.target.value || 0) })} />
                <textarea className="border rounded px-3 py-2 w-full" placeholder="Caption" value={it.caption || ""} onChange={(e)=>updateItem(it.id, { caption: e.target.value })} />
              </div>
            ))}
            {items.length===0 && <div className="text-sm text-gray-500">No items yet</div>}
          </div>
        </div>
      </div>

      <div>
        <button className="px-4 py-2 bg-black text-white rounded" onClick={save} disabled={loading}>Create</button>
      </div>
    </div>
  );
}


