"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { ApplicationForm } from "@/components/form/ApplicationForm";
import { useAuth } from "@/lib/hooks/useAuth";
import { createDraftApplication, updateDraftApplication, getApplicationsByUser } from "@/lib/db";
import type { ApplicationData, ApplicationFormValues } from "@/lib/types";

function appToFormDefaults(app: ApplicationData): Partial<ApplicationFormValues> {
  return {
    workSiteName:     app.workSiteName,
    submitterCompany: app.submitterCompany,
    useStartTime:     app.useStartTime,
    useEndTime:       app.useEndTime,
    workLocation:     app.workLocation,
    fireChiefName:    app.fireChiefName,
    fireWorkerName:   app.fireWorkerName,
    watchmanCompany:  app.watchmanCompany,
    watchmanName:     app.watchmanName,
    workContentTypes: app.workContentTypes ?? [],
    workContentOther: app.workContentOther ?? "",
    fw_gasCutting:    app.fw_gasCutting,
    fw_gasCompression: app.fw_gasCompression,
    fw_arcWelding:    app.fw_arcWelding,
    fw_grinder:       app.fw_grinder,
    fw_highSpeedCutter: app.fw_highSpeedCutter,
    fw_torch:         app.fw_torch,
    fw_solderingIron: app.fw_solderingIron,
    fw_dryer:         app.fw_dryer,
    fw_jetHeater:     app.fw_jetHeater,
    fw_plBurner:      app.fw_plBurner,
    fw_other:         app.fw_other,
    fw_otherText:     app.fw_otherText,
    cb_polystyrene:   app.cb_polystyrene,
    cb_rigidUrethane: app.cb_rigidUrethane,
    cb_styrofoam:     app.cb_styrofoam,
    cb_refrigerantInsulation: app.cb_refrigerantInsulation,
    cb_flammableOtherText: app.cb_flammableOtherText,
    cb_organicSolvent: app.cb_organicSolvent,
    cb_petroleum:     app.cb_petroleum,
    cb_gasType:       app.cb_gasType,
    cb_sprayCan:      app.cb_sprayCan,
    cb_explosiveOtherText: app.cb_explosiveOtherText,
    cb_cardboard:     app.cb_cardboard,
    cb_polyethylene:  app.cb_polyethylene,
    cb_woodWaste:     app.cb_woodWaste,
    cb_clothThread:   app.cb_clothThread,
    cb_asphalt:       app.cb_asphalt,
    cb_urethane:      app.cb_urethane,
    cb_plywood:       app.cb_plywood,
    cb_oil:           app.cb_oil,
    cb_furniture:     app.cb_furniture,
    cb_plastic:       app.cb_plastic,
    cb_combustibleOtherText: app.cb_combustibleOtherText,
    env_belowSleeve:  app.env_belowSleeve,
    env_wallOpening:  app.env_wallOpening,
    env_outdoorBelow: app.env_outdoorBelow,
    env_otherText:    app.env_otherText,
    fp_nonFlammableCovering: app.fp_nonFlammableCovering,
    fp_closeOpening:  app.fp_closeOpening,
    fp_waterSpray:    app.fp_waterSpray,
    fp_removeInsulation: app.fp_removeInsulation,
    fp_enclose:       app.fp_enclose,
    fp_moveCombustibles: app.fp_moveCombustibles,
    fe_fireExtinguisher:  app.fe_fireExtinguisher,
    fe_fireBucket:        app.fe_fireBucket,
    fe_fireSand:          app.fe_fireSand,
    fe_wetSpatterSheet:   app.fe_wetSpatterSheet,
    selectedSupervisors:  app.selectedSupervisors ?? [],
  };
}

export default function NewApplicationPage() {
  const { user, accessToken, profile, loading } = useAuth();
  const router = useRouter();
  const [appId,        setAppId]        = useState<string | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState<string | null>(null);
  const [prevDefaults,  setPrevDefaults]  = useState<Partial<ApplicationFormValues> | null>(null);
  const [supervisors,   setSupervisors]   = useState<{ id: string; displayName: string }[]>([]);

  useEffect(() => {
    if (loading || !user || !accessToken) return;

    getApplicationsByUser(user.id).then((apps) => {
      const latest = apps.find((a) => a.status !== "draft");
      if (latest) setPrevDefaults(appToFormDefaults(latest));
    });

    fetch("/api/users", { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((members: { id: string; displayName: string; role: string }[]) => {
        setSupervisors(
          members
            .filter((m) => m.role === "supervisor")
            .map((m) => ({ id: m.id, displayName: m.displayName }))
        );
      })
      .catch(() => {});
  }, [user, accessToken, loading]);

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
            workSiteName:     profile?.workSiteName ?? "",
            submitterCompany: profile?.company      ?? "",
            ...prevDefaults,
          }}
          supervisors={supervisors}
          onDraft={handleDraft}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </main>
    </>
  );
}
