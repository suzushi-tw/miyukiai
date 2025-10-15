"use client";

import { useState, useEffect } from "react";
import { ThemeSwitcher } from "@/components/kibo-ui/theme-switcher";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Github, Star } from "lucide-react";
import Link from "next/link";

export function BottomBar() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 100);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex items-center justify-center pb-6 px-4">
        <div className="bg-background/80 backdrop-blur-lg rounded-full shadow-lg border border-border/50 px-3 py-2 hover:shadow-xl transition-all hover:scale-105">
          <div className="flex items-center gap-3">
            {/* GitHub Link */}
            <Link
              href="https://github.com/suzushi-tw/miyukiai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-secondary/50 transition-all group"
              title="Star on GitHub"
            >
              <Github className="h-4 w-4 group-hover:scale-110 transition-transform" />
              <span className="hidden sm:inline text-xs">Star</span>
              <Star className="h-3.5 w-3.5 hidden sm:inline group-hover:fill-yellow-400 group-hover:text-yellow-400 transition-all" />
            </Link>

            {/* Divider */}
            <div className="h-6 w-px bg-border/50" />

            {/* Theme Switcher */}
            <ThemeSwitcher
              value={theme as "light" | "dark" | "system"}
              onChange={(newTheme) => setTheme(newTheme)}
              className="bg-transparent ring-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
