import { readFile, mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import * as cheerio from "cheerio";

export function extractPublicEvidence(html) {
  const $ = cheerio.load(html);
  const evidence = [];
  $("[data-cv-id]").each((_, element) => {
    const node = $(element);
    const id = node.attr("data-cv-id");
    const type = node.attr("data-cv-type") || "achievement";
    const title = node.find("h1,h2,h3,strong").first().text().replace(/\s+/g, " ").trim() || node.attr("data-cv-title") || id;
    const paragraphs = node.find("p").filter((__, p) => !$(p).hasClass("project__meta")).map((__, p) => $(p).text().replace(/\s+/g, " ").trim()).get().filter(Boolean);
    const body = (paragraphs.join(" ") || node.text()).replace(/\s+/g, " ").trim();
    const meta = node.find(".project__meta,time").first().text().replace(/\s+/g, " ").trim() || undefined;
    const tags = node.find(".tag-list li").map((__, tag) => $(tag).text().trim()).get();
    evidence.push({ id, type, title, body, ...(meta ? { meta } : {}), tags, visibility: "public" });
  });
  const ids = evidence.map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error("Duplicate data-cv-id found in index.html");
  if (!evidence.length) throw new Error("No public CV evidence found in index.html");
  return evidence;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const source = fileURLToPath(new URL("../../index.html", import.meta.url));
  const output = fileURLToPath(new URL("../src/generated/public-profile.json", import.meta.url));
  const evidence = extractPublicEvidence(await readFile(source, "utf8"));
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  console.log(`Extracted ${evidence.length} public evidence records.`);
}
