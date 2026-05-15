"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

type Mode = "login" | "reset" | "sent";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export default function LoginPage() {
  const { signIn } = useAuth();
  const [mode,     setMode]     = useState<Mode>("login");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn(email, password);
      window.location.href = "/dashboard";
    } catch {
      setError("メールアドレスまたはパスワードが正しくありません。");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
        method: "POST",
        headers: { "apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirect_to: `${APP_URL}/auth/reset-password` }),
      });
      if (!res.ok) throw new Error();
      setMode("sent");
    } catch {
      setError("送信に失敗しました。メールアドレスをご確認ください。");
    } finally {
      setLoading(false);
    }
  }

  const logo = (
    <div className="text-center mb-8">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-xl mb-4 shadow-card-md">
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 18a3.75 3.75 0 00.495-7.468 5.99 5.99 0 00-1.925 3.547 5.975 5.975 0 01-2.133-1.001A3.75 3.75 0 0012 18z" />
        </svg>
      </div>
      <h1 className="font-display font-bold text-xl text-gray-900">火気使用届</h1>
      <p className="text-sm text-gray-500 mt-1">承認システム</p>
    </div>
  );

  if (mode === "sent") {
    return (
      <main className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {logo}
          <div className="card p-6 text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-800">パスワードリセットメールを送信しました</p>
            <p className="text-xs text-gray-500">
              <strong>{email}</strong> 宛にリセット用リンクを送信しました。メールを確認して手続きを完了してください。
            </p>
            <button
              onClick={() => { setMode("login"); setError(null); }}
              className="text-sm text-primary hover:underline"
            >
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (mode === "reset") {
    return (
      <main className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {logo}
          <form onSubmit={handleReset} className="card p-6 space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-800 mb-1">パスワードをお忘れの方</p>
              <p className="text-xs text-gray-500 mb-3">登録済みのメールアドレスを入力してください。リセット用リンクを送信します。</p>
              <label htmlFor="reset-email" className="block text-sm text-gray-600 mb-1.5">メールアドレス</label>
              <input
                id="reset-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
                placeholder="example@company.co.jp"
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600 flex items-center gap-1.5">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white font-display font-bold py-3 rounded-md hover:bg-primary-800 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "送信中…" : "リセットメールを送信"}
            </button>

            <button
              type="button"
              onClick={() => { setMode("login"); setError(null); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              ← ログイン画面に戻る
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {logo}

        <form onSubmit={handleLogin} className="card p-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm text-gray-600 mb-1.5">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
              placeholder="example@company.co.jp"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm text-gray-600 mb-1.5">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-red-600 flex items-center gap-1.5">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white font-display font-bold py-3 rounded-md hover:bg-primary-800 active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "ログイン中…" : "ログイン"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode("reset"); setError(null); }}
              className="text-xs text-gray-400 hover:text-primary hover:underline transition-colors"
            >
              パスワードをお忘れの方はこちら
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
