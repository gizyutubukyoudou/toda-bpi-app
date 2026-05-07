"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { useAuth } from "@/lib/hooks/useAuth";

export default function RejectPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading, accessToken } = useAuth();
  const router = useRouter();

  const [comment,    setComment]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) { router.replace("/login"); return; }
    if (profile.role === "contractor") { router.replace("/dashboard"); return; }
  }, [user, profile, loading, router]);

  async function handleSubmit() {
    if (!comment.trim()) {
      setError("差し戻し理由を入力してください。");
      return;
    }
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/reject`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          Authorization:   `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ comment }),
      });
      if (!res.ok) throw new Error("Reject failed");
      router.replace("/dashboard");
    } catch {
      setError("差し戻し処理に失敗しました。再度お試しください。");
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader title="差し戻し" showBack backHref={`/apply/${id}/review`} />
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-24">

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 font-medium">
            この申請を差し戻します。申請者に理由が通知されます。
          </p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <label htmlFor="comment" className="text-sm font-semibold text-gray-600">
              差し戻し理由 <span className="text-red-500">*</span>
            </label>
          </div>
          <div className="p-4">
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => { setComment(e.target.value); setError(null); }}
              placeholder="具体的な修正点・理由を記入してください"
              rows={5}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
            />
            {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-md bg-red-600 text-white font-display font-bold text-sm hover:bg-red-700 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : "差し戻しを確定する"}
        </button>
      </div>
    </>
  );
}
