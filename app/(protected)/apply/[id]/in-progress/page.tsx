"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { BasicInfoCard } from "@/components/approval/BasicInfoCard";
import { CheckedItemsTags } from "@/components/approval/CheckedItemsTags";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplication } from "@/lib/db";
import { extractCheckedBySection } from "@/lib/types";
import type { ApplicationData } from "@/lib/types";

const HOURS   = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [h, setH] = useState(value ? value.split(":")[0] : "");
  const [m, setM] = useState(value ? value.split(":")[1] : "");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (h && m) onChangeRef.current(`${h}:${m}`);
    else onChangeRef.current("");
  }, [h, m]);

  return (
    <div className="flex items-center gap-1.5 flex-1">
      <select
        value={h}
        onChange={(e) => setH(e.target.value)}
        className="flex-1 px-2 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base bg-white"
      >
        <option value="">時</option>
        {HOURS.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
      <span className="text-gray-500 text-sm font-medium">:</span>
      <select
        value={m}
        onChange={(e) => setM(e.target.value)}
        className="flex-1 px-2 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base bg-white"
      >
        <option value="">分</option>
        {MINUTES.map((v) => <option key={v} value={v}>{v}</option>)}
      </select>
    </div>
  );
}

export default function InProgressPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [app, setApp]           = useState<ApplicationData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [times, setTimes]       = useState<string[]>([""]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile) { router.replace("/login"); return; }
    (async () => {
      const data = await getApplication(id);
      if (!data) { router.replace("/dashboard"); return; }
      const canAct =
        (profile.role === "contractor" && data.status === "supervisor_pre_approved") ||
        (profile.role === "supervisor"  && data.status === "fire_chief_in_progress");
      if (!canAct) { router.replace("/dashboard"); return; }
      setApp(data);
      setFetching(false);
    })();
  }, [id, profile, loading, router]);

  function updateTime(index: number, value: string) {
    setTimes((prev) => prev.map((t, i) => i === index ? value : t));
  }

  function addTime() {
    setTimes((prev) => [...prev, ""]);
  }

  function removeTime(index: number) {
    setTimes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!accessToken || !app) return;
    const filled = times.filter((t) => t.trim());
    if (filled.length === 0) { setError("時刻を入力してください"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const isFireChief = profile?.role === "contractor";
      const endpoint = isFireChief
        ? `/api/applications/${id}/fire-chief-in-progress`
        : `/api/applications/${id}/supervisor-in-progress`;
      const timeStr = filled.join("、");
      const body = isFireChief
        ? { inspectionTime: timeStr }
        : { residualCheckTime: timeStr };
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "エラー");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSubmitting(false);
    }
  }

  if (fetching || !app || !profile) {
    return (
      <>
        <AppHeader title="作業中点検" showBack backHref="/dashboard" />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  const isFireChief = profile.role === "contractor";

  return (
    <>
      <AppHeader title="④ 作業中点検" showBack backHref={`/apply/${id}`} />
      <main className="max-w-2xl mx-auto pb-32 px-4 pt-4 space-y-4">

        <BasicInfoCard app={app} />

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">申請内容（チェック済み項目）</h3>
          </div>
          <div className="p-4">
            <CheckedItemsTags sections={extractCheckedBySection(app)} otherText={app.fw_otherText} />
          </div>
        </div>

        {/* 火元責任者の署名済み情報（担当職員が見る場合） */}
        {!isFireChief && app.wpInspectionTime && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-green-700 mb-1">火元責任者 点検時刻</p>
            <p className="text-sm text-green-900">{app.wpInspectionTime}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">
              {isFireChief ? "点検時刻を記入（火元責任者）" : "残火確認時刻を記入（担当職員）"}
            </h3>
          </div>
          <div className="p-4 space-y-3">
            {!isFireChief && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-3 text-xs text-amber-800 leading-relaxed">
                <p className="font-semibold mb-1">作業中断時の残火確認</p>
                <p>火気使用者（本人）は休憩・移動前に15分間の残火確認をして点検し、時間を記載した後にその場を離れてください。</p>
                <p className="mt-1">・異常に対応した場合は、消火後に火元責任者（職長）まで措置を報告する。</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm text-gray-600">
                {isFireChief ? "点検時刻（火元責任者）" : "残火確認時刻（担当職員）"}<span className="text-red-500 ml-0.5">*</span>
              </label>
              {times.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <TimeSelect value={t} onChange={(v) => updateTime(i, v)} />
                  {times.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTime(i)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                      aria-label="削除"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addTime}
                className="flex items-center gap-1.5 text-sm text-primary hover:text-primary-800 transition-colors mt-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                時刻を追加
              </button>
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-md bg-primary text-white font-display font-bold text-sm hover:bg-primary-800 disabled:opacity-50"
        >
          {submitting ? "送信中…" : isFireChief ? "署名して次へ →" : "残火確認完了 →"}
        </button>
      </div>
    </>
  );
}
