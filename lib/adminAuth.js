export const ADMIN_COOKIE = "fmlm_admin_auth";

export function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || "fmlm-admin";
}

export async function getAdminToken() {
  const secret = process.env.ADMIN_SESSION_SECRET || getAdminPassword();
  const data = new TextEncoder().encode(`fmlm-admin:${secret}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
