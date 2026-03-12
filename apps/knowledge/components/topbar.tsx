import Link from "next/link";

export function Topbar({ paperCount }: { paperCount: number }) {
  return (
    <div className="yc-topbar">
      <Link href="/">
        <span className="yc-topbar-logo" />
        AI ENGINEERING
      </Link>
      <span className="yc-topbar-count">
        {paperCount} lessons
      </span>
    </div>
  );
}
