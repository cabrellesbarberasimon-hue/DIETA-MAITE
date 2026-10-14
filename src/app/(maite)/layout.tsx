import Image from "next/image";
import Link from "next/link";
import { requireUsuaria } from "@/lib/auth/guards";
import { LogoutButton } from "@/components/LogoutButton";
import { BottomNav } from "@/components/BottomNav";

export default async function MaiteLayout({ children }: { children: React.ReactNode }) {
  const session = await requireUsuaria();

  return (
    <div className="flex min-h-svh flex-col pb-20">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-50 ring-1 ring-green-100">
            <Image src="/icons/icon-192.png" alt="" width={22} height={22} />
          </span>
          <span className="font-semibold text-slate-900">Hola, {session.name}</span>
        </Link>
        <LogoutButton />
      </header>

      <main className="flex-1 px-4 py-4">{children}</main>

      <BottomNav />
    </div>
  );
}
