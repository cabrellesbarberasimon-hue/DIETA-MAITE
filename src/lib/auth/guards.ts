import "server-only";
import { redirect } from "next/navigation";
import { getSession, type SessionPayload } from "@/lib/auth/session";

export async function requireUser(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function requireUsuaria(): Promise<SessionPayload> {
  const session = await requireUser();
  if (session.role !== "USUARIA") redirect("/admin");
  return session;
}

export async function requireAdmin(): Promise<SessionPayload> {
  const session = await requireUser();
  if (session.role !== "ADMIN") redirect("/dashboard");
  return session;
}
