import { getSupabaseClient } from "./supabase";
import type { ApplicationData, ApplicationStatus, ApplicationFormValues, UserProfile } from "./types";

// ─── DB row (snake_case) → ApplicationData (camelCase) ──────────

export function rowToApp(row: Record<string, unknown>): ApplicationData {
  return {
    id:              row.id as string,
    status:          row.status as ApplicationStatus,
    submittedBy:     row.submitted_by as string,
    createdAt:       row.created_at as string,
    updatedAt:       row.updated_at as string,
    workSiteName:    row.work_site_name as string,
    submitterCompany: row.submitter_company as string,
    useDate:         row.use_date as string,
    useStartTime:    row.use_start_time as string,
    useEndTime:      row.use_end_time as string,
    workLocation:    row.work_location as string,
    fireChiefName:   row.fire_chief_name as string,
    fireWorkerName:  row.fire_worker_name as string,
    watchmanCompany:    row.watchman_company as string,
    watchmanName:       row.watchman_name as string,
    // 作業内容
    workContentTypes:    (row.work_content_types as string[]) ?? [],
    workContentOther:    row.work_content_other as string | undefined,
    // 担当者選択
    selectedSupervisors: (row.selected_supervisors as string[]) ?? [],
    // 火気作業
    fw_gasCutting:       row.fw_gas_cutting as boolean,
    fw_gasCompression:   row.fw_gas_compression as boolean,
    fw_arcWelding:       row.fw_arc_welding as boolean,
    fw_grinder:          row.fw_grinder as boolean,
    fw_highSpeedCutter:  row.fw_high_speed_cutter as boolean,
    fw_torch:            row.fw_torch as boolean,
    fw_solderingIron:    row.fw_soldering_iron as boolean,
    fw_dryer:            row.fw_dryer as boolean,
    fw_jetHeater:        row.fw_jet_heater as boolean,
    fw_plBurner:         row.fw_pl_burner as boolean,
    fw_other:            row.fw_other as boolean,
    fw_otherText:        row.fw_other_text as string | undefined,
    // 可燃物（炎や火花）
    cb_polystyrene:           row.cb_polystyrene as boolean,
    cb_rigidUrethane:         row.cb_rigid_urethane as boolean,
    cb_styrofoam:             row.cb_styrofoam as boolean,
    cb_refrigerantInsulation: row.cb_refrigerant_insulation as boolean,
    cb_flammableOtherText:    row.cb_flammable_other_text as string | undefined,
    // 可燃物（爆発）
    cb_organicSolvent:        row.cb_organic_solvent as boolean,
    cb_petroleum:             row.cb_petroleum as boolean,
    cb_gasType:               row.cb_gas_type as boolean,
    cb_sprayCan:              row.cb_spray_can as boolean,
    cb_explosiveOtherText:    row.cb_explosive_other_text as string | undefined,
    // 可燃物（燃えやすいもの）
    cb_cardboard:             row.cb_cardboard as boolean,
    cb_polyethylene:          row.cb_polyethylene as boolean,
    cb_woodWaste:             row.cb_wood_waste as boolean,
    cb_clothThread:           row.cb_cloth_thread as boolean,
    cb_asphalt:               row.cb_asphalt as boolean,
    cb_urethane:              row.cb_urethane as boolean,
    cb_plywood:               row.cb_plywood as boolean,
    cb_oil:                   row.cb_oil as boolean,
    cb_furniture:             row.cb_furniture as boolean,
    cb_plastic:               row.cb_plastic as boolean,
    cb_combustibleOtherText:  row.cb_combustible_other_text as string | undefined,
    cb_none:                  row.cb_none as boolean,
    // 作業環境
    env_belowSleeve:   row.env_below_sleeve as boolean,
    env_wallOpening:   row.env_wall_opening as boolean,
    env_outdoorBelow:  row.env_outdoor_below as boolean,
    env_otherText:     row.env_other_text as string | undefined,
    // 防火対策
    fp_nonFlammableCovering: row.fp_non_flammable_covering as boolean,
    fp_closeOpening:         row.fp_close_opening as boolean,
    fp_waterSpray:           row.fp_water_spray as boolean,
    fp_removeInsulation:     row.fp_remove_insulation as boolean,
    fp_enclose:              row.fp_enclose as boolean,
    fp_moveCombustibles:     row.fp_move_combustibles as boolean,
    fp_noFlammable:          row.fp_no_flammable as boolean,
    // 消火設備
    fe_fireExtinguisher: row.fe_fire_extinguisher as boolean,
    fe_fireBucket:       row.fe_fire_bucket as boolean,
    fe_fireSand:         row.fe_fire_sand as boolean,
    fe_wetSpatterSheet:  row.fe_wet_spatter_sheet as boolean,
    // 旧ワークフロー（DB互換）
    supervisorComment:    row.supervisor_comment as string | undefined,
    supervisorApprovedAt: row.supervisor_approved_at as string | undefined,
    supervisorApprovedBy: row.supervisor_approved_by as string | undefined,
    inspectorType:        row.inspector_type as "fireChief" | "supervisor" | undefined,
    inspectionMethod:     row.inspection_method as "onsite" | "patrol" | undefined,
    otherInstructions:    row.other_instructions as string | undefined,
    managerApprovedAt:    row.manager_approved_at as string | undefined,
    managerApprovedBy:    row.manager_approved_by as string | undefined,
    rejectionComment:     row.rejection_comment as string | undefined,
    rejectedAt:           row.rejected_at as string | undefined,
    rejectedBy:           row.rejected_by as string | undefined,
    // ② 所長事前承認
    managerPreInstructions: row.manager_pre_instructions as string | undefined,
    managerPreApprovedAt:   row.manager_pre_approved_at as string | undefined,
    managerPreApprovedBy:   row.manager_pre_approved_by as string | undefined,
    // ③-1 現地確認
    pcCombustibleRemoval: (row.pc_combustible_removal as boolean) ?? false,
    pcFloorProtection:    (row.pc_floor_protection as boolean) ?? false,
    pcFireEquipment:      (row.pc_fire_equipment as boolean) ?? false,
    pcOpeningProtection:  (row.pc_opening_protection as boolean) ?? false,
    pcWatchmanPlacement:  (row.pc_watchman_placement as boolean) ?? false,
    pcFireWorkDisplay:    (row.pc_fire_work_display as boolean) ?? false,
    pcCheckedAt:          row.pc_checked_at as string | undefined,
    pcCheckedBy:          row.pc_checked_by as string | undefined,
    // ③-2 担当職員直前承認
    supervisorPreApprovedAt: row.supervisor_pre_approved_at as string | undefined,
    supervisorPreApprovedBy: row.supervisor_pre_approved_by as string | undefined,
    // ④ 作業中点検
    wpInspectionTime:    row.wp_inspection_time as string | undefined,
    wpFireChiefSignedAt: row.wp_fire_chief_signed_at as string | undefined,
    wpResidualCheckTime: row.wp_residual_check_time as string | undefined,
    wpSupervisorSignedAt: row.wp_supervisor_signed_at as string | undefined,
    // ⑤ 作業終了報告
    completionTime:        row.completion_time as string | undefined,
    completionReportedAt:  row.completion_reported_at as string | undefined,
    completionReportedBy:  row.completion_reported_by as string | undefined,
    // ⑥ 残火確認
    residualCheckTime:  row.residual_check_time as string | undefined,
    residualCheckedAt:  row.residual_checked_at as string | undefined,
    residualCheckedBy:  row.residual_checked_by as string | undefined,
    // ⑦ 最終承認
    finalApprovedAt: row.final_approved_at as string | undefined,
    finalApprovedBy: row.final_approved_by as string | undefined,
  };
}

