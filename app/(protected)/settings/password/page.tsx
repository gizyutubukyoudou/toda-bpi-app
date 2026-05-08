"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { useAuth } from "@/lib/hooks/useAuth";

export default function ChangePasswordPage() {
  const { accessToken } = useAuth();
  const router = useRouter();

  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next.length < 8) { setError("新しいパスワードは8文字以上で入力してください"); return; }
    if (next !== confirm) { setError("新しいパスワードが一致しません"); return; }

    setLoading(true);
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ password: next }),
      }
    );
    setLoading(false);

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.msg ?? json.error_description ?? "パスワード変更に失敗しました");
    } else {
      setSuccess(true);
    }
  }

  if (success) {
    return (
      <>
        <AppHeader title="パスワード変更" showBack backHref="/dashboard" />
        <main className="max-w-md mx-auto px-4 pt-12 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-gray-800 font-medium mb-1">パスワードを変更しました</p>
          <p className="text-sm text-gray-500 mb-6">次回ログインから新しいパスワードをご使用ください。</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="bg-primary text-white px-6 py-2.5 rounded-lg text-sm font-medium"
          >
            ダッシュボードへ
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <AppHeader title="パスワード変更" showBack backHref="/dashboard" />
      <main className="max-w-md mx-auto px-4 pt-6">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              新しいパスワード <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              placeholder="8文字以上"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              新しいパスワード（確認） <span className="text-red-500">*</span>
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="もう一度入力"
              required
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading ? "変更中…" : "パスワードを変更する"}
          </button>
        </form>
      </main>
    </>
  );
}
