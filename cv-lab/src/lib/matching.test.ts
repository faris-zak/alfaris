import { describe, expect, it } from "vitest";
import { extractRequirements, keywords, matchRequirements } from "./matching";
import type { Evidence } from "./schemas";

const evidence: Evidence[] = [{ id: "skill-javascript", type: "skill", title: "Digital building", body: "HTML CSS JavaScript responsive design", tags: ["JavaScript", "responsive design"], visibility: "public" }];
describe("deterministic relevance matching", () => {
  it("matches shared terms and preserves gaps", () => { const result = matchRequirements("- Build responsive JavaScript interfaces for flight software teams.\n- Operate industrial welding systems and certify pressure vessels.\n- Collaborate with engineers to document reliable systems.", evidence); expect(result.requirements).toHaveLength(3); expect(result.requirements[0].status).toBe("matched"); expect(result.requirements[1].status).toBe("gap"); });
  it("removes filler words", () => expect(keywords("The ability to work with JavaScript")).toContain("javascript"));
  it("caps requirements", () => expect(extractRequirements(Array.from({ length: 20 }, (_, i) => `- Requirement ${i} needs technical aerospace system experience.`).join("\n"))).toHaveLength(12));
});
