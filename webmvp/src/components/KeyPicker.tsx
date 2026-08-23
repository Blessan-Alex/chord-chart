import type { ChangeEvent } from "react";

import { MAJOR_KEYS } from "@/lib/engine";

type KeyPickerProps = {
  value: string;
  onChange: (key: string) => void;
  variant?: "default" | "performance";
};

function isMajorKey(key: string): key is (typeof MAJOR_KEYS)[number] {
  return (MAJOR_KEYS as readonly string[]).includes(key);
}

export function KeyPicker({
  value,
  onChange,
  variant = "default",
}: KeyPickerProps) {
  function handleSelectChange(event: ChangeEvent<HTMLSelectElement>) {
    const nextKey = event.target.value;
    if (typeof nextKey === "string" && isMajorKey(nextKey)) {
      onChange(nextKey);
    }
  }

  if (variant === "performance") {
    return (
      <label className="flex w-full items-center gap-3">
        <span className="shrink-0 text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Key:
        </span>
        <select
          value={value}
          onChange={handleSelectChange}
          className="min-h-11 flex-1 rounded-lg border-2 border-neutral-500 bg-neutral-900 px-4 py-2 text-xl font-semibold text-white sm:text-2xl"
        >
          {MAJOR_KEYS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="flex w-full flex-col gap-1 text-sm">
      <span className="text-neutral-600 dark:text-neutral-400">Key</span>
      <select
        value={value}
        onChange={handleSelectChange}
        className="min-h-11 w-full rounded border border-neutral-300 px-3 py-2 text-base dark:border-neutral-700 dark:bg-neutral-950"
      >
        {MAJOR_KEYS.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
    </label>
  );
}
