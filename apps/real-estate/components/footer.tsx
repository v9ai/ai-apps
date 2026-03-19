import Link from "next/link";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/analyzer", label: "Analyzer" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/trends", label: "Trends" },
  { href: "/portfolio", label: "Portfolio" },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <span className="footer-brand-dot" />
        <span className="footer-brand-title">PropertyAI</span>
        <span className="footer-version">v0.1 beta</span>
      </div>
      <p className="footer-tagline">
        AI-powered real estate valuation and market intelligence
      </p>

      <nav className="footer-nav">
        {NAV_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="footer-nav-link">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="footer-bottom">
        <span>Powered by DeepSeek AI</span>
        <span className="footer-separator" aria-hidden="true" />
        <span>Markets: Moldova &middot; Romania</span>
        <span className="footer-separator" aria-hidden="true" />
        <span>&copy; {year} Vadim Nicolai</span>
      </div>
    </footer>
  );
}
