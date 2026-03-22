import Link from "next/link";

export function Topbar({ lessonCount }: { lessonCount: number }) {
  return (
    <div className="yc-topbar">
      <Link href="/">
        <span className="yc-topbar-logo" />
        AI ENGINEERING
      </Link>
      <span className="yc-topbar-count">
        {lessonCount} lessons
      </span>
      <Link href="/login" className="yc-topbar-signin">
        Sign In
      </Link>
    </div>
  );
}
