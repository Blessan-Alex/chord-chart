import type { Session } from "@/lib/types";

const TILE_GRADIENTS = [
  "from-emerald-600 to-teal-800",
  "from-violet-600 to-indigo-800",
  "from-rose-600 to-orange-800",
  "from-sky-600 to-blue-800",
  "from-amber-600 to-yellow-800",
  "from-fuchsia-600 to-purple-800",
];

export function sessionTileGradient(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash = (hash + sessionId.charCodeAt(i) * (i + 1)) % TILE_GRADIENTS.length;
  }
  return TILE_GRADIENTS[hash];
}

export function formatSessionDateShort(date: Session["date"]): string {
  return date.toDate().toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatSessionDateLong(date: Session["date"]): string {
  return date.toDate().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function sessionInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "♪";
  }
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function songInitials(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "♪";
  }
  return words[0].slice(0, 1).toUpperCase();
}
