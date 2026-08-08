import type { Evidence, TailoredCvDraft } from "./schemas";
import { keywords, matchRequirements } from "./matching";

export function buildDeterministicDraft(jobDescription: string, evidence: Evidence[], role = "Target role"): TailoredCvDraft {
  const match = matchRequirements(jobDescription, evidence);
  const skills = evidence.filter((item) => item.type === "skill").flatMap((item) => (item.tags.length ? item.tags : item.body.includes("·") ? item.body.split("·") : [item.title]).map((name) => ({ name: name.trim(), sourceIds: [item.id] }))).filter((item, index, all) => item.name && all.findIndex((candidate) => candidate.name.toLowerCase() === item.name.toLowerCase()) === index).slice(0, 12);
  const jobTerms = new Set(keywords(jobDescription));
  const asEntries = (type: Evidence["type"], limit: number) => evidence.filter((item) => item.type === type).map((item) => ({ item, score: keywords(`${item.title} ${item.body} ${item.tags.join(" ")}`).filter((term) => jobTerms.has(term)).length })).sort((a, b) => b.score - a.score).slice(0, limit).map(({ item }) => ({ title: item.title, organization: item.meta, bullets: [{ text: item.body.slice(0, 280), sourceIds: [item.id] }] }));
  const strongest = evidence.find((item) => ["summary", "experience", "project"].includes(item.type)) ?? evidence[0];
  return {
    roleRequirements: match.requirements,
    relevanceCoverage: match.relevanceCoverage,
    summary: { text: `Physics student and software builder tailoring verified technical, research, and leadership experience for ${role}.`, sourceIds: [strongest.id] },
    skills,
    education: asEntries("education", 2),
    experience: asEntries("experience", 3),
    projects: asEntries("project", 3),
    warnings: match.requirements.filter((item) => item.status === "gap").map((item) => `No supporting evidence selected for: ${item.text}`),
  };
}
