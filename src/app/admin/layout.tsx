import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { LogoutButton } from "@/components/LogoutButton";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-svh flex-col pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-sm font-bold text-white">
            S
          </span>
          <span className="font-semibold text-slate-900">{session.name} · admin</span>
        </Link>
        <LogoutButton />
      </header>

      <main className="flex-1 px-4 py-4">{children}</main>

      <AdminNav />
    </div>
  );
}
