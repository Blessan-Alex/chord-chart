import {
  getLanguageTag,
  LANGUAGE_TAGS,
  setLanguageTag,
  type LanguageTagValue,
} from "@/lib/languageTags";

type LanguageTagPickerProps = {
  value: string[];
  onChange: (tags: string[]) => void;
};

export function LanguageTagPicker({ value, onChange }: LanguageTagPickerProps) {
  const selected = getLanguageTag(value);

  const handleSelect = (languageTag: LanguageTagValue | null) => {
    onChange(setLanguageTag(value, languageTag));
  };

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-lf-text-primary">Language</span>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => handleSelect(null)}
          className={`min-h-10 rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
            !selected
              ? "border-lf-brand bg-lf-bg-active text-lf-brand"
              : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
          }`}
        >
          None
        </button>
        {LANGUAGE_TAGS.map((entry) => {
          const isSelected = selected === entry.value;
          return (
            <button
              key={entry.value}
              type="button"
              onClick={() => handleSelect(entry.value)}
              className={`min-h-10 rounded-[var(--lf-radius-md)] border px-3 text-sm font-medium transition-colors ${
                isSelected
                  ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                  : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
              }`}
            >
              {entry.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
