let sessionReads = 0;

function enabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_READ_COUNTER === "true"
  );
}

/** Dev-only Firestore read counter (see docs/08-cost-budget.md). */
export function trackReads(label: string, count = 1): void {
  if (!enabled()) {
    return;
  }
  sessionReads += count;
  console.debug(`[readCounter] ${label}: +${count} (session total: ${sessionReads})`);
}

export function getReadCount(): number {
  return sessionReads;
}

export function resetReadCount(): void {
  sessionReads = 0;
}
