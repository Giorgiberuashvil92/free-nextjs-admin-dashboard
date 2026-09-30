function resolveUploadBackendUrl(): string {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host === "::1"
    ) {
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

export async function uploadImageToCloudinary(
  file: File,
  folder = "carappx/ev-charging",
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  if (folder) formData.append("folder", folder);

  const response = await fetch(
    `${resolveUploadBackendUrl()}/uploads/images`,
    {
      method: "POST",
      body: formData,
    },
  );
  if (!response.ok) {
    throw new Error(`ატვირთვა ვერ მოხერხდა: ${response.statusText}`);
  }
  const result = (await response.json()) as {
    data?: { url?: string };
    url?: string;
    secure_url?: string;
  };
  const url = result.data?.url || result.url || result.secure_url;
  if (!url) throw new Error("URL არ მივიღეთ");
  return url;
}
