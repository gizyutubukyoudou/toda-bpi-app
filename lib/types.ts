// ─────────────────────────────────────────────
// User / Auth
// ─────────────────────────────────────────────

export type UserRole = "contractor" | "supervisor" | "manager";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  workSiteName: string;
  company: string;
  createdAt: string;
}

// ─────────────────────────────────────────────
// Application status
// ─────────────────────────────────────────────

export type ApplicationStatus =
  | "draft"
  | "submitted"
  | "manager_pre_approved"
  | "pre_work_checked"
  | "supervisor_pre_approved"
  | "fire_chief_in_progress"
  | "in_progress"
  | "completion_reported"
  | "final_approval_pending"
  | "approved"
  | "rejected"
  | "simplified_pre_approved";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  draft:                   "下書き",
  submitted:               "所長事前確認待ち",
  manager_pre_approved:    "現地確認待ち",
  pre_work_checked:        "担当職員直前承認待ち",
  supervisor_pre_approved: "作業中点検待ち",
  fire_chief_in_progress:  "担当職員点検待ち",
  in_progress:             "作業終了報告待ち",
  completion_reported:     "残火確認待ち",
  final_approval_pending:  "最終承認待ち",
  approved:                  "承認済み",
  rejected:                  "差し戻し",
  simplified_pre_approved:   "事前承認済み",
};

// ─────────────────────────────────────────────
// ApplicationData
// ─────────────────────────────────────────────

export interface ApplicationData {
  // ── メタデータ ─────────────────────────────
  id: string;
  status: ApplicationStatus;
  submittedBy: string;
  createdAt: string;
  updatedAt: string;

  // ── 基本情報 ───────────────────────────────
  workSiteName: string;
  submitterCompany: string;
  useDate: string;
  useStartTime: string;
  useEndTime: string;
  workLocation: string;
  fireChiefName: string;
  fireWorkerName: string;
  watchmanCompany: string;
  watchmanName: string;

  // ── 作業内容 ───────────────────────────────
  workContentTypes?: string[];
  workContentOther?: string;

  // ── 担当者選択 ──────────────────────────────
  selectedSupervisors?: string[];

  // ── ワークフロー種別 ─────────────────────────
  workflowType?: "standard" | "simplified";

  // ── 火気作業の種類（11項目）───────────────
  fw_gasCutting: boolean;
  fw_gasCompression: boolean;
  fw_arcWelding: boolean;
  fw_grinder: boolean;
  fw_highSpeedCutter: boolean;
  fw_torch: boolean;
  fw_solderingIron: boolean;
  fw_dryer: boolean;
  fw_jetHeater: boolean;
  fw_plBurner: boolean;           // PLバーナー
  fw_other: boolean;
  fw_otherText?: string;

  // ── 可燃物（炎や火花）───────────────────
  cb_polystyrene: boolean;
  cb_rigidUrethane: boolean;
  cb_styrofoam: boolean;
  cb_refrigerantInsulation: boolean;
  cb_flammableOtherText?: string;

  // ── 可燃物（爆発）───────────────────────
  cb_organicSolvent: boolean;
  cb_petroleum: boolean;
  cb_gasType: boolean;
  cb_sprayCan: boolean;
  cb_explosiveOtherText?: string;

  // ── 可燃物（燃えやすいもの）─────────────
  cb_cardboard: boolean;
  cb_polyethylene: boolean;
  cb_woodWaste: boolean;
  cb_clothThread: boolean;
  cb_asphalt: boolean;
  cb_urethane: boolean;
  cb_plywood: boolean;
  cb_oil: boolean;
  cb_furniture: boolean;
  cb_plastic: boolean;
  cb_combustibleOtherText?: string;

  // ── 旧フィールド（DB互換）────────────────
  cb_none: boolean;

  // ── 作業環境（3項目）─────────────────────
  env_belowSleeve: boolean;
  env_wallOpening: boolean;
  env_outdoorBelow: boolean;
  env_otherText?: string;

  // ── 防火対策（6項目）─────────────────────
  fp_nonFlammableCovering: boolean;
  fp_closeOpening: boolean;
  fp_waterSpray: boolean;
  fp_removeInsulation: boolean;
  fp_enclose: boolean;
  fp_moveCombustibles: boolean;

  // ── 旧フィールド（DB互換）────────────────
  fp_noFlammable: boolean;

  // ── 消火設備（4項目）─────────────────────
  fe_fireExtinguisher: boolean;
  fe_fireBucket: boolean;
  fe_fireSand: boolean;
  fe_wetSpatterSheet: boolean;

