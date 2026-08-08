import type { Evidence } from "./schemas";

const STOP = new Set("a an and are as at be by for from has have in into is it of on or our that the their this to with will you your preferred required ability experience knowledge strong work working".split(" "));

export function keywords(text: string) {
  return [...new Set(text.toLowerCase().replace(/[^a-z0-9+#.\s-]/g, " ").split(/\s+/).filter((word) => word.length > 2 && !STOP.has(word)))];
}

export function extractRequirements(description: string) {
  const lines = description.split(/\r?\n/).map((line) => line.replace(/^\s*[-*•\d.)]+\s*/, "").trim()).filter((line) => line.length >= 24 && line.length <= 360);
  const source = lines.length >= 3 ? lines : description.split(/(?<=[.!?])\s+/).map((line) => line.trim()).filter((line) => line.length >= 24);
  return source.slice(0, 12).map((text, index) => ({ id: `REQ-${String(index + 1).padStart(2, "0")}`, text }));
}

export function matchRequirements(description: string, evidence: Evidence[]) {
  const requirements = extractRequirements(description);
  const rows = requirements.map((requirement) => {
    const needed = new Set(keywords(requirement.text));
    const ranked = evidence.map((item) => {
      const haystack = new Set(keywords(`${item.title} ${item.body} ${item.tags.join(" ")}`));
      const hits = [...needed].filter((term) => haystack.has(term)).length;
      return { id: item.id, score: needed.size ? hits / needed.size : 0 };
    }).filter((item) => item.score >= 0.12).sort((a, b) => b.score - a.score).slice(0, 3);
    return { ...requirement, status: ranked.length ? "matched" as const : "gap" as const, evidenceIds: ranked.map((item) => item.id) };
  });
  const matched = rows.filter((row) => row.status === "matched").length;
  return { requirements: rows, relevanceCoverage: rows.length ? Math.round((matched / rows.length) * 100) : 0 };
}
