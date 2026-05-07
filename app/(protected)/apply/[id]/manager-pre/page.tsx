"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { BasicInfoCard } from "@/components/approval/BasicInfoCard";
import { CheckedItemsTags } from "@/components/approval/CheckedItemsTags";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplication } from "@/lib/db";
import { extractCheckedBySection } from "@/lib/types";
import type { ApplicationData } from "@/lib/types";

const DEFAULT_INSTRUCTIONS =
  "火器作業開始前点検は火元責任者、担当社員が実施\n作業中点検は、立ち合い・巡回で実施";

export default function ManagerPreApprovePage() {
  const { id } = useParams<{ id: string }>();
  const { profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [app, setApp]             = useState<ApplicationData | null>(null);
  const [fetching, setFetching]   = useState(true);
  const [instructions, setInstructions] = useState(DEFAULT_INSTRUCTIONS);
  const [otherNote, setOtherNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile || profile.role !== "manager") { router.replace("/dashboard"); return; }
    (async () => {
      const data = await getApplication(id);
      if (!data || data.status !== "submitted") { router.replace("/dashboard"); return; }
      setApp(data);
      setFetching(false);
    })();
  }, [id, profile, loading, router]);

  async function handleApprove() {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const fullInstructions = otherNote.trim()
        ? `${instructions}\nその他指示: ${otherNote}`
        : instructions;
      const res = await fetch(`/api/applications/${id}/manager-pre-approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: fullInstructions }),
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
        <AppHeader title="所長事前承認" showBack backHref="/dashboard" />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="② 所長事前承認" showBack backHref="/dashboard" />
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

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">作業所長指示事項</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="bg-gray-50 rounded-md p-3 space-y-2">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked readOnly className="mt-0.5 accent-primary" />
                火器作業開始前点検は火元責任者、担当社員が実施
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input type="checkbox" checked readOnly className="mt-0.5 accent-primary" />
                作業中点検は、立ち合い・巡回で実施
              </label>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">その他指示（任意）</label>
              <textarea
                value={otherNote}
                onChange={(e) => setOtherNote(e.target.value)}
                placeholder="自由記載"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none resize-none"
              />
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 z-50">
        <button
          type="button"
          onClick={() => router.push(`/apply/${id}/reject`)}
          className="flex-1 py-3 rounded-md border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50"
        >
          差し戻し
        </button>
        <button
          type="button"
          onClick={handleApprove}
          disabled={submitting}
          className="flex-[1.2] py-3 rounded-md bg-accent text-white font-display font-bold text-sm hover:bg-accent-hover disabled:opacity-50 flex items-center justify-center"
        >
          {submitting ? "処理中…" : "事前承認する →"}
        </button>
      </div>
    </>
  );
}
