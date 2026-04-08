"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";

export function Topbar({ lessonCount }: { lessonCount?: number }) {
  const { data: session } = useSession();
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState<{ icon: string; name: string } | null>(null);
  const [scrolledPast, setScrolledPast] = useState(false);

  /* Listen for active-category broadcasts from CategoryGrid */
  useEffect(() => {
    function onCategoryChange(e: CustomEvent<{ icon: string; name: string } | null>) {
      setActiveCategory(e.detail);
    }
    window.addEventListener("active-category-change", onCategoryChange as EventListener);
    return () => window.removeEventListener("active-category-change", onCategoryChange as EventListener);
  }, []);

  /* Detect when user scrolls past the learning-path / hero area + update scroll progress */
  useEffect(() => {
    function onScroll() {
      const threshold = window.innerHeight * 0.6;
      setScrolledPast(window.scrollY > threshold);

      /* Scroll progress (0 to 1) for the topbar progress bar */
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? Math.min(window.scrollY / docHeight, 1) : 0;
      document.documentElement.style.setProperty("--scroll-progress", String(progress));
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const focusSearch = useCallback(() => {
    const input = document.querySelector<HTMLInputElement>(".yc-search input");
    if (input) {
      input.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => input.focus(), 400);
    }
  }, []);

  return (
    <nav className={`yc-topbar${scrolledPast ? " yc-topbar--scrolled" : ""}`} aria-label="Main navigation">
      <Link href="/">
        <span className="yc-topbar-logo" />
        AI ENGINEERING
      </Link>

      {/* Active category breadcrumb — visible when scrolled into content */}
      {scrolledPast && activeCategory && (
        <span className="yc-topbar-breadcrumb">
          <span className="yc-topbar-breadcrumb-sep">/</span>
          <span className="yc-topbar-breadcrumb-icon">{activeCategory.icon}</span>
          {activeCategory.name}
        </span>
      )}

      {!scrolledPast && lessonCount != null && (
        <span className="yc-topbar-count">{lessonCount} lessons</span>
      )}

      <div className="yc-topbar-right">
        <button
          type="button"
          className="yc-topbar-search-trigger"
          aria-label="Search lessons"
          onClick={focusSearch}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <span className="yc-topbar-search-key">K</span>
        </button>
        {session?.user ? (
          <div className="yc-topbar-user">
            <Link href="/applications" className="yc-topbar-signin">
              Applications
            </Link>
            <span className="yc-topbar-username">{session.user.name}</span>
            <button
              type="button"
              aria-label="Sign out"
              className="yc-topbar-signin"
              onClick={() => signOut().then(() => router.push("/login"))}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <Link href="/login" className="yc-topbar-signin">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
