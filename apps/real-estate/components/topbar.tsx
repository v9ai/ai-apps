import Link from "next/link";

export function Topbar() {
  return (
    <div className="yc-topbar">
      <Link href="/">
        <span className="yc-topbar-logo" />
        PropertyAI
      </Link>
      <Link href="/analyzer">
        <span style={{ fontSize: 12, opacity: 0.8 }}>Analyzer</span>
      </Link>
      <Link href="/dashboard">
        <span style={{ fontSize: 12, opacity: 0.8 }}>Dashboard</span>
      </Link>
      <Link href="/trends">
        <span style={{ fontSize: 12, opacity: 0.8 }}>Trends</span>
      </Link>
      <Link href="/predict">
        <span style={{ fontSize: 12, opacity: 0.8 }}>Predict</span>
      </Link>
      <Link href="/portfolio">
        <span style={{ fontSize: 12, opacity: 0.8 }}>Portfolio</span>
      </Link>
      <Link href="/analyzer/batch">
        <span style={{ fontSize: 12, opacity: 0.8 }}>Batch</span>
      </Link>
      <span className="yc-topbar-count">
        MD &middot; RO
      </span>
    </div>
  );
}
