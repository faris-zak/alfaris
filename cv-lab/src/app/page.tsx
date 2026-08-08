import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getOwner } from "@/lib/auth";

export const dynamic = "force-dynamic";
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await getOwner()) redirect("/lab");
  const params = await searchParams;
  return <LoginForm error={params.error} />;
}
