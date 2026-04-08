import Link from "next/link";
import { CATEGORIES, CATEGORY_META } from "@/lib/articles";

interface FooterProps {
  lessonCount?: number;
  domainCount?: number;
  readingHours?: number;
}

export function Footer({ lessonCount, domainCount, readingHours }: FooterProps) {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-glow" aria-hidden="true" />
      <div className="footer-top-line" aria-hidden="true" />

      {/* Quick stats */}
      {lessonCount != null && domainCount != null && readingHours != null && (
        <div className="footer-stats">
          <div className="footer-stat">
            <span className="footer-stat-number">{lessonCount}</span>
            <span className="footer-stat-label">Lessons</span>
          </div>
          <div className="footer-stat">
            <span className="footer-stat-number">{domainCount}</span>
            <span className="footer-stat-label">Domains</span>
          </div>
          <div className="footer-stat">
            <span className="footer-stat-number">{readingHours}h</span>
            <span className="footer-stat-label">Reading</span>
          </div>
        </div>
      )}

      <div className="footer-cats">
        {CATEGORIES.map(([, , name]) => {
          const meta = CATEGORY_META[name];
          if (!meta) return null;
          return (
            <Link key={name} href={`/#cat-${meta.slug}`} className="footer-cat-link" aria-label={name}>
              <span>{meta.icon}</span> {name}
            </Link>
          );
        })}
      </div>
      <div className="footer-brand">
        <span className="footer-brand-dot" />
        <span className="footer-brand-title">AI Engineering</span>
      </div>
      <p className="footer-tagline">A deep-dive learning path for junior AI engineers — by Vadim Nicolai</p>
      <div className="footer-bottom">
        <span>&copy; {year} All rights reserved.</span>
        <span>Built with Next.js &amp; Radix UI</span>
      </div>
    </footer>
  );
}
