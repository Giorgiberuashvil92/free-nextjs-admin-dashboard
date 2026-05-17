const CLOUDINARY_CLOUD_NAME =
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dtj9xx4qu";
const CLOUDINARY_UPLOAD_PRESET =
  process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "carxapp";
const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

export async function uploadImageToCloudinary(
  file: File,
  folder = "carappx/ev-charging",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  if (folder) formData.append("folder", folder);
  formData.append("tags", "carappx,admin,ev-charging");

  const response = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    throw new Error(`ატვირთვა ვერ მოხერხდა: ${response.statusText}`);
  }
  const result = (await response.json()) as { secure_url?: string };
  if (!result.secure_url) throw new Error("URL არ მივიღეთ");
  return result.secure_url;
}
