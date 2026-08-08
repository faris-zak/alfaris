import { redirect } from "next/navigation";
import { LabWorkspace } from "@/components/lab-workspace";
import { getOwner } from "@/lib/auth";
import { getPublicEvidence } from "@/lib/public-profile";

export const dynamic = "force-dynamic";
export default async function LabPage() {
  const owner = await getOwner(); if (!owner) redirect("/");
  return <LabWorkspace publicEvidence={getPublicEvidence()} ownerEmail={owner.email} />;
}
