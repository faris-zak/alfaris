import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { contentSecurityPolicy } from "@/lib/security-headers";

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === "development");
  // Next reads this request header to nonce its framework/hydration scripts.
  request.headers.set("Content-Security-Policy", policy);
  const response = await updateSession(request);
  response.headers.set("Content-Security-Policy", policy);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico|orbital-grid.png).*)"] };
