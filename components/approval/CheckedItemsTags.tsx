import type { CheckedItemsBySection } from "@/lib/types";

interface CheckedItemsTagsProps {
  sections: CheckedItemsBySection;
  /** fw_otherText が入力されている場合に追記表示 */
  otherText?: string;
}

const SECTION_LABELS: { key: keyof CheckedItemsBySection; label: string }[] = [
  { key: "fireWork",     label: "火気作業の種類" },
  { key: "combustibles", label: "周辺可燃物" },
  { key: "environment",  label: "作業環境" },
  { key: "prevention",   label: "防火対策" },
  { key: "equipment",    label: "消火設備" },
];

export function CheckedItemsTags({ sections, otherText }: CheckedItemsTagsProps) {
  const hasAny = SECTION_LABELS.some(({ key }) => sections[key].length > 0);

  if (!hasAny) {
    return (
      <div className="text-sm text-gray-400 text-center py-4">
        チェック項目なし
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {SECTION_LABELS.map(({ key, label }) => {
        const items = sections[key];
        if (items.length === 0) return null;

        return (
          <div key={key}>
            <p className="text-xs font-medium text-gray-500 mb-1.5">{label}</p>
            <div className="flex flex-wrap gap-1.5">
              {items.map((item) => (
                <span
                  key={item}
                  className="inline-block text-xs bg-primary-50 text-primary-700 border border-primary-200 rounded-full px-2.5 py-0.5"
                >
                  {item}
                </span>
              ))}
              {key === "fireWork" && otherText && (
                <span className="inline-block text-xs bg-gray-100 text-gray-700 border border-gray-200 rounded-full px-2.5 py-0.5">
                  {otherText}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
