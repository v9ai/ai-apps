import Link from "next/link";

export function Topbar({ paperCount }: { paperCount: number }) {
  return (
    <div className="yc-topbar">
      <Link href="/">
        <span className="yc-topbar-logo" />
        REAL ESTATE AI RESEARCH
      </Link>
      <span className="yc-topbar-count">
        {paperCount} papers
      </span>
    </div>
  );
}
