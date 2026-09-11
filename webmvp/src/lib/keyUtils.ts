import { ALL_KEYS, type Key } from "@/lib/engine";

export function keyIndex(key: Key): number {
  return ALL_KEYS.indexOf(key);
}

export function transposeKeyBy(key: Key, semitones: number): Key {
  const idx = (keyIndex(key) + semitones + ALL_KEYS.length) % ALL_KEYS.length;
  return ALL_KEYS[idx];
}

export function isKey(value: string): value is Key {
  return (ALL_KEYS as readonly string[]).includes(value);
}
