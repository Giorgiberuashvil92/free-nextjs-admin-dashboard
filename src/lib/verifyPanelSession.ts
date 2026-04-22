import { getPanelBackendBaseUrl } from "./panelAuthConfig";

export async function verifyPanelSessionWithBackend(
  token: string | undefined,
): Promise<boolean> {
  if (!token?.trim()) {
    return false;
  }
  const base = getPanelBackendBaseUrl();
  try {
    const res = await fetch(`${base}/panel-admin/session`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
