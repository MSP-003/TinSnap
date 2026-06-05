"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ScanLine, Settings, Shield } from "lucide-react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/results", label: "Results" },
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ScanLine className="h-4 w-4" />
          </div>
          <span className="text-base">TinSnap</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === item.href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className={`rounded-md p-2 transition-colors ${
              pathname === "/settings"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Settings"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <Link
            href="/privacy"
            className={`rounded-md p-2 transition-colors ${
              pathname === "/privacy"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-label="Privacy"
          >
            <Shield className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
