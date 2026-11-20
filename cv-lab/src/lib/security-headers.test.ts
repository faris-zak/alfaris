import { afterEach, expect, it, vi } from "vitest";
import { contentSecurityPolicy } from "./security-headers";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
it("requires a nonce for inline production scripts", () => {
  const policy = contentSecurityPolicy("test-nonce");
  const scripts = policy.split("; ").find((part) => part.startsWith("script-src"));
  expect(scripts).toContain("'nonce-test-nonce'");
  expect(scripts).not.toMatch(/unsafe-inline|unsafe-eval/);
  expect(policy).toContain("object-src 'none'");
});
it("secures production session cookies without breaking browser refresh", async () => {
  vi.stubEnv("NODE_ENV", "production");
  const { cookieOptions } = await import("./supabase/cookie-options");
  expect(cookieOptions).toMatchObject({ secure: true, sameSite: "lax", path: "/" });
});
