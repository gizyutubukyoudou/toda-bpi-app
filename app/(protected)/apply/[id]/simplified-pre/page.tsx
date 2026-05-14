"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { BasicInfoCard } from "@/components/approval/BasicInfoCard";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplication } from "@/lib/db";
import type { ApplicationData } from "@/lib/types";

const PC_LABELS: Record<string, string> = {
  pcCombustibleRemoval: "可燃物の除去・養生",
  pcFloorProtection:    "下階の防火対策",
  pcFireEquipment:      "消火設備の確認",
  pcOpeningProtection:  "開口部の向こう側への対策",
  pcWatchmanPlacement:  "見張り人の配置・監視手順",
  pcFireWorkDisplay:    "火気作業の表示",
};

export default function SimplifiedPreApprovePage() {
  const { id } = useParams<{ id: string }>();
  const { profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [app,        setApp]        = useState<ApplicationData | null>(null);
  const [fetching,   setFetching]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile || !["supervisor", "manager"].includes(profile.role)) {
      router.replace("/dashboard"); return;
    }
    getApplication(id).then((data) => {
      if (!data || data.status !== "submitted" || data.workflowType !== "simplified") {
        router.replace("/dashboard"); return;
      }
      setApp(data);
      setFetching(false);
    });
  }, [id, profile, loading, router]);

  async function handleApprove() {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/simplified-pre-approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
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
      <AppHeader title="① 事前承認" showBack backHref="/dashboard" />
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );

  return (
    <>
      <AppHeader title="① 事前承認（簡略）" showBack backHref="/dashboard" />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-32 space-y-4">

        <BasicInfoCard app={app} />

        {/* 協力会社が提出時に入力した現地確認チェック */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">現地確認チェック（協力会社記入）</h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {Object.entries(PC_LABELS).map(([key, label]) => {
              const checked = (app as unknown as Record<string, unknown>)[key] === true;
              return checked ? (
                <span key={key} className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
                  ✓ {label}
                </span>
              ) : (
                <span key={key} className="text-xs bg-gray-100 text-gray-400 px-2.5 py-1 rounded-full line-through">
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <button
          onClick={handleApprove}
          disabled={submitting}
          className="w-full py-3 rounded-md bg-accent text-white font-display font-bold text-sm disabled:opacity-50"
        >
          {submitting ? "処理中…" : "① 事前承認する →"}
        </button>
      </div>
    </>
  );
}
