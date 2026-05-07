"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

interface AppHeaderProps {
  title: string;
  showBack?: boolean;
  backHref?: string;
}

export function AppHeader({ title, showBack = false, backHref }: AppHeaderProps) {
  const router  = useRouter();
  const { signOut, profile } = useAuth();

  function handleBack() {
    if (backHref) router.push(backHref);
    else router.back();
  }

  return (
    <header className="sticky top-0 z-40 bg-primary text-white h-14 flex items-center px-4 gap-3 shadow-md">
      {showBack && (
        <button
          onClick={handleBack}
          aria-label="戻る"
          className="p-1 -ml-1 rounded-md hover:bg-primary-800 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}

      <h1 className="flex-1 font-display font-bold text-base tracking-wide truncate">
        {title}
      </h1>

      <button
        onClick={async () => { await signOut(); router.replace("/login"); }}
        aria-label={`${profile?.displayName ?? ""} — ログアウト`}
        className="text-xs text-white/70 hover:text-white transition-colors"
      >
        {profile?.displayName ?? "ログアウト"}
      </button>
    </header>
  );
}
