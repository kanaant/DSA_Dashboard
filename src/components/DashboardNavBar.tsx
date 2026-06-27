"use client";

import { useEffect, useRef, useState } from "react";
import { Archive, ChevronUp, LayoutDashboard, LogOut, Rows3, Search, ServerCog, UserRound } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AGENT_AVATAR, AGENT_NAME } from "@/lib/brand";

interface DashboardNavBarProps {
  adminName: string;
}

export function DashboardNavBar({ adminName }: DashboardNavBarProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenu = (event: MouseEvent) => {
      if (!navRootRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  const [isSeoExpanded, setIsSeoExpanded] = useState(pathname.startsWith("/dashboard/seo"));

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/kanban", label: "Kanban", icon: Rows3 },
    { 
      label: "MaquiFit SEO", 
      icon: Search,
      isCategory: true,
      items: [
        { href: "/dashboard/seo/dashboard", label: "Dashboard" },
        { href: "/dashboard/seo", label: "Meta data" },
        { href: "/dashboard/seo/image", label: "Image SEO" },
        { href: "/dashboard/seo/settings", label: "Settings" },
      ]
    },
    { href: "/dashboard/vault", label: "Vault", icon: Archive },
    { href: "/dashboard/services", label: "Services", icon: ServerCog },
  ];

  return (
    <div ref={navRootRef} className="contents">
      <aside className="fixed bottom-6 left-8 top-6 z-40 hidden w-64 flex-col rounded-[1.75rem] border border-white/10 bg-slate-950/45 p-4 shadow-[0_24px_70px_rgba(2,6,23,0.78),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl lg:flex select-none">
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-[#00d4ff]/60 to-transparent" />
      <div className="pointer-events-none absolute inset-y-10 right-0 w-px bg-gradient-to-b from-transparent via-[#8b5cf6]/35 to-transparent" />
 
      <div className="mb-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 shadow-[0_12px_30px_rgba(2,6,23,0.35)]">
        <div className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-[#00d4ff]/25 bg-[#00d4ff]/10 text-[#00d4ff] shadow-[0_0_18px_rgba(0,212,255,0.16)]">
          <img src={AGENT_AVATAR} alt={`${AGENT_NAME} avatar`} className="h-7 w-7 object-cover rounded-xl filter drop-shadow-[0_0_8px_rgba(0,212,255,0.5)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-[#00d4ff]/60" />
        </div>
        <div className="leading-tight">
          <div className="text-[9px] font-black uppercase tracking-[0.28em] text-slate-500">DARKSENSES</div>
          <div className="text-xs font-extrabold uppercase tracking-[0.08em] text-white">{AGENT_NAME}</div>
        </div>
      </div>

      <nav className="space-y-2 overflow-y-auto" aria-label="Dashboard navigation">
        {navItems.map((item) => {
          if (item.isCategory) {
            const isSeoActive = pathname.startsWith("/dashboard/seo");
            return (
              <div key={item.label} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsSeoExpanded(!isSeoExpanded)}
                  className={`group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,212,255,0.08)] transition-all duration-300 hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/10 ${
                    isSeoActive ? "border-[#00d4ff]/20 bg-[#00d4ff]/5" : "border-white/10 bg-black/20"
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00d4ff]/20 bg-slate-950/70 text-[#00d4ff] transition-colors group-hover:text-[#c084fc]">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="flex-1 text-left">{item.label}</span>
                  <span className={`text-[10px] text-slate-500 transition-transform duration-200 ${isSeoExpanded ? "rotate-180" : ""}`}>▼</span>
                </button>
                
                {isSeoExpanded && (
                  <div className="pl-6 pt-1 pb-1 ml-4 border-l border-white/10 space-y-1 animate-in slide-in-from-top-2 duration-200">
                    {item.items.map((subItem) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.label}
                          href={subItem.href}
                          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all duration-200 ${
                            isSubActive 
                              ? "text-[#00d4ff] bg-[#00d4ff]/10" 
                              : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className="flex-1">{subItem.label}</span>
                          {isSubActive && <span className="h-1.5 w-1.5 rounded-full bg-[#00d4ff] shadow-[0_0_8px_rgba(0,212,255,0.8)]" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-bold text-white shadow-[0_0_24px_rgba(0,212,255,0.08)] transition-all duration-300 hover:border-[#8b5cf6]/40 hover:bg-[#8b5cf6]/10 ${
                active ? "border-[#00d4ff]/20 bg-[#00d4ff]/10" : "border-white/10 bg-black/20"
              }`}
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#00d4ff]/20 bg-slate-950/70 text-[#00d4ff] transition-colors group-hover:text-[#c084fc]">
                <Icon className="h-4 w-4" />
              </span>
              <span className="flex-1">{item.label}</span>
              {active && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.9)]" />}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4">
        {isMenuOpen && (
          <div className="mb-3 overflow-hidden rounded-2xl border border-rose-500/20 bg-[#050816] p-2 shadow-[0_18px_40px_rgba(2,6,23,0.92),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">User Context</div>
            <form action="/api/auth/logout" method="post">
              <Button
                variant="outline"
                type="submit"
                className="h-10 w-full justify-start rounded-xl border-rose-500/20 bg-rose-500/10 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-rose-200 transition-all duration-300 hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-white"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Logout
              </Button>
            </form>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          onContextMenu={(event) => {
            event.preventDefault();
            setIsMenuOpen(true);
          }}
          className="group w-full rounded-2xl border border-white/10 bg-black/30 p-3 text-left shadow-[0_12px_30px_rgba(2,6,23,0.45)] transition-all duration-300 hover:border-[#00d4ff]/30 hover:bg-[#00d4ff]/5"
          aria-expanded={isMenuOpen}
          aria-haspopup="menu"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-[#00d4ff] shadow-[0_0_12px_rgba(0,212,255,0.12)] transition-colors group-hover:text-white">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1 leading-tight">
              <div className="text-[9px] font-black uppercase tracking-[0.24em] text-slate-500">User</div>
              <div className="truncate text-sm font-semibold text-white">{adminName}</div>
            </div>
            <ChevronUp className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${isMenuOpen ? "rotate-180 text-[#00d4ff]" : ""}`} />
          </div>
        </button>
      </div>
      </aside>

      <div className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] z-40 rounded-[1.5rem] border border-white/10 bg-slate-950/75 p-2.5 shadow-[0_20px_55px_rgba(2,6,23,0.86),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl lg:hidden select-none">
        {isMenuOpen && (
          <div className="absolute bottom-full left-0 right-0 mb-3 overflow-hidden rounded-2xl border border-rose-500/20 bg-[#050816] p-2 shadow-[0_18px_40px_rgba(2,6,23,0.92),inset_0_1px_0_rgba(255,255,255,0.06)]">
            <div className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500">User Context</div>
            <form action="/api/auth/logout" method="post">
              <Button
                variant="outline"
                type="submit"
                className="h-10 w-full justify-start rounded-xl border-rose-500/20 bg-rose-500/10 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-rose-200 transition-all duration-300 hover:border-rose-400/40 hover:bg-rose-500/20 hover:text-white"
              >
                <LogOut className="mr-2 h-3.5 w-3.5" />
                Logout
              </Button>
            </form>
          </div>
        )}

        <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1.2fr] gap-2">
          {navItems.map((item) => {
            const href = item.isCategory ? "/dashboard/seo" : item.href!;
            const Icon = item.icon;
            const active = item.isCategory ? pathname.startsWith("/dashboard/seo") : pathname === href;
            return (
              <Link
                key={item.label}
                href={href}
                className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-xs font-bold text-white transition-all duration-300 ${
                  active ? "border-[#00d4ff]/20 bg-[#00d4ff]/10" : "border-white/10 bg-black/30"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[#00d4ff]" : "text-slate-400 group-hover:text-white"}`} />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setIsMenuOpen((open) => !open)}
            onContextMenu={(event) => {
              event.preventDefault();
              setIsMenuOpen(true);
            }}
            className="flex items-center gap-2 rounded-2xl border border-white/10 bg-black/30 px-3 py-3 text-left"
            aria-expanded={isMenuOpen}
            aria-haspopup="menu"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-slate-950/70 text-[#00d4ff]">
              <UserRound className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[8px] font-black uppercase tracking-[0.24em] text-slate-500">User</span>
              <span className="block truncate text-xs font-semibold text-white">{adminName}</span>
            </span>
            <ChevronUp className={`h-4 w-4 text-slate-500 transition-transform duration-300 ${isMenuOpen ? "rotate-180 text-[#00d4ff]" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
