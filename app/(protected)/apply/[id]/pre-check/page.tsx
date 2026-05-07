"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplication } from "@/lib/db";
import type { ApplicationData } from "@/lib/types";

const CHECK_ITEMS = [
  { key: "pcCombustibleRemoval",  label: "可燃物の除去・養生" },
  { key: "pcFloorProtection",     label: "下階の防火対策" },
  { key: "pcFireEquipment",       label: "消火設備の確認" },
  { key: "pcOpeningProtection",   label: "開口部の向こう側への対策" },
  { key: "pcWatchmanPlacement",   label: "見張り人の配置・監視手順" },
  { key: "pcFireWorkDisplay",     label: "火気作業の表示" },
] as const;

type CheckKey = typeof CHECK_ITEMS[number]["key"];

export default function PreWorkCheckPage() {
  const { id } = useParams<{ id: string }>();
  const { profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [app, setApp]           = useState<ApplicationData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [checks, setChecks]     = useState<Record<CheckKey, boolean>>({
    pcCombustibleRemoval: false,
    pcFloorProtection:    false,
    pcFireEquipment:      false,
    pcOpeningProtection:  false,
    pcWatchmanPlacement:  false,
    pcFireWorkDisplay:    false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile || profile.role !== "contractor") { router.replace("/dashboard"); return; }
    (async () => {
      const data = await getApplication(id);
      if (!data || data.status !== "manager_pre_approved") { router.replace("/dashboard"); return; }
      setApp(data);
      setFetching(false);
    })();
  }, [id, profile, loading, router]);

  function toggle(key: CheckKey) {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleSubmit() {
    if (!accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/applications/${id}/pre-work-check`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(checks),
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
        <AppHeader title="現地確認チェック" showBack backHref="/dashboard" />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader title="③-1 現地確認チェック" showBack backHref={`/apply/${id}`} />
      <main className="max-w-2xl mx-auto pb-32 px-4 pt-4 space-y-4">

        {app.managerPreInstructions && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">所長指示事項</p>
            <p className="text-sm text-amber-900 whitespace-pre-line">{app.managerPreInstructions}</p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-primary-700">現地確認項目（作業直前）</h3>
          </div>
          <div className="p-4 space-y-3">
            {CHECK_ITEMS.map(({ key, label }) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checks[key]}
                  onChange={() => toggle(key)}
                  className="w-5 h-5 accent-primary"
                />
                <span className="text-sm text-gray-800">{label}</span>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
      </main>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 z-50">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full py-3 rounded-md bg-primary text-white font-display font-bold text-sm hover:bg-primary-800 disabled:opacity-50 flex items-center justify-center"
        >
          {submitting ? "送信中…" : "現地確認完了 → 担当職員へ送信"}
        </button>
      </div>
    </>
  );
}
