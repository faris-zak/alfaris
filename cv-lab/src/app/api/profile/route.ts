import { NextResponse } from "next/server";
import { getOwner, isAllowedOrigin, isDemoMode } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { emptyPrivateProfile } from "@/lib/profile";
import { privateProfileSchema } from "@/lib/schemas";

export const dynamic = "force-dynamic";
export async function GET() {
  const owner = await getOwner();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (isDemoMode()) return NextResponse.json({ profile: { ...emptyPrivateProfile, fullName: "Al-Faris Mujahid AlZakwani", email: "owner@example.com", location: "Muscat, Oman" }, version: 1 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("career_profiles").select("profile_data, version").eq("user_id", owner.id).single();
  if (error) return NextResponse.json({ error: "Profile unavailable" }, { status: 503 });
  return NextResponse.json({ profile: privateProfileSchema.parse(data.profile_data), version: data.version });
}

export async function PUT(request: Request) {
  if (!isAllowedOrigin(request)) return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const owner = await getOwner();
  if (!owner) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = privateProfileSchema.safeParse(await request.json());
  if (!body.success) return NextResponse.json({ error: "Invalid profile", details: body.error.issues }, { status: 400 });
  if (isDemoMode()) return NextResponse.json({ profile: body.data, version: 2 });
  const supabase = await createClient();
  const { data, error } = await supabase.from("career_profiles").update({ profile_data: body.data }).eq("user_id", owner.id).select("profile_data, version").single();
  if (error) return NextResponse.json({ error: "Profile could not be saved" }, { status: 503 });
  return NextResponse.json({ profile: data.profile_data, version: data.version });
}
