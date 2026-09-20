"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNav() {
  const pathname = usePathname();
  const match = pathname.match(/^\/admin\/usuarias\/([^/]+)/);
  const userId = match?.[1];

  const tabs =
    userId && userId !== "nueva"
      ? [
          { href: "/admin", label: "Personas", icon: "👥" },
          { href: `/admin/usuarias/${userId}`, label: "Resumen", icon: "📊" },
          { href: `/admin/usuarias/${userId}/historial`, label: "Historial", icon: "📅" },
          { href: `/admin/usuarias/${userId}/plan`, label: "Plan", icon: "📝" },
        ]
      : [
          { href: "/admin", label: "Personas", icon: "👥" },
          { href: "/admin/alimentos", label: "Alimentos", icon: "🍎" },
          { href: "/admin/platos", label: "Platos", icon: "🍽️" },
        ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-md">
        {tabs.map((tab) => {
          const active = tab.href === "/admin" ? pathname === "/admin" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium ${
                active ? "text-green-700" : "text-slate-400"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
