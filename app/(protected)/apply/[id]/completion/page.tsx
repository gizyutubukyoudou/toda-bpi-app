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

export default function CompletionPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [app, setApp]           = useState<ApplicationData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [endTime, setEndTime]   = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile || profile.role !== "contractor") { router.replace("/dashboard"); return; }
    (async () => {
      const data = await getApplication(id);
      if (!data || data.status !== "in_progress") { router.replace("/dashboard"); return; }
      setApp(data);
      setFetching(false);
    })();
  }, [id, profile, loading, router]);

  async function handleSubmit() {
    if (!accessToken) return;
    if (!endTime.trim()) { setError("作業終了時刻を入力してください"); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/complete`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ completionTime: endTime }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "エラー");
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      setSubmitting(false);
    }
  }

  if (fetching || !app) {
    return (
      <>
        <AppHeader title="作業終了報告" showBack backHref="/dashboard" />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="⑤ 作業終了報告" showBack backHref={`/apply/${id}`} />
      <main className="max-w-2xl mx-auto pb-32 px-4 pt-4 space-y-4">

        <BasicInfoCard app={app} />

        {/* 申請内容 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">申請内容（チェック済み項目）</h3>
          </div>
          <div className="p-4">
            <CheckedItemsTags sections={extractCheckedBySection(app)} otherText={app.fw_otherText} />
          </div>
        </div>

        {/* 作業中点検実績 */}
        {(app.wpInspectionTime || app.wpResidualCheckTime) && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-green-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-green-700">作業中点検実績</h3>
            </div>
            <div className="p-4 space-y-2">
              {app.wpInspectionTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">点検時刻（火元責任者）</span>
                  <span className="font-medium text-gray-800">{app.wpInspectionTime}</span>
                </div>
              )}
              {app.wpResidualCheckTime && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">残火確認時刻（中断時・担当職員）</span>
                  <span className="font-medium text-gray-800">{app.wpResidualCheckTime}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 作業終了時刻 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">作業終了報告（火元責任者）</h3>
          </div>
          <div className="p-4 space-y-2">
            <label className="block text-sm text-gray-600">
              作業終了時刻<span className="text-red-500 ml-0.5">*</span>
            </label>
            <TimeSelect value={endTime} onChange={setEndTime} />
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
          {submitting ? "送信中…" : "終了報告する →"}
        </button>
      </div>
    </>
  );
}
