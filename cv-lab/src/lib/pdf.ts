import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { PrivateProfile, TailoredCvDraft } from "./schemas";

export type PaperSize = "letter" | "a4";
const SIZES: Record<PaperSize, [number, number]> = { letter: [612, 792], a4: [595.28, 841.89] };
const MARGIN = 40;
const BODY_SIZE = 10;
const LEADING = 12.2;

export function sanitizeFilenamePart(value: string, fallback: string) {
  const clean = value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
  return clean || fallback;
}

export function atsFilename(company: string, role: string) {
  return `Al-Faris_AlZakwani_${sanitizeFilenamePart(company, "Company")}_${sanitizeFilenamePart(role, "Role")}_ATS_CV.pdf`;
}

function wrap(text: string, maxWidth: number, measure: (text: string) => number) {
  const words = text.trim().split(/\s+/); const lines: string[] = []; let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && measure(next) > maxWidth) { lines.push(line); line = word; } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function createAtsPdf(args: { profile: PrivateProfile; draft: TailoredCvDraft; company: string; role: string; paper: PaperSize }) {
  const doc = await PDFDocument.create();
  doc.setTitle(`${args.profile.fullName || "Al-Faris AlZakwani"} - ${args.role} ATS CV`);
  doc.setAuthor(args.profile.fullName || "Al-Faris Mujahid AlZakwani");
  const page = doc.addPage(SIZES[args.paper]); const { width, height } = page.getSize();
  const regular = await doc.embedFont(StandardFonts.Helvetica); const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let y = height - MARGIN;
  const draw = (text: string, options: { size?: number; isBold?: boolean; indent?: number; after?: number } = {}) => {
    const size = options.size ?? BODY_SIZE; const font = options.isBold ? bold : regular; const indent = options.indent ?? 0;
    const lines = wrap(text, width - MARGIN * 2 - indent, (value) => font.widthOfTextAtSize(value, size));
    for (const line of lines) { page.drawText(line, { x: MARGIN + indent, y, size, font, color: rgb(0.07, 0.09, 0.12) }); y -= size === BODY_SIZE ? LEADING : size + 2; }
    y -= options.after ?? 0;
  };
  const heading = (text: string) => { y -= 3; draw(text.toUpperCase(), { size: 10.5, isBold: true, after: 2 }); };
  const entry = (item: TailoredCvDraft["experience"][number]) => {
    draw([item.title, item.organization, item.period].filter(Boolean).join(" | "), { isBold: true, after: 1 });
    item.bullets.forEach((bullet) => draw(`• ${bullet.text}`, { indent: 9 }));
  };
  draw(args.profile.fullName || "Al-Faris Mujahid AlZakwani", { size: 16, isBold: true, after: 1 });
  draw([args.profile.email, args.profile.phone, args.profile.location, ...args.profile.links].filter(Boolean).join(" | "), { size: 10, after: 4 });
  heading("Summary"); draw(args.draft.summary.text);
  heading("Education"); args.draft.education.forEach(entry);
  heading("Experience"); args.draft.experience.forEach(entry);
  heading("Projects"); args.draft.projects.forEach(entry);
  heading("Skills"); draw(args.draft.skills.map((skill) => skill.name).join(" • "));
  if (y < MARGIN) throw new Error("OVERFLOW");
  return { bytes: await doc.save(), pageCount: doc.getPageCount(), remainingSpace: y - MARGIN };
}

export async function downloadAtsPdf(args: Parameters<typeof createAtsPdf>[0]) {
  const result = await createAtsPdf(args);
  const blob = new Blob([new Uint8Array(result.bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = atsFilename(args.company, args.role); link.click(); URL.revokeObjectURL(url);
  return result;
}
