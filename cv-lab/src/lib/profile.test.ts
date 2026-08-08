import { describe, expect, it } from "vitest";
import { mergeEvidence, stripDirectIdentifiers } from "./profile";

describe("profile privacy", () => {
  it("removes direct identifiers", () => { const safe = stripDirectIdentifiers({ fullName: "Person", email: "person@example.com", note: "Call +968 9999 9999 or https://private.example" }); expect(safe).not.toHaveProperty("fullName"); expect(safe).not.toHaveProperty("email"); expect(safe.note).not.toContain("9999"); expect(safe.note).not.toContain("https://"); });
  it("removes known names and nationality from nested evidence", () => { const safe = stripDirectIdentifiers({ body: "Al-Faris is an Omani physics student." }, ["Al-Faris", "Omani"]); expect(safe.body).not.toContain("Al-Faris"); expect(safe.body).not.toContain("Omani"); });
  it("prefers public duplicates", () => { const shared = { id: "fact-one", type: "skill" as const, title: "One", body: "Public", tags: [], visibility: "public" as const }; const result = mergeEvidence([shared], { fullName: "", email: "", phone: "", location: "", links: [], privateEvidence: [{ ...shared, body: "Private", visibility: "private" }] }); expect(result).toHaveLength(1); expect(result[0].body).toBe("Public"); });
});
