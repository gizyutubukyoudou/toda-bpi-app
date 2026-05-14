"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppHeader } from "@/components/ui/AppHeader";
import { ApplicationForm } from "@/components/form/ApplicationForm";
import { useAuth } from "@/lib/hooks/useAuth";
import { getApplication, updateDraftApplication } from "@/lib/db";
import type { ApplicationData, ApplicationFormValues } from "@/lib/types";

export default function EditApplicationPage() {
  const { id } = useParams<{ id: string }>();
  const { user, profile, loading, accessToken } = useAuth();
  const router = useRouter();
  const [app,        setApp]        = useState<ApplicationData | null>(null);
  const [fetching,   setFetching]   = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) { router.replace("/login"); return; }
    if (profile.role !== "contractor") { router.replace("/dashboard"); return; }

    (async () => {
      const data = await getApplication(id);
      if (!data || data.status !== "rejected") { router.replace("/dashboard"); return; }
      setApp(data);
      setFetching(false);
    })();
  }, [id, user, profile, loading, router]);

  async function handleDraft(values: ApplicationFormValues) {
    await updateDraftApplication(id, values);
  }

  async function handleSubmit(values: ApplicationFormValues) {
    if (!accessToken) return;
    setSubmitting(true);
    try {
      await updateDraftApplication(id, values);
      const res = await fetch(`/api/applications/${id}/resubmit`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Resubmit failed");
      router.replace("/dashboard");
    } finally {
      setSubmitting(false);
    }
  }

  if (fetching || !app) {
    return (
      <>
        <AppHeader title="申請を修正" showBack backHref={`/apply/${id}`} />
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  const defaultValues: Partial<ApplicationFormValues> = {
    workSiteName:     app.workSiteName,
    submitterCompany: app.submitterCompany,
    useDate:          app.useDate,
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
    cb_none:          app.cb_none,
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
    fp_noFlammable:   app.fp_noFlammable,
    fe_fireExtinguisher: app.fe_fireExtinguisher,
    fe_fireBucket:    app.fe_fireBucket,
    fe_fireSand:      app.fe_fireSand,
    fe_wetSpatterSheet: app.fe_wetSpatterSheet,
  };

  return (
    <>
      <AppHeader title="申請を修正して再提出" showBack backHref={`/apply/${id}`} />
      <main className="max-w-2xl mx-auto">
        {app.rejectionComment && (
          <div className="mx-4 mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-red-700 mb-1">差し戻し理由</p>
            <p className="text-sm text-red-800">{app.rejectionComment}</p>
          </div>
        )}
        <ApplicationForm
          defaultValues={defaultValues}
          onDraft={handleDraft}
          onSubmit={handleSubmit}
          submitting={submitting}
        />
      </main>
    </>
  );
}
