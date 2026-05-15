"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";

export default function RootPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Supabase のパスワードリセットリンクがここに戻ってきた場合、
    // ハッシュを保持したまま /reset-password に転送する
    const hash = window.location.hash;
    if (hash.includes("type=recovery") && hash.includes("access_token")) {
      window.location.replace("/reset-password" + hash);
      return;
    }
    if (loading) return;
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg">
      <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
