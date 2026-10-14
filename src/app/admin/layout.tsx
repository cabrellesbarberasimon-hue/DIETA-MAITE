import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/guards";
import { LogoutButton } from "@/components/LogoutButton";
import { AdminNav } from "@/components/AdminNav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();

  return (
    <div className="flex min-h-svh flex-col bg-slate-50 pb-20 text-slate-900">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/admin" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 ring-1 ring-slate-200">
            <Image src="/icons/icon-192.png" alt="" width={22} height={22} />
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
