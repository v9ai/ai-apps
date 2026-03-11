export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <span className="footer-brand-dot" />
        <span className="footer-brand-title">AI Engineering</span>
      </div>
      <p className="footer-tagline">An AI engineering learning path by Vadim Nicolai</p>
      <div className="footer-bottom">
        <span>{year} All rights reserved.</span>
        <span>Built with Next.js & Radix UI</span>
      </div>
    </footer>
  );
}
