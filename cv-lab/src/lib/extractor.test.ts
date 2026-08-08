import { describe, expect, it } from "vitest";
// @ts-expect-error JavaScript build extractor intentionally has no declaration file.
import { extractPublicEvidence } from "../../scripts/extract-public-profile.mjs";

describe("portfolio extractor", () => { it("extracts stable records", () => { const result = extractPublicEvidence('<article data-cv-id="project-demo" data-cv-type="project"><h3>Demo</h3><p>Built a factual project.</p><ul class="tag-list"><li>HTML</li></ul></article>'); expect(result[0]).toMatchObject({ id: "project-demo", type: "project", title: "Demo", tags: ["HTML"] }); }); it("rejects duplicates", () => expect(() => extractPublicEvidence('<p data-cv-id="same-id">One</p><p data-cv-id="same-id">Two</p>')).toThrow(/Duplicate/)); });
