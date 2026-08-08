import { describe, expect, it } from "vitest";
import { atsFilename, createAtsPdf, sanitizeFilenamePart } from "./pdf";
import type { TailoredCvDraft } from "./schemas";

const draft: TailoredCvDraft = { roleRequirements: [{ id: "REQ-01", text: "Software", status: "matched", evidenceIds: ["fact-one"] }], relevanceCoverage: 100, summary: { text: "Physics student and software builder.", sourceIds: ["fact-one"] }, skills: [{ name: "JavaScript", sourceIds: ["fact-one"] }], education: [{ title: "BSc Physics", organization: "Sultan Qaboos University", bullets: [{ text: "Studying mechanics and dynamics.", sourceIds: ["fact-one"] }] }], experience: [], projects: [], warnings: [] };
const profile = { fullName: "Al-Faris Mujahid AlZakwani", email: "owner@example.com", phone: "+968 0000 0000", location: "Muscat, Oman", links: [], privateEvidence: [] };
describe("ATS PDF", () => {
  it.each(["letter", "a4"] as const)("creates one searchable %s page", async (paper) => { const pdf = await createAtsPdf({ profile, draft, company: "SpaceX", role: "Engineer", paper }); expect(pdf.pageCount).toBe(1); expect(pdf.bytes.length).toBeGreaterThan(500); });
  it("blocks overflow", async () => { const huge = { ...draft, projects: Array.from({ length: 5 }, (_, i) => ({ title: `Project ${i}`, bullets: Array.from({ length: 5 }, () => ({ text: "verified technical project work ".repeat(35), sourceIds: ["fact-one"] })) })) }; await expect(createAtsPdf({ profile, draft: huge, company: "A", role: "B", paper: "letter" })).rejects.toThrow("OVERFLOW"); });
  it("sanitizes filenames", () => { expect(sanitizeFilenamePart("SpaceX / Starship", "Company")).toBe("SpaceX_Starship"); expect(atsFilename("SpaceX", "Software Engineer")).toBe("Al-Faris_AlZakwani_SpaceX_Software_Engineer_ATS_CV.pdf"); });
});
