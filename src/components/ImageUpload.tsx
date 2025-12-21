"use client";

import { useState, useRef } from "react";

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dtj9xx4qu";
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "carxapp";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    if (folder) {
      formData.append("folder", folder);
    }
    formData.append("tags", "carappx,admin,web_upload");

    try {
      const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.secure_url || null;
    } catch (error) {
      console.error("Cloudinary upload error:", error);
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
      const url = await uploadToCloudinary(filesToUpload[i]);
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
          <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-gray-400 transition-colors">
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

