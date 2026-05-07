interface SectionHeaderProps {
  title: string;
  note?: string;
}

export function SectionHeader({ title, note }: SectionHeaderProps) {
  return (
    <div className="form-section-header">
      <span>{title}</span>
      {note && <span className="text-xs font-normal text-primary/70 ml-1">（{note}）</span>}
    </div>
  );
}
