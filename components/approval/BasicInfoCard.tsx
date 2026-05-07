import { format } from "date-fns";
import { ja } from "date-fns/locale";
import type { ApplicationData } from "@/lib/types";

interface BasicInfoCardProps {
  app: ApplicationData;
}

export function BasicInfoCard({ app }: BasicInfoCardProps) {
  const dateStr = app.useDate
    ? format(new Date(app.useDate), "yyyy年M月d日(E)", { locale: ja })
    : "—";

  const timeStr =
    app.useStartTime && app.useEndTime
      ? `${app.useStartTime} 〜 ${app.useEndTime}`
      : "—";

  const rows: { label: string; value: string }[] = [
    { label: "使用日時", value: `${dateStr}　${timeStr}` },
    { label: "作業所名", value: app.workSiteName || "—" },
    { label: "会社名",   value: app.submitterCompany || "—" },
    { label: "作業場所", value: app.workLocation || "—" },
    { label: "火元責任者", value: app.fireChiefName || "—" },
    { label: "火気使用者", value: app.fireWorkerName || "—" },
  ];

  if (app.watchmanName) {
    rows.push({ label: "見張人", value: `${app.watchmanCompany ?? ""} ${app.watchmanName}`.trim() });
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="px-4 py-2.5 bg-primary-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-primary-700">基本情報</h3>
      </div>
      <dl className="divide-y divide-gray-100">
        {rows.map(({ label, value }) => (
          <div key={label} className="px-4 py-2.5 flex gap-3">
            <dt className="text-xs text-gray-500 w-20 shrink-0 pt-0.5">{label}</dt>
            <dd className="text-sm text-gray-900 flex-1">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
