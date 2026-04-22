export const ADMIN_USER_IDS = ["giga", "nabakha", "nikaber", "giorgi"] as const;

export type AdminUserId = (typeof ADMIN_USER_IDS)[number];

export const ADMIN_USER_DISPLAY: Record<AdminUserId, string> = {
  giga: "გიგა",
  nabakha: "ნაბახა",
  nikaber: "ნიკაბერო",
  giorgi: "გიორგი",
};

export function isAdminUserId(value: string): value is AdminUserId {
  return (ADMIN_USER_IDS as readonly string[]).includes(value);
}

export function adminPasswordEnvKey(id: AdminUserId): string {
  switch (id) {
    case "giga":
      return "ADMIN_PASSWORD_GIGA";
    case "nabakha":
      return "ADMIN_PASSWORD_NABAKHA";
    case "nikaber":
      return "ADMIN_PASSWORD_NIKABER";
    case "giorgi":
      return "ADMIN_PASSWORD_GIORGI";
  }
}
