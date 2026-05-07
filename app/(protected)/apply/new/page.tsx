"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { ApplicationForm } from "@/components/form/ApplicationForm";
import { useAuth } from "@/lib/hooks/useAuth";
import { createDraftApplication, updateDraftApplication } from "@/lib/db";
import type { ApplicationFormValues } from "@/lib/types";

export default function NewApplicationPage() {
  const { user, accessToken, profile } = useAuth();
  const router = useRouter();
  const [appId,       setAppId]       = useState<string | null>(null);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleDraft(values: ApplicationFormValues) {
    if (!user) return;
    try {
      if (appId) {
        await updateDraftApplication(appId, values);
      } else {
        const id = await createDraftApplication(user.id, values);
        setAppId(id);
      }
    } catch (err) {
      console.error("[handleDraft]", err);
    }
  }

  async function handleSubmit(values: ApplicationFormValues) {
    if (!user || !accessToken) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      let id = appId;
      if (!id) {
        id = await createDraftApplication(user.id, values);
        setAppId(id);
      } else {
        await updateDraftApplication(id, values);
      }
      const res = await fetch(`/api/applications/${id}/submit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error ?? `サーバーエラー (${res.status})`);
      }
      router.replace("/");
    } catch (err) {
      console.error("[handleSubmit]", err);
      setSubmitError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <AppHeader title="火気使用届 新規作成" showBack backHref="/" />
      <main className="max-w-2xl mx-auto">
        {submitError && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
            {submitError}
          </div>
        )}
        <ApplicationForm
          defaultValues={{
            workSiteName:     profile?.workSiteName    ?? "",
            submitterCompany: profile?.company         ?? "",
          }}
          onDraft={handleDraft}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </main>
    </>
  );
}
