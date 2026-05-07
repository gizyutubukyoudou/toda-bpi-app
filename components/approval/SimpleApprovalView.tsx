"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { BasicInfoCard } from "./BasicInfoCard";
import { CheckedItemsTags } from "./CheckedItemsTags";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { extractCheckedBySection } from "@/lib/types";
import type { ApplicationData, UserRole } from "@/lib/types";

interface SimpleApprovalViewProps {
  app: ApplicationData;
  reviewerRole: UserRole;
}

export function SimpleApprovalView({ app, reviewerRole }: SimpleApprovalViewProps) {
  const router = useRouter();
  const { accessToken } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const sections = extractCheckedBySection(app);

  const isPending =
    app.status === "submitted" ||
    app.status === "pre_work_checked" ||
    app.status === "final_approval_pending";

  async function handleApprove() {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${app.id}/approve`, {
        method:  "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Approve failed");
      router.replace("/dashboard");
    } catch {
      setError("承認処理に失敗しました。再度お試しください。");
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="space-y-4 px-4 pt-4 pb-32">

        {/* ステータスバナー */}
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

        {error && (
          <p className="text-xs text-red-600 text-center">{error}</p>
        )}
      </div>

      {/* Sticky action bar */}
      {isPending && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 z-50">
          <button
            type="button"
            onClick={() => router.push(`/apply/${app.id}/reject`)}
            disabled={submitting}
            className="flex-1 py-3 rounded-md border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50 active:scale-[0.99] transition disabled:opacity-50"
          >
            差し戻し
          </button>
          <button
            type="button"
            onClick={handleApprove}
            disabled={submitting}
            className="flex-[1.2] py-3 rounded-md bg-accent text-white font-display font-bold text-sm hover:bg-accent-hover active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : reviewerRole === "supervisor" ? "担当職員確認する →" : "最終承認する →"}
          </button>
        </div>
      )}
    </>
  );
}
