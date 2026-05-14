"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { useAuth } from "@/lib/hooks/useAuth";

export default function WorkSiteSettingsPage() {
  const { profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [workflowType, setWorkflowType] = useState<"standard" | "simplified">("standard");
  const [fetching,     setFetching]     = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!profile || profile.role !== "manager") { router.replace("/dashboard"); return; }
    fetch("/api/work-site-settings", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((d: { workflowType: "standard" | "simplified" }) => {
        setWorkflowType(d.workflowType);
        setFetching(false);
      });
  }, [profile, loading, accessToken, router]);

  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/work-site-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ workflowType }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  }

  if (fetching) return (
    <>
      <AppHeader title="作業所設定" showBack backHref="/dashboard" />
      <div className="flex justify-center py-16">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    </>
  );

  return (
    <>
      <AppHeader title="作業所設定" showBack backHref="/dashboard" />
      <main className="max-w-md mx-auto px-4 pt-6 space-y-4">

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h2 className="text-sm font-semibold text-gray-700">ワークフロー設定</h2>
            <p className="text-xs text-gray-500 mt-0.5">この設定は今後の新規申請に適用されます</p>
          </div>

          <div className="p-4 space-y-3">
            {(["standard", "simplified"] as const).map((type) => (
              <label
                key={type}
                className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  workflowType === type ? "border-primary bg-primary/5" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name="workflowType"
                  value={type}
                  checked={workflowType === type}
                  onChange={() => setWorkflowType(type)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {type === "standard" ? "正規ワークフロー" : "簡略ワークフロー（当現場）"}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {type === "standard"
                      ? "①所長事前承認 → ②現地確認 → ③担当承認 → ④⑤点検・終了 → ⑥残火確認 → ⑦最終承認"
                      : "①担当者or所長事前承認（現地確認同時） → ④⑤点検・終了（同時） → ⑥残火確認 → ⑦最終承認"}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        {saved && <p className="text-sm text-green-600 text-center">保存しました</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-lg bg-primary text-white font-medium text-sm disabled:opacity-50"
        >
          {saving ? "保存中…" : "保存する"}
        </button>
      </main>
    </>
  );
}
