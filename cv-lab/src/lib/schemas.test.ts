import { describe, expect, it } from "vitest";
import { tailoredCvDraftSchema, validateEvidenceReferences } from "./schemas";

const valid = tailoredCvDraftSchema.parse({ roleRequirements: [{ id: "REQ-01", text: "Build software", status: "matched", evidenceIds: ["fact-one"] }], relevanceCoverage: 100, summary: { text: "Software builder", sourceIds: ["fact-one"] }, skills: [], education: [], experience: [], projects: [], warnings: [] });
describe("draft evidence validation", () => { it("accepts known evidence", () => expect(validateEvidenceReferences(valid, new Set(["fact-one"]))).toEqual(valid)); it("rejects invented ids", () => expect(() => validateEvidenceReferences(valid, new Set(["another-fact"]))).toThrow(/unknown evidence/)); });

it("rejects fabricated metrics even when the evidence id exists", () => {
  const invented = { ...valid, summary: { text: "Improved reliability by 42%", sourceIds: ["fact-one"] } };
  const evidence = new Map([["fact-one", { id: "fact-one", type: "project" as const, title: "Project", body: "Built a reliable interface.", tags: [], visibility: "public" as const }]]);
  expect(() => validateEvidenceReferences(invented, new Set(["fact-one"]), evidence)).toThrow(/unsupported metrics/);
});
