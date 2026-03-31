"use client";

import Link from "next/link";
import { useSession, signOut } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export function Topbar({ lessonCount }: { lessonCount?: number }) {
  const { data: session } = useSession();
  const router = useRouter();

  return (
    <div className="yc-topbar">
      <Link href="/">
        <span className="yc-topbar-logo" />
        AI ENGINEERING
      </Link>
      {lessonCount != null && (
        <span className="yc-topbar-count">{lessonCount} lessons</span>
      )}
      <div className="yc-topbar-right">
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
    </div>
  );
}
