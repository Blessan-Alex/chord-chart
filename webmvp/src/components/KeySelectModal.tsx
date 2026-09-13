"use client";

import { ALL_KEYS, type Key } from "@/lib/engine";

type KeySelectModalProps = {
  open: boolean;
  originalKey: Key;
  selectedKey: Key;
  onSelect: (key: Key) => void;
  onClose: () => void;
};

export function KeySelectModal({
  open,
  originalKey,
  selectedKey,
  onSelect,
  onClose,
}: KeySelectModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
      <button
        type="button"
        aria-label="Close key picker"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-[var(--lf-radius-lg)] border border-lf-border bg-lf-bg-elevated p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-lf-text-primary">
              Select key
            </h2>
            <p className="text-sm text-lf-text-secondary">
              Original key: {originalKey}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-lf-text-secondary hover:bg-lf-bg-muted"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {ALL_KEYS.map((key) => {
            const isOriginal = key === originalKey;
            const isSelected = key === selectedKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onSelect(key);
                  onClose();
                }}
                className={`min-h-14 rounded-[var(--lf-radius-md)] border px-2 text-sm font-semibold transition-colors ${
                  isSelected
                    ? "border-lf-brand bg-lf-bg-active text-lf-brand"
                    : "border-lf-border bg-lf-bg-muted text-lf-text-primary hover:bg-lf-bg-active"
                }`}
              >
                <span className="block">{key}</span>
                {isOriginal && (
                  <span className="mt-0.5 block text-[10px] font-medium text-lf-text-secondary">
                    Original
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