// ─── ApplicationFormValues (camelCase) → DB columns (snake_case) ─

const FIELD_MAP: Record<string, string> = {
  workSiteName:    "work_site_name",
  submitterCompany: "submitter_company",
  useDate:         "use_date",
  useStartTime:    "use_start_time",
  useEndTime:      "use_end_time",
  workLocation:    "work_location",
  fireChiefName:   "fire_chief_name",
  fireWorkerName:  "fire_worker_name",
  watchmanCompany:    "watchman_company",
  watchmanName:       "watchman_name",
  workContentTypes:    "work_content_types",
  workContentOther:    "work_content_other",
  selectedSupervisors: "selected_supervisors",
  fw_gasCutting:      "fw_gas_cutting",
  fw_gasCompression:  "fw_gas_compression",
  fw_arcWelding:      "fw_arc_welding",
  fw_grinder:         "fw_grinder",
  fw_highSpeedCutter: "fw_high_speed_cutter",
  fw_torch:           "fw_torch",
  fw_solderingIron:   "fw_soldering_iron",
  fw_dryer:           "fw_dryer",
  fw_jetHeater:       "fw_jet_heater",
  fw_plBurner:        "fw_pl_burner",
  fw_other:           "fw_other",
  fw_otherText:       "fw_other_text",
  cb_polystyrene:           "cb_polystyrene",
  cb_rigidUrethane:         "cb_rigid_urethane",
  cb_styrofoam:             "cb_styrofoam",
  cb_refrigerantInsulation: "cb_refrigerant_insulation",
  cb_flammableOtherText:    "cb_flammable_other_text",
  cb_organicSolvent:        "cb_organic_solvent",
  cb_petroleum:             "cb_petroleum",
  cb_gasType:               "cb_gas_type",
  cb_sprayCan:              "cb_spray_can",
  cb_explosiveOtherText:    "cb_explosive_other_text",
  cb_cardboard:             "cb_cardboard",
  cb_polyethylene:          "cb_polyethylene",
  cb_woodWaste:             "cb_wood_waste",
  cb_clothThread:           "cb_cloth_thread",
  cb_asphalt:               "cb_asphalt",
  cb_urethane:              "cb_urethane",
  cb_plywood:               "cb_plywood",
  cb_oil:                   "cb_oil",
  cb_furniture:             "cb_furniture",
  cb_plastic:               "cb_plastic",
  cb_combustibleOtherText:  "cb_combustible_other_text",
  cb_none:                  "cb_none",
  env_belowSleeve:   "env_below_sleeve",
  env_wallOpening:   "env_wall_opening",
  env_outdoorBelow:  "env_outdoor_below",
  env_otherText:     "env_other_text",
  fp_nonFlammableCovering: "fp_non_flammable_covering",
  fp_closeOpening:         "fp_close_opening",
  fp_waterSpray:           "fp_water_spray",
  fp_removeInsulation:     "fp_remove_insulation",
  fp_enclose:              "fp_enclose",
  fp_moveCombustibles:     "fp_move_combustibles",
  fp_noFlammable:          "fp_no_flammable",
  fe_fireExtinguisher: "fe_fire_extinguisher",
  fe_fireBucket:       "fe_fire_bucket",
  fe_fireSand:         "fe_fire_sand",
  fe_wetSpatterSheet:  "fe_wet_spatter_sheet",
};