  // ── 旧ワークフロー（DB互換）──────────────
  supervisorComment?: string;
  supervisorApprovedAt?: string;
  supervisorApprovedBy?: string;
  inspectorType?: "fireChief" | "supervisor";
  inspectionMethod?: "onsite" | "patrol";
  otherInstructions?: string;
  managerApprovedAt?: string;
  managerApprovedBy?: string;
  rejectionComment?: string;
  rejectedAt?: string;
  rejectedBy?: string;

  // ── ② 所長事前承認 ───────────────────────
  managerPreInstructions?: string;
  managerPreApprovedAt?: string;
  managerPreApprovedBy?: string;

  // ── ③-1 現地確認（火元責任者）───────────
  pcCombustibleRemoval: boolean;
  pcFloorProtection: boolean;
  pcFireEquipment: boolean;
  pcOpeningProtection: boolean;
  pcWatchmanPlacement: boolean;
  pcFireWorkDisplay: boolean;
  pcCheckedAt?: string;
  pcCheckedBy?: string;

  // ── ③-2 担当職員直前承認 ──────────────────
  supervisorPreApprovedAt?: string;
  supervisorPreApprovedBy?: string;

  // ── ④ 作業中点検 ─────────────────────────
  wpInspectionTime?: string;
  wpFireChiefSignedAt?: string;
  wpResidualCheckTime?: string;
  wpSupervisorSignedAt?: string;

  // ── ⑤ 作業終了報告 ──────────────────────
  completionTime?: string;
  completionReportedAt?: string;
  completionReportedBy?: string;

  // ── ⑥ 残火確認 ──────────────────────────
  residualCheckTime?: string;
  residualCheckedAt?: string;
  residualCheckedBy?: string;

  // ── ⑦ 最終承認 ──────────────────────────
  finalApprovedAt?: string;
  finalApprovedBy?: string;
}

// ─────────────────────────────────────────────
// Form input type
// ─────────────────────────────────────────────

export type ApplicationFormValues = Omit<
  ApplicationData,
  // メタデータ
  "id" | "status" | "submittedBy" | "createdAt" | "updatedAt" |
  // 旧ワークフロー
  "supervisorComment" | "supervisorApprovedAt" | "supervisorApprovedBy" |
  "inspectorType" | "inspectionMethod" | "otherInstructions" |
  "managerApprovedAt" | "managerApprovedBy" |
  "rejectionComment" | "rejectedAt" | "rejectedBy" |
  // ② 所長事前承認
  "managerPreInstructions" | "managerPreApprovedAt" | "managerPreApprovedBy" |
  // ③-1 現地確認（pcCheckedAt/By はサーバーセット）
  "pcCheckedAt" | "pcCheckedBy" |
  // ③-2 担当職員直前承認
  "supervisorPreApprovedAt" | "supervisorPreApprovedBy" |
  // ④ 作業中点検
  "wpInspectionTime" | "wpFireChiefSignedAt" | "wpResidualCheckTime" | "wpSupervisorSignedAt" |
  // ⑤ 作業終了報告
  "completionTime" | "completionReportedAt" | "completionReportedBy" |
  // ⑥ 残火確認
  "residualCheckTime" | "residualCheckedAt" | "residualCheckedBy" |
  // ⑦ 最終承認
  "finalApprovedAt" | "finalApprovedBy"
>;

// ─────────────────────────────────────────────
// CHECKBOX_FIELDS — メール・簡易表示用
// ─────────────────────────────────────────────

