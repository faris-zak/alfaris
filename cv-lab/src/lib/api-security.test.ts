import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getOwner: vi.fn(), createClient: vi.fn() }));
vi.mock("./auth", async (original) => ({
  ...await original<typeof import("./auth")>(), getOwner: mocks.getOwner, isDemoMode: () => true,
}));
vi.mock("./supabase/server", () => ({ createClient: mocks.createClient }));
import { GET, PUT } from "../app/api/profile/route";
import { POST } from "../app/api/tailor/route";

afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
describe("API authorization and input boundary", () => {
  it("denies unauthenticated reads and writes before database access", async () => {
    mocks.getOwner.mockResolvedValue(null);
    expect((await GET()).status).toBe(401);
    for (const handler of [PUT, POST]) {
      expect((await handler(new Request("http://localhost/api/profile", {
        method: "POST", headers: { origin: "http://localhost" },
      }))).status).toBe(401);
    }
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
  it("rejects foreign origins before authentication", async () => {
    vi.stubEnv("APP_URL", "https://lab.example");
    for (const handler of [PUT, POST]) {
      expect((await handler(new Request("https://lab.example/api/profile", {
        method: "POST", headers: { origin: "https://attacker.example" },
      }))).status).toBe(403);
    }
    expect(mocks.getOwner).not.toHaveBeenCalled();
  });
  it("returns 400 for malformed authenticated requests on both routes", async () => {
    mocks.getOwner.mockResolvedValue({ id: "owner" });
    for (const handler of [PUT, POST]) {
      const response = await handler(new Request("http://localhost/api/profile", {
        method: "POST", headers: { origin: "http://localhost", "content-type": "application/json" }, body: "{bad",
      }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: "Invalid JSON" });
    }
    expect(mocks.createClient).not.toHaveBeenCalled();
  });
});
