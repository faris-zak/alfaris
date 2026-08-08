import { createClient } from "./supabase/server";

export type Owner = { id: string; email?: string };

export function isDemoMode() {
  return process.env.NEXT_PUBLIC_CV_LAB_DEMO === "true" && process.env.NODE_ENV !== "production";
}

export async function getOwner(): Promise<Owner | null> {
  if (isDemoMode()) return { id: "00000000-0000-4000-8000-000000000001", email: "owner@demo.local" };
  const ownerId = process.env.OWNER_USER_ID;
  if (!ownerId) return null;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getClaims();
    if (error || data?.claims?.sub !== ownerId) return null;
    return { id: data.claims.sub, email: typeof data.claims.email === "string" ? data.claims.email : undefined };
  } catch { return null; }
}

export function isAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const expected = process.env.APP_URL;
  if (expected && origin === new URL(expected).origin) return true;
  return origin === new URL(request.url).origin;
}
