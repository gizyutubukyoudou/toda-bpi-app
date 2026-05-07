"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { BasicInfoCard } from "@/components/approval/BasicInfoCard";
import { CheckedItemsTags } from "@/components/approval/CheckedItemsTags";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplication } from "@/lib/db";
import { extractCheckedBySection } from "@/lib/types";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { ApplicationData } from "@/lib/types";

const PC_LABELS: Record<string, string> = {
  pcCombustibleRemoval:  "可燃物の除去・養生",
  pcFloorProtection:     "下階の防火対策",
  pcFireEquipment:       "消火設備の確認",
  pcOpeningProtection:   "開口部の向こう側への対策",
  pcWatchmanPlacement:   "見張り人の配置・監視手順",
  pcFireWorkDisplay:     "火気作業の表示",
};

function fmt(ts: string | undefined): string {
  if (!ts) return "—";
  try { return format(new Date(ts), "yyyy年M月d日 HH:mm", { locale: ja }); } catch { return ts; }
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [app, setApp]           = useState<ApplicationData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) { router.replace("/login"); return; }
    (async () => {
      const data = await getApplication(id);
      if (!data) { router.replace("/dashboard"); return; }
      setApp(data);
      setFetching(false);
    })();
  }, [id, user, profile, loading, router]);

  async function handleFinalApprove() {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/final-approve`, {
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

  if (fetching || !app) {
    return (
      <>
        <AppHeader title="申請詳細" showBack backHref="/dashboard" />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  const sections = extractCheckedBySection(app);
  const showFinalApprove = profile?.role === "manager" && app.status === "final_approval_pending";

  return (
    <>
      <AppHeader title="申請詳細" showBack backHref="/dashboard" />
      <main className="max-w-2xl mx-auto px-4 pt-4 pb-24 space-y-4">

        {/* ステータス */}
        <div className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
          <StatusBadge status={app.status} size="md" />
          <span className="text-xs text-gray-400 ml-auto font-mono">
            #{app.id.slice(-6).toUpperCase()}
          </span>
        </div>

        {/* 基本情報 */}
        <BasicInfoCard app={app} />

        {/* チェック済み項目 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">チェック済み項目</h3>
          </div>
          <div className="p-4">
            <CheckedItemsTags sections={sections} otherText={app.fw_otherText} />
          </div>
        </div>

        {/* 差し戻しコメント */}
        {app.status === "rejected" && app.rejectionComment && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-red-700 mb-1">差し戻し理由</p>
            <p className="text-sm text-red-800">{app.rejectionComment}</p>
            {app.rejectedAt && (
              <p className="text-xs text-red-500 mt-1">{fmt(app.rejectedAt)}</p>
            )}
          </div>
        )}

        {/* ワークフロー進捗 */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600">ワークフロー進捗</h3>
          </div>
          <div className="divide-y divide-gray-100">

            {/* ② 所長事前承認 */}
            <WorkflowRow
              step="② 所長事前承認"
              done={!!app.managerPreApprovedAt}
              time={app.managerPreApprovedAt}
            >
              {app.managerPreInstructions && (
                <p className="text-xs text-gray-500 mt-0.5 whitespace-pre-line">{app.managerPreInstructions}</p>
              )}
            </WorkflowRow>

            {/* ③-1 現地確認 */}
            <WorkflowRow
              step="③-1 現地確認"
              done={!!app.pcCheckedAt}
              time={app.pcCheckedAt}
            >
              {app.pcCheckedAt && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {Object.entries(PC_LABELS).map(([key, label]) => {
                    const checked = (app as unknown as Record<string, unknown>)[key] === true;
                    return checked ? (
                      <span key={key} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                        {label}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </WorkflowRow>

            {/* ③-2 担当職員直前承認 */}
            <WorkflowRow step="③-2 担当職員直前承認" done={!!app.supervisorPreApprovedAt} time={app.supervisorPreApprovedAt} />

            {/* ④ 作業中点検 */}
            <WorkflowRow
              step="④ 作業中点検"
              done={!!app.wpSupervisorSignedAt}
              time={app.wpFireChiefSignedAt}
            >
              {app.wpInspectionTime && (
                <p className="text-xs text-gray-500 mt-0.5">点検時刻: {app.wpInspectionTime}</p>
              )}
              {app.wpResidualCheckTime && (
                <p className="text-xs text-gray-500">残火確認（中断時）: {app.wpResidualCheckTime}</p>
              )}
            </WorkflowRow>

            {/* ⑤ 作業終了報告 */}
            <WorkflowRow step="⑤ 作業終了報告" done={!!app.completionReportedAt} time={app.completionReportedAt}>
              {app.completionTime && (
                <p className="text-xs text-gray-500 mt-0.5">終了時刻: {app.completionTime}</p>
              )}
            </WorkflowRow>

            {/* ⑥ 残火確認 */}
            <WorkflowRow step="⑥ 残火確認（担当職員）" done={!!app.residualCheckedAt} time={app.residualCheckedAt}>
              {app.residualCheckTime && (
                <p className="text-xs text-gray-500 mt-0.5">確認時刻: {app.residualCheckTime}</p>
              )}
            </WorkflowRow>

            {/* ⑦ 最終承認 */}
            <WorkflowRow step="⑦ 最終承認（所長）" done={!!app.finalApprovedAt} time={app.finalApprovedAt} />

          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        {/* 再提出 */}
        {app.status === "rejected" && profile?.role === "contractor" && (
          <button
            type="button"
            onClick={() => router.push(`/apply/${app.id}/edit`)}
            className="w-full py-3 rounded-md bg-primary text-white font-display font-bold text-sm hover:bg-primary-800"
          >
            修正して再提出 →
          </button>
        )}
      </main>

      {/* 最終承認ボタン（所長） */}
      {showFinalApprove && (
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
            onClick={handleFinalApprove}
            disabled={submitting}
            className="flex-[1.2] py-3 rounded-md bg-accent text-white font-display font-bold text-sm hover:bg-accent-hover disabled:opacity-50"
          >
            {submitting ? "処理中…" : "⑦ 最終承認する →"}
          </button>
        </div>
      )}
    </>
  );
}

function WorkflowRow({
  step, done, time, children,
}: {
  step: string;
  done: boolean;
  time?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="px-4 py-3 flex items-start gap-3">
      <span className={`mt-0.5 text-lg leading-none ${done ? "text-green-500" : "text-gray-200"}`}>
        {done ? "●" : "○"}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? "text-gray-800" : "text-gray-400"}`}>{step}</p>
        {done && time && <p className="text-xs text-gray-400 mt-0.5">{fmt(time)}</p>}
        {children}
      </div>
    </div>
  );
}
