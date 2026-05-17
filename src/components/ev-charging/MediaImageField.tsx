"use client";

import { useRef, useState } from "react";
import { uploadImageToCloudinary } from "@/lib/cloudinaryUpload";

type MediaImageFieldProps = {
  label: string;
  hint?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  aspect?: "video" | "square" | "wide";
};

export default function MediaImageField({
  label,
  hint,
  value,
  onChange,
  folder = "carappx/ev-charging",
  aspect = "video",
}: MediaImageFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const aspectClass =
    aspect === "square" ? "aspect-square max-w-[140px]" : aspect === "wide" ? "aspect-[2/1]" : "aspect-video";

  const pickFile = async (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    setUploading(true);
    setErr(null);
    try {
      const url = await uploadImageToCloudinary(file, folder);
      onChange(url);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "ატვირთვა ვერ მოხერხდა");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</label>
        {value ? (
          <button
            type="button"
            className="text-xs text-red-600 hover:underline"
            onClick={() => onChange("")}
          >
            წაშლა
          </button>
        ) : null}
      </div>
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}

      {value ? (
        <div className={`relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 ${aspectClass}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div
          className={`rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center text-gray-500 text-sm cursor-pointer hover:border-emerald-500 ${aspectClass} min-h-[100px]`}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? "იტვირთება…" : "+ სურათის ატვირთვა"}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        disabled={uploading}
        onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
      />

      <div className="flex gap-2">
        <input
          type="url"
          placeholder="ან ჩასვი URL"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-900 text-sm"
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm whitespace-nowrap disabled:opacity-50"
        >
          ფაილი
        </button>
      </div>
      {err ? <p className="text-xs text-red-600">{err}</p> : null}
    </div>
  );
}
