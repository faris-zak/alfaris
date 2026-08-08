import { z } from "zod";

export const evidenceSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9-]{2,80}$/),
  type: z.enum(["summary", "education", "experience", "project", "skill", "credential", "achievement"]),
  title: z.string().min(1).max(160),
  body: z.string().min(1).max(1600),
  meta: z.string().max(240).optional(),
  tags: z.array(z.string().max(60)).max(24).default([]),
  visibility: z.enum(["public", "private"]),
});

export type Evidence = z.infer<typeof evidenceSchema>;

export const privateProfileSchema = z.object({
  fullName: z.string().max(120).default(""),
  email: z.string().max(180).default(""),
  phone: z.string().max(60).default(""),
  location: z.string().max(160).default(""),
  links: z.array(z.string().max(300)).max(8).default([]),
  privateEvidence: z.array(evidenceSchema.extend({ visibility: z.literal("private") })).max(40).default([]),
});

export type PrivateProfile = z.infer<typeof privateProfileSchema>;

export const tailorRequestSchema = z.object({
  jobDescription: z.string().trim().min(300).max(25_000),
  company: z.string().trim().max(120).optional().default(""),
  role: z.string().trim().max(160).optional().default(""),
  location: z.string().trim().max(160).optional().default(""),
  selectedEvidenceIds: z.array(z.string()).min(1).max(100),
});

const sourcedBulletSchema = z.object({
  text: z.string().min(1).max(320),
  sourceIds: z.array(z.string()).min(1).max(6),
});

const cvEntrySchema = z.object({
  title: z.string().min(1).max(140),
  organization: z.string().max(140).optional(),
  period: z.string().max(80).optional(),
  bullets: z.array(sourcedBulletSchema).min(1).max(5),
});

export const requirementSchema = z.object({
  id: z.string().min(1).max(30),
  text: z.string().min(1).max(360),
  status: z.enum(["matched", "gap"]),
  evidenceIds: z.array(z.string()).max(8),
});

export const tailoredCvDraftSchema = z.object({
  roleRequirements: z.array(requirementSchema).min(1).max(14),
  relevanceCoverage: z.number().int().min(0).max(100),
  summary: sourcedBulletSchema,
  skills: z.array(z.object({ name: z.string().min(1).max(80), sourceIds: z.array(z.string()).min(1).max(5) })).max(18),
  education: z.array(cvEntrySchema).max(3),
  experience: z.array(cvEntrySchema).max(5),
  projects: z.array(cvEntrySchema).max(5),
  warnings: z.array(z.string().min(1).max(300)).max(12),
});

export type TailoredCvDraft = z.infer<typeof tailoredCvDraftSchema>;

export function validateEvidenceReferences(draft: TailoredCvDraft, allowedIds: Set<string>, evidenceById?: Map<string, Evidence>) {
  const refs = [
    ...draft.summary.sourceIds,
    ...draft.skills.flatMap((item) => item.sourceIds),
    ...draft.education.flatMap((entry) => entry.bullets.flatMap((bullet) => bullet.sourceIds)),
    ...draft.experience.flatMap((entry) => entry.bullets.flatMap((bullet) => bullet.sourceIds)),
    ...draft.projects.flatMap((entry) => entry.bullets.flatMap((bullet) => bullet.sourceIds)),
    ...draft.roleRequirements.flatMap((requirement) => requirement.evidenceIds),
  ];
  const unknown = [...new Set(refs.filter((id) => !allowedIds.has(id)))];
  if (unknown.length) throw new Error(`Draft referenced unknown evidence: ${unknown.join(", ")}`);
  if (evidenceById) {
    const claims = [draft.summary, ...draft.education.flatMap((entry) => entry.bullets), ...draft.experience.flatMap((entry) => entry.bullets), ...draft.projects.flatMap((entry) => entry.bullets)];
    for (const claim of claims) {
      const sourceText = claim.sourceIds.map((id) => evidenceById.get(id)).filter(Boolean).map((item) => `${item?.title} ${item?.body} ${item?.meta || ""} ${item?.tags.join(" ")}`).join(" ");
      const unsupportedNumbers = [...new Set(claim.text.match(/\b\d+(?:[.,]\d+)?%?\b/g) || [])].filter((value) => !sourceText.includes(value));
      if (unsupportedNumbers.length) throw new Error(`Draft introduced unsupported metrics: ${unsupportedNumbers.join(", ")}`);
    }
  }
  return draft;
}
