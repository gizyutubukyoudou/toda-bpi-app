"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { BasicInfoCard } from "@/components/approval/BasicInfoCard";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplication } from "@/lib/db";
import type { ApplicationData } from "@/lib/types";

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

export default function SimplifiedProgressPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [app,            setApp]            = useState<ApplicationData | null>(null);
  const [fetching,       setFetching]       = useState(true);
  const [inspectionTime, setInspectionTime] = useState("");
  const [completionTime, setCompletionTime] = useState("");
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile || profile.role !== "contractor") { router.replace("/dashboard"); return; }
    getApplication(id)
      .then((data) => {
        if (!data || data.submittedBy !== user?.id || data.status !== "simplified_pre_approved") {
          router.replace("/dashboard"); return;
        }
        setApp(data);
        setInspectionTime(data.useStartTime ?? "");
        setFetching(false);
      })
      .catch(() => {
        setError("申請データの取得に失敗しました。ページを再読み込みしてください。");
        setFetching(false);
      });
  }, [id, user, profile, loading, router]);

  async function handleSubmit() {
    if (!accessToken || !inspectionTime || !completionTime) {
      setError("点検時刻と終了時刻を入力してください"); return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/simplified-complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inspectionTime, completionTime }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "エラー");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSubmitting(false);
    }
  }

  if (fetching || !app) return (
    <>
      <AppHeader title="④⑤ 点検・終了報告" showBack backHref="/dashboard" />
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );

  const selectCls = "w-full px-3 py-2.5 border border-gray-300 rounded-md text-base bg-white focus:border-primary focus:ring-1 focus:ring-primary outline-none";

  return (
    <>
      <AppHeader title="④⑤ 点検・終了報告" showBack backHref="/dashboard" />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-32 space-y-4">

        <BasicInfoCard app={app} />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">④ 作業中点検 ＋ ⑤ 作業終了報告</h3>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                点検時刻 <span className="text-red-500">*</span>
              </label>
              <select value={inspectionTime} onChange={(e) => setInspectionTime(e.target.value)} className={selectCls}>
                <option value="">--:--</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                作業終了時刻 <span className="text-red-500">*</span>
              </label>
              <select value={completionTime} onChange={(e) => setCompletionTime(e.target.value)} className={selectCls}>
                <option value="">--:--</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-md bg-primary text-white font-display font-bold text-sm disabled:opacity-50"
        >
          {submitting ? "送信中…" : "⑤ 終了報告する →"}
        </button>
      </div>
    </>
  );
}