function formToDb(data: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    result[FIELD_MAP[key] ?? key] = value;
  }
  return result;
}

// ─── User ────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (typeof window === "undefined") return null;
  const ref = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0];
  const stored = localStorage.getItem(`sb-${ref}-auth-token`);
  if (!stored) return null;
  const { access_token } = JSON.parse(stored) as { access_token: string };

  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=*&id=eq.${uid}&limit=1`;
  const res = await fetch(url, {
    headers: {
      "apikey":        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      "Authorization": `Bearer ${access_token}`,
      "Accept":        "application/json",
    },
  });
  if (!res.ok) return null;
  const rows = await res.json() as Record<string, unknown>[];
  if (!rows.length) return null;
  const data = rows[0];
  return {
    uid:          data.id as string,
    email:        data.email as string,
    displayName:  data.display_name as string,
    role:         data.role as UserProfile["role"],
    workSiteName: data.work_site_name as string,
    company:      data.company as string,
    createdAt:    data.created_at as string,
  };
}

// ─── Application reads ───────────────────────────────────────────

export async function getApplication(id: string): Promise<ApplicationData | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("id", id)
    .single();
  return data ? rowToApp(data as Record<string, unknown>) : null;
}

export async function getApplicationsByUser(uid: string): Promise<ApplicationData[]> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from("applications")
    .select("*")
    .eq("submitted_by", uid)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((r) => rowToApp(r as Record<string, unknown>));
}

export async function getApplicationsByWorkSite(
  workSiteName: string,
  statuses?: ApplicationStatus[]
): Promise<ApplicationData[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from("applications")
    .select("*")
    .eq("work_site_name", workSiteName)
    .order("created_at", { ascending: false })
    .limit(100);

  if (statuses?.length) {
    query = query.in("status", statuses);
  }

  const { data } = await query;
  return (data ?? []).map((r) => rowToApp(r as Record<string, unknown>));
}

// ─── Application writes (client-safe: draft only) ────────────────

export async function createDraftApplication(
  uid: string,
  data: Omit<ApplicationFormValues, never>
): Promise<string> {
  const supabase = getSupabaseClient();
  const { data: row, error } = await supabase
    .from("applications")
    .insert({ ...formToDb(data as unknown as Record<string, unknown>), submitted_by: uid, status: "draft" })
    .select("id")
    .single();
  if (error) throw error;
  return row.id as string;
}

export async function updateDraftApplication(
  appId: string,
  data: Partial<ApplicationFormValues>
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("applications")
    .update(formToDb(data as Record<string, unknown>))
    .eq("id", appId);
  if (error) throw error;
}

// ステータス遷移は app/api/ の Route Handlers を使用
// submit / approve / reject / resubmit → /api/applications/[id]/...
