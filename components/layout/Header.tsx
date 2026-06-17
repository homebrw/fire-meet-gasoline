"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export function Header() {
  return (
    <header className="md:hidden sticky top-0 z-30 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 flex items-center justify-between">
      <Link href="/today" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-pink-500">
          <Heart className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold">Famille Sync</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