export const CHECKBOX_FIELDS: Record<string, string> = {
  fw_gasCutting:          "ガス溶接・切断",
  fw_gasCompression:      "ガス圧接",
  fw_arcWelding:          "アーク溶接",
  fw_grinder:             "グラインダー類",
  fw_highSpeedCutter:     "高速カッター",
  fw_torch:               "トーチランプ",
  fw_solderingIron:       "電気コテ",
  fw_dryer:               "ドライヤー",
  fw_jetHeater:           "ジェットヒーター",
  fw_plBurner:            "PLバーナー",
  fw_other:               "その他（内燃機関他）",
  cb_polystyrene:           "ポリスチレンフォーム",
  cb_rigidUrethane:         "硬質ウレタンフォーム",
  cb_styrofoam:             "発泡スチロール",
  cb_refrigerantInsulation: "冷媒配管用保温材",
  cb_organicSolvent:        "有機溶剤",
  cb_petroleum:             "石油類",
  cb_gasType:               "ガス類（アセチレン・プロパン）",
  cb_sprayCan:              "スプレー缶",
  cb_cardboard:             "段ボール・紙",
  cb_polyethylene:          "ポリエチレンシート他",
  cb_woodWaste:             "木くず・鉋屑他",
  cb_clothThread:           "布・糸類",
  cb_asphalt:               "アスファルト防水",
  cb_urethane:              "ウレタン防水",
  cb_plywood:               "コンパネ・桟木",
  cb_oil:                   "油類",
  cb_furniture:             "家具・木製加工品",
  cb_plastic:               "プラスチック等",
  env_belowSleeve:   "スリーブ等の下に可燃物あり",
  env_wallOpening:   "壁開口・火の粉が落ちる空間に可燃物あり",
  env_outdoorBelow:  "屋外作業・火の粉が落ちる下に可燃物あり",
  fp_nonFlammableCovering: "不燃材で養生（スパッタシート・鉄板）",
  fp_closeOpening:         "開口部をふさぐ（鉄板等）",
  fp_waterSpray:           "作業前・作業中に散水",
  fp_removeInsulation:     "飛散範囲の断熱材を除去",
  fp_enclose:              "火気使用場所を囲う",
  fp_moveCombustibles:     "可燃物を範囲外に移動",
  fe_fireExtinguisher: "消火器",
  fe_fireBucket:       "防火バケツ",
  fe_fireSand:         "防火砂",
  fe_wetSpatterSheet:  "濡らしたスパッタシート",
};

export function extractCheckedItems(app: ApplicationData): string[] {
  return Object.entries(CHECKBOX_FIELDS)
    .filter(([field]) => (app as unknown as Record<string, unknown>)[field] === true)
    .map(([, label]) => label);
}

export interface CheckedItemsBySection {
  fireWork:     string[];
  combustibles: string[];
  environment:  string[];
  prevention:   string[];
  equipment:    string[];
}

export function extractCheckedBySection(app: ApplicationData): CheckedItemsBySection {
  const pick = (prefix: string) =>
    Object.entries(CHECKBOX_FIELDS)
      .filter(([k]) => k.startsWith(prefix) && (app as unknown as Record<string, unknown>)[k] === true)
      .map(([, label]) => label);

  return {
    fireWork:     pick("fw_"),
    combustibles: pick("cb_"),
    environment:  pick("env_"),
    prevention:   pick("fp_"),
    equipment:    pick("fe_"),
  };
}

// ─────────────────────────────────────────────
// Default (blank) form values
// ─────────────────────────────────────────────

export function createBlankApplication(): ApplicationFormValues {
  return {
    workSiteName: "", submitterCompany: "",
    useDate: "", useStartTime: "", useEndTime: "",
    workLocation: "", fireChiefName: "", fireWorkerName: "",
    watchmanCompany: "", watchmanName: "",
    workContentTypes: [], workContentOther: "",
    selectedSupervisors: [],
    fw_gasCutting: false, fw_gasCompression: false, fw_arcWelding: false,
    fw_grinder: false, fw_highSpeedCutter: false, fw_torch: false,
    fw_solderingIron: false, fw_dryer: false, fw_jetHeater: false,
    fw_plBurner: false, fw_other: false,
    cb_polystyrene: false, cb_rigidUrethane: false,
    cb_styrofoam: false, cb_refrigerantInsulation: false,
    cb_organicSolvent: false, cb_petroleum: false,
    cb_gasType: false, cb_sprayCan: false,
    cb_cardboard: false, cb_polyethylene: false, cb_woodWaste: false,
    cb_clothThread: false, cb_asphalt: false, cb_urethane: false,
    cb_plywood: false, cb_oil: false, cb_furniture: false, cb_plastic: false,
    cb_none: false,
    env_belowSleeve: false, env_wallOpening: false, env_outdoorBelow: false,
    fp_nonFlammableCovering: false, fp_closeOpening: false, fp_waterSpray: false,
    fp_removeInsulation: false, fp_enclose: false, fp_moveCombustibles: false,
    fp_noFlammable: false,
    fe_fireExtinguisher: false, fe_fireBucket: false,
    fe_fireSand: false, fe_wetSpatterSheet: false,
    // 現地確認チェック（簡略ワークフロー：提出時に入力）
    pcCombustibleRemoval: false, pcFloorProtection: false,
    pcFireEquipment: false, pcOpeningProtection: false,
    pcWatchmanPlacement: false, pcFireWorkDisplay: false,
    // ワークフロー種別
    workflowType: "standard" as const,
  };
}
