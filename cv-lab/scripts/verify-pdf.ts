import { mkdir, writeFile } from "node:fs/promises";
import { createAtsPdf } from "../src/lib/pdf.ts";
import type { PrivateProfile, TailoredCvDraft } from "../src/lib/schemas.ts";

const profile: PrivateProfile = { fullName: "Al-Faris Mujahid AlZakwani", email: "alfaris@example.com", phone: "+968 9000 0000", location: "Muscat, Oman", links: ["linkedin.com/in/alfaris"], privateEvidence: [] };
const draft: TailoredCvDraft = {
  roleRequirements: [{ id: "REQ-01", text: "Build responsive software", status: "matched", evidenceIds: ["project-portfolio"] }], relevanceCoverage: 83,
  summary: { text: "Physics student and software builder combining aerospace curiosity, responsive front-end development, research, and technical leadership.", sourceIds: ["summary-professional-profile"] },
  skills: ["JavaScript", "HTML", "CSS", "Responsive design", "Git and GitHub", "Orbital mechanics", "Research analysis", "Leadership"].map((name) => ({ name, sourceIds: ["skills-digital"] })),
  education: [{ title: "BSc Physics", organization: "Sultan Qaboos University", period: "2025–Present", bullets: [{ text: "Building a scientific foundation in mechanics, dynamics, motion, forces, and space systems.", sourceIds: ["education-squ-physics"] }] }],
  experience: [
    { title: "Open Source Group Member and Workshop Presenter", organization: "Sultan Qaboos University", period: "2025", bullets: [{ text: "Delivered practical HTML and CSS workshops through the Open Source Initiative.", sourceIds: ["experience-squ-open-source"] }] },
    { title: "Software Engineer", organization: "Solvex", bullets: [{ text: "Integrated AI into startup work and its website and created a 3D simulation for a smart agricultural tile concept.", sourceIds: ["experience-solvex"] }] },
    { title: "Retail and Technical Support", organization: "City of Technical Experts", period: "2024", bullets: [{ text: "Supported customers and handled technical equipment in a practical retail environment.", sourceIds: ["experience-city-technical-experts"] }] },
  ],
  projects: [
    { title: "Space Research Initiative", bullets: [{ text: "Explored Low Earth Orbit debris through orbital mechanics, debris mitigation, satellite interception feasibility, and aerospace problem framing.", sourceIds: ["project-space-research"] }] },
    { title: "Personal Portfolio", bullets: [{ text: "Built a responsive mission record for technical work, achievements, and an evolving astronaut trajectory.", sourceIds: ["project-portfolio"] }] },
    { title: "AI Family Corp", bullets: [{ text: "Co-founded a family technology initiative focused on practical problem-solving and meaningful use of artificial intelligence.", sourceIds: ["project-ai-family-corp"] }] },
  ], warnings: [],
};

await mkdir(new URL("../tmp/pdf-qa/", import.meta.url), { recursive: true });
const result = await createAtsPdf({ profile, draft, company: "SpaceX", role: "Software Engineer", paper: "letter" });
await writeFile(new URL("../tmp/pdf-qa/Al-Faris_AlZakwani_SpaceX_Software_Engineer_ATS_CV.pdf", import.meta.url), result.bytes);
const a4Result = await createAtsPdf({ profile, draft, company: "SpaceX", role: "Software Engineer", paper: "a4" });
await writeFile(new URL("../tmp/pdf-qa/Al-Faris_AlZakwani_SpaceX_Software_Engineer_ATS_CV_A4.pdf", import.meta.url), a4Result.bytes);
console.log(JSON.stringify({ letter: { pageCount: result.pageCount, remainingSpace: result.remainingSpace, bytes: result.bytes.length }, a4: { pageCount: a4Result.pageCount, remainingSpace: a4Result.remainingSpace, bytes: a4Result.bytes.length } }));
