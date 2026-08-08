import { NextResponse } from "next/server";
import { getOwner, isAllowedOrigin, isDemoMode } from "@/lib/auth";
import { buildDeterministicDraft } from "@/lib/draft";
import { tailorWithGemini } from "@/lib/gemini";
import { getPublicEvidence } from "@/lib/public-profile";
import { emptyPrivateProfile, mergeEvidence } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { privateProfileSchema, tailorRequestSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export const maxDuration = 40;

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const owner = await getOwner();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const length = Number(request.headers.get("content-length") || "0");
  if (length > 80_000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  const parsed = tailorRequestSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid job brief", details: parsed.error.issues }, { status: 400 });
  let profile = emptyPrivateProfile;
  if (!isDemoMode()) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("career_profiles").select("profile_data").eq("user_id", owner.id).single();
    if (error) return NextResponse.json({ error: "Profile unavailable" }, { status: 503 });
    profile = privateProfileSchema.parse(data.profile_data);
  }
  const merged = mergeEvidence(getPublicEvidence(), profile);
  const selected = merged.filter((item) => parsed.data.selectedEvidenceIds.includes(item.id));
  if (!selected.length) return NextResponse.json({ error: "No valid evidence selected" }, { status: 400 });
  const baseline = buildDeterministicDraft(parsed.data.jobDescription, selected, parsed.data.role);
  if (isDemoMode()) return NextResponse.json({ draft: baseline, provider: "deterministic-demo" });
  try {
    const draft = await tailorWithGemini({ ...parsed.data, evidence: selected, baseline, directIdentifiers: [profile.fullName, "Al-Faris Mujahid AlZakwani", "Al-Faris AlZakwani", "Omani"] });
    return NextResponse.json({ draft, provider: "gemini" });
  } catch (error) {
    const message = error instanceof Error && /abort/i.test(error.name) ? "Tailoring timed out. Try again." : "Tailoring service is unavailable. Your data was not saved.";
    return NextResponse.json({ error: message, baseline }, { status: 503 });
  }
}
