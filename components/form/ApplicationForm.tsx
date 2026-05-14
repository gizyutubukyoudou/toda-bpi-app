"use client";

import { useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { SectionHeader } from "./SectionHeader";
import { CheckboxRow }   from "./CheckboxRow";
import type { ApplicationFormValues } from "@/lib/types";
import { createBlankApplication } from "@/lib/types";

// ─── Validation schema ───────────────────────────────────────────────────────

const schema = z.object({
  workSiteName:     z.string().min(1, "作業所名を入力してください"),
  submitterCompany: z.string().min(1, "会社名を入力してください"),
  useDate:          z.string().min(1, "使用日を選択してください"),
  useStartTime:     z.string().min(1, "開始時刻を入力してください"),
  useEndTime:       z.string().min(1, "終了時刻を入力してください"),
  workLocation:     z.string().min(1, "作業場所を入力してください"),
  fireChiefName:    z.string().min(1, "火元責任者を入力してください"),
  fireWorkerName:   z.string().min(1, "火気使用者名を入力してください"),
  watchmanCompany:  z.string(),
  watchmanName:     z.string(),
  workContentTypes: z.array(z.string()).optional(),
  workContentOther: z.string().optional(),
}).passthrough();

// ─── 30分単位の時刻オプション ─────────────────────────────────────────────────

const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_OPTIONS.push(`${String(h).padStart(2, "0")}:30`);
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface ApplicationFormProps {
  defaultValues?: Partial<ApplicationFormValues>;
  onDraft:  (values: ApplicationFormValues) => Promise<void>;
  onSubmit: (values: ApplicationFormValues) => Promise<void>;
  submitting?: boolean;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ApplicationForm({
  defaultValues,
  onDraft,
  onSubmit,
  submitting = false,
}: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ApplicationFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...createBlankApplication(), ...defaultValues },
  });

  const handleDraft = async () => {
    await onDraft(getValues());
  };

  const handleFinalSubmit: SubmitHandler<ApplicationFormValues> = async (values) => {
    await onSubmit(values);
  };

  const TextField = ({
    id, label, required, type = "text", placeholder,
  }: {
    id: keyof ApplicationFormValues;
    label: string;
    required?: boolean;
    type?: string;
    placeholder?: string;
  }) => (
    <div>
      <label htmlFor={id} className="block text-sm text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base"
        {...register(id)}
      />
      {errors[id] && (
        <p className="text-xs text-red-600 mt-1">{errors[id]?.message as string}</p>
      )}
    </div>
  );

  const SubHeader = ({ label }: { label: string }) => (
    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1.5 px-1">
      {label}
    </p>
  );

  const OtherText = ({ id, placeholder = "その他の内容を記載" }: { id: keyof ApplicationFormValues; placeholder?: string }) => (
    <div className="pl-8 pt-1 pb-2">
      <input
        type="text"
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none"
        {...register(id)}
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit(handleFinalSubmit)} noValidate>
      <div className="pb-24 space-y-0">

        {/* ── 基本情報 ──────────────────────────────────── */}
        <SectionHeader title="基本情報" />
        <div className="p-4 space-y-4 bg-white">
          <TextField id="workSiteName" label="作業所名" required placeholder="例: 島松作業所" />
          <TextField id="submitterCompany" label="会社名" required placeholder="例: 株式会社〇〇建設" />

          <div>
            <label htmlFor="useDate" className="block text-sm text-gray-600 mb-1">
              使用日<span className="text-red-500 ml-0.5">*</span>
            </label>
            <input
              id="useDate"
              type="date"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base"
              {...register("useDate")}
            />
            {errors.useDate && <p className="text-xs text-red-600 mt-1">{errors.useDate.message}</p>}
          </div>

          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label htmlFor="useStartTime" className="block text-sm text-gray-600 mb-1">
                開始時刻<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                id="useStartTime"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base bg-white"
                {...register("useStartTime")}
              >
                <option value="">--:--</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <span className="text-gray-500 pb-2.5">〜</span>
            <div className="flex-1">
              <label htmlFor="useEndTime" className="block text-sm text-gray-600 mb-1">
                終了時刻<span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                id="useEndTime"
                className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base bg-white"
                {...register("useEndTime")}
              >
                <option value="">--:--</option>
                {TIME_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <TextField id="fireChiefName" label="火元責任者（職長）" required placeholder="氏名" />
            </div>
            <div className="flex-1">
              <TextField id="fireWorkerName" label="火気使用者" required placeholder="氏名" />
            </div>
          </div>
        </div>

        {/* ── 作業内容 ──────────────────────────────────── */}
        <SectionHeader title="作業内容" note="任意：該当する作業を選択・記入" />
        <div className="p-4 bg-white space-y-3">
          <p className="text-xs text-gray-500 mb-1">作業の種類（複数選択可）</p>
          <fieldset>
            <legend className="sr-only">作業内容</legend>
            <div className="space-y-0">
              {(["溶接", "切断", "ケレン", "乾燥", "給熱", "その他"] as const).map((type) => {
                const id = `wct-${type}`;
                return (
                  <div key={type} className="checkbox-row">
                    <input
                      id={id}
                      type="checkbox"
                      value={type}
                      className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                      {...register("workContentTypes")}
                    />
                    <label htmlFor={id}>{type}</label>
                  </div>
                );
              })}
            </div>
          </fieldset>
          <div className="pt-1">
            <label htmlFor="workContentOther" className="block text-sm text-gray-600 mb-1">
              作業内容の詳細（任意）
            </label>
            <input
              id="workContentOther"
              type="text"
              placeholder="例: A棟3Fスリーブ開口部 溶接補修"
              className="w-full px-3 py-2.5 border border-gray-300 rounded-md focus:border-primary focus:ring-1 focus:ring-primary outline-none text-base"
              {...register("workContentOther")}
            />
          </div>
        </div>

        {/* ── 火気作業計画 ─────────────────────────────── */}
        <SectionHeader title="火気作業計画" />
        <div className="p-4 space-y-3 bg-white">

          <p className="text-xs text-gray-500 mb-1">火気作業の種類（該当するものを選択）</p>
          <fieldset>
            <legend className="sr-only">火気作業の種類</legend>
            {([
              { field: "fw_gasCutting",      label: "ガス溶接・切断" },
              { field: "fw_gasCompression",  label: "ガス圧接" },
              { field: "fw_arcWelding",      label: "アーク溶接" },
              { field: "fw_grinder",         label: "グラインダー類" },
              { field: "fw_highSpeedCutter", label: "高速カッター" },
              { field: "fw_torch",           label: "トーチランプ" },
              { field: "fw_solderingIron",   label: "電気コテ" },
              { field: "fw_dryer",           label: "ドライヤー" },
              { field: "fw_jetHeater",       label: "ジェットヒーター" },
              { field: "fw_plBurner",        label: "PLバーナー" },
              { field: "fw_other",           label: "その他（内燃機関他）" },
            ] as { field: keyof ApplicationFormValues; label: string }[]).map((item) => (
              <CheckboxRow key={item.field} fieldName={item.field} label={item.label} register={register} />
            ))}
          </fieldset>
          <OtherText id="fw_otherText" />

          <div className="pt-2">
            <TextField id="workLocation" label="作業場所" required placeholder="例: A1下り線 橋梁下" />
          </div>
        </div>

        {/* ── 注意書き ─────────────────────────────────── */}
        <div className="px-4 py-3 bg-amber-50 border-y border-amber-200">
          <p className="text-xs text-amber-800 leading-relaxed">
            火元責任者は火気作業場所の「可燃物」「作業環境」を現地確認し、『火気作業計画』を計画して下さい。
          </p>
        </div>

        {/* ── 可燃物 ─────────────────────────────────── */}
        <SectionHeader title="可燃物" note="火気作業場所の可燃物を現地確認し、該当を選択" />
        <div className="p-4 bg-white space-y-1">

          <SubHeader label="炎や火花で引火し急速に燃焼が広がる" />
          <fieldset>
            <legend className="sr-only">炎や火花で引火し急速に燃焼が広がる</legend>
            {([
              { field: "cb_polystyrene",           label: "ポリスチレンフォーム（スタイロフォーム・カネライトフォーム他）" },
              { field: "cb_rigidUrethane",         label: "硬質ウレタンフォーム（２種・３種）" },
              { field: "cb_styrofoam",             label: "発泡スチロール" },
              { field: "cb_refrigerantInsulation", label: "冷媒配管用保温材" },
            ] as { field: keyof ApplicationFormValues; label: string }[]).map((item) => (
              <CheckboxRow key={item.field} fieldName={item.field} label={item.label} register={register} />
            ))}
          </fieldset>
          <OtherText id="cb_flammableOtherText" />

          <SubHeader label="爆発の恐れがある" />
          <fieldset>
            <legend className="sr-only">爆発の恐れがある</legend>
            {([
              { field: "cb_organicSolvent", label: "有機溶剤（塗料・シーリング材等）" },
              { field: "cb_petroleum",      label: "石油類（ガソリン・軽油）" },
              { field: "cb_gasType",        label: "ガス類（アセチレン・プロパン類）" },
              { field: "cb_sprayCan",       label: "スプレー缶" },
            ] as { field: keyof ApplicationFormValues; label: string }[]).map((item) => (
              <CheckboxRow key={item.field} fieldName={item.field} label={item.label} register={register} />
            ))}
          </fieldset>
          <OtherText id="cb_explosiveOtherText" />

          <SubHeader label="燃えやすいもの" />
          <fieldset>
            <legend className="sr-only">燃えやすいもの</legend>
            {([
              { field: "cb_cardboard",   label: "段ボール・紙" },
              { field: "cb_polyethylene",label: "ポリエチレンシート他" },
              { field: "cb_woodWaste",   label: "木くず・鉋屑他" },
              { field: "cb_clothThread", label: "布・糸類" },
              { field: "cb_asphalt",     label: "アスファルト防水" },
              { field: "cb_urethane",    label: "ウレタン防水" },
              { field: "cb_plywood",     label: "コンパネ・桟木" },
              { field: "cb_oil",         label: "油類" },
              { field: "cb_furniture",   label: "家具・木製加工品" },
              { field: "cb_plastic",     label: "プラスチック等" },
            ] as { field: keyof ApplicationFormValues; label: string }[]).map((item) => (
              <CheckboxRow key={item.field} fieldName={item.field} label={item.label} register={register} />
            ))}
          </fieldset>
          <OtherText id="cb_combustibleOtherText" />
        </div>

        {/* ── 作業環境 ────────────────────────────────── */}
        <SectionHeader title="作業環境" />
        <div className="p-4 bg-white space-y-1">
          <fieldset>
            <legend className="sr-only">作業環境</legend>
            {([
              { field: "env_belowSleeve",  label: "スリーブ・駄目穴・外壁と床の隙間等の下に可燃物がある" },
              { field: "env_wallOpening",  label: "壁開口や火の粉が落ちる空間に可燃物がある" },
              { field: "env_outdoorBelow", label: "屋外作業で火の粉が落ちる下に可燃物がある" },
            ] as { field: keyof ApplicationFormValues; label: string }[]).map((item) => (
              <CheckboxRow key={item.field} fieldName={item.field} label={item.label} register={register} />
            ))}
          </fieldset>
          <OtherText id="env_otherText" />
        </div>

        {/* ── 防火対策 ────────────────────────────────── */}
        <SectionHeader title="防火対策" />
        <div className="p-4 bg-white space-y-1">
          <fieldset>
            <legend className="sr-only">防火対策</legend>
            {([
              { field: "fp_nonFlammableCovering", label: "不燃材で養生（スパッタシート・鉄板）" },
              { field: "fp_closeOpening",         label: "開口部をふさぐ（鉄板等）" },
              { field: "fp_waterSpray",           label: "作業前・作業中に散水" },
              { field: "fp_removeInsulation",     label: "飛散範囲の断熱材を除去" },
              { field: "fp_enclose",              label: "火気使用場所を囲う" },
              { field: "fp_moveCombustibles",     label: "可燃物を範囲外に移動させた" },
            ] as { field: keyof ApplicationFormValues; label: string }[]).map((item) => (
              <CheckboxRow key={item.field} fieldName={item.field} label={item.label} register={register} />
            ))}
          </fieldset>
        </div>

        {/* ── 消火設備 ────────────────────────────────── */}
        <SectionHeader title="消火設備" />
        <div className="p-4 bg-white space-y-1">
          <fieldset>
            <legend className="sr-only">消火設備</legend>
            {([
              { field: "fe_fireExtinguisher", label: "消火器" },
              { field: "fe_fireBucket",       label: "防火バケツ" },
              { field: "fe_fireSand",         label: "防火砂" },
              { field: "fe_wetSpatterSheet",  label: "濡らしたスパッタシート" },
            ] as { field: keyof ApplicationFormValues; label: string }[]).map((item) => (
              <CheckboxRow key={item.field} fieldName={item.field} label={item.label} register={register} />
            ))}
          </fieldset>
        </div>

        {/* ── 見張り人 ─────────────────────────────────── */}
        <SectionHeader title="見張り人" />
        <div className="p-4 space-y-4 bg-white">
          <div className="flex gap-3">
            <div className="flex-1">
              <TextField id="watchmanCompany" label="見張り人 会社名" placeholder="会社名" />
            </div>
            <div className="flex-1">
              <TextField id="watchmanName" label="見張り人 氏名" placeholder="氏名" />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-gray-500">※ 内装改修工事、稼働中の工場内での火気作業は見張人を配置する。</p>
            <p className="text-xs text-gray-500">※ 防炎シートは火気使用時の養生材として使用禁止とする。</p>
          </div>
        </div>

      </div>

      {/* ── StickySubmitBar ─────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex gap-3 z-50">
        <button
          type="button"
          onClick={handleDraft}
          disabled={submitting}
          className="flex-1 py-3 rounded-md border border-gray-300 text-gray-600 font-medium text-sm hover:bg-gray-50 active:scale-[0.99] transition disabled:opacity-50"
        >
          下書き保存
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-[1.2] py-3 rounded-md bg-primary text-white font-display font-bold text-sm hover:bg-primary-800 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              送信中…
            </>
          ) : "提出する →"}
        </button>
      </div>
    </form>
  );
}
