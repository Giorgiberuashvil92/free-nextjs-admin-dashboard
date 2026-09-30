"use client";

import { useState, useRef, useCallback } from "react";

function resolveUploadBackendUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "::1"
    ) {
      // ლოკალური marte-backend (PORT=3002) — production-ზე uploads შეიძლება ჯერ არ იყოს
      return (
        process.env.NEXT_PUBLIC_LOCAL_BACKEND_URL || "http://127.0.0.1:3002"
      );
    }
  }
  return (
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "https://marte-backend-production.up.railway.app"
  );
}

interface ImageUploadProps {
  value: string[];
  onChange: (urls: string[]) => void;
  maxImages?: number;
  folder?: string;
  label?: string;
}

export default function ImageUpload({
  value = [],
  onChange,
  maxImages = 5,
  folder = "carappx",
  label = "სურათები",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToR2 = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    if (folder) {
      formData.append("folder", folder);
    }

    try {
      const response = await fetch(
        `${resolveUploadBackendUrl()}/uploads/images`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result?.data?.url || result?.url || result?.secure_url || null;
    } catch (error) {
      console.error("R2 upload error:", error);
      return null;
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = maxImages - value.length;
    if (remainingSlots <= 0) {
      alert(`მაქსიმუმ ${maxImages} სურათის ატვირთვა შეგიძლიათ`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    setUploading(true);
    setUploadProgress("სურათების ატვირთვა...");

    const uploadedUrls: string[] = [];

    for (let i = 0; i < filesToUpload.length; i++) {
      setUploadProgress(`ატვირთვა ${i + 1}/${filesToUpload.length}...`);
      const url = await uploadToR2(filesToUpload[i]);
      if (url) {
        uploadedUrls.push(url);
      }
    }

    setUploading(false);
    setUploadProgress("");
    onChange([...value, ...uploadedUrls]);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (!files || files.length === 0) return;

      const remainingSlots = maxImages - value.length;
      if (remainingSlots <= 0) {
        alert(`მაქსიმუმ ${maxImages} სურათის ატვირთვა შეგიძლიათ`);
        return;
      }

      const filesToUpload = Array.from(files).slice(0, remainingSlots).filter((f) => f.type.startsWith("image/"));
      if (filesToUpload.length === 0) {
        alert("გთხოვთ ატვირთოთ მხოლოდ სურათები");
        return;
      }

      setUploading(true);
      setUploadProgress("სურათების ატვირთვა...");

      const uploadedUrls: string[] = [];

      for (let i = 0; i < filesToUpload.length; i++) {
        setUploadProgress(`ატვირთვა ${i + 1}/${filesToUpload.length}...`);
        const url = await uploadToR2(filesToUpload[i]);
        if (url) {
          uploadedUrls.push(url);
        }
      }

      setUploading(false);
      setUploadProgress("");
      onChange([...value, ...uploadedUrls]);
    },
    [value, maxImages, onChange]
  );

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">{label}</label>

      <div className="flex flex-wrap gap-3">
        {value.map((url, index) => (
          <div key={index} className="relative group">
            <img
              src={url}
              alt={`Upload ${index + 1}`}
              className="w-24 h-24 object-cover rounded border"
            />
            <button
              type="button"
              onClick={() => handleRemove(index)}
              className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        ))}

        {value.length < maxImages && (
          <label
            className={`w-24 h-24 border-2 border-dashed rounded flex items-center justify-center cursor-pointer transition-colors ${
              isDragging
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300 hover:border-gray-400"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploading}
            />
            {uploading ? (
              <div className="text-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto mb-1"></div>
                <div className="text-xs text-gray-500">{uploadProgress}</div>
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <div className="text-2xl mb-1">+</div>
                <div className="text-xs">დამატება</div>
                <div className="text-xs mt-1">ან გადაიტანე</div>
              </div>
            )}
          </label>
        )}
      </div>

      {value.length > 0 && (
        <div className="text-xs text-gray-500">
          {value.length} / {maxImages} სურათი
        </div>
      )}
    </div>
  );
}

