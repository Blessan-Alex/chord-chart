/** Standard language tags for library filtering. Format: `lang:<language>`. */
export const LANGUAGE_TAGS = [
  { value: "lang:english", label: "English" },
  { value: "lang:malayalam", label: "Malayalam" },
  { value: "lang:hindi", label: "Hindi" },
  { value: "lang:tamil", label: "Tamil" },
  { value: "lang:marathi", label: "Marathi" },
  { value: "lang:telugu", label: "Telugu" },
] as const;

export type LanguageTagValue = (typeof LANGUAGE_TAGS)[number]["value"];

const LANGUAGE_TAG_PREFIX = "lang:";

export function isLanguageTag(tag: string): tag is LanguageTagValue {
  return tag.startsWith(LANGUAGE_TAG_PREFIX);
}

export function languageLabel(tag: string): string | null {
  const match = LANGUAGE_TAGS.find((entry) => entry.value === tag);
  return match?.label ?? null;
}

export function getLanguageTag(tags: string[]): LanguageTagValue | null {
  const match = tags.find(isLanguageTag);
  return match ?? null;
}

/** Replace any existing language tag with the selected one, or remove all language tags. */
export function setLanguageTag(tags: string[], languageTag: LanguageTagValue | null): string[] {
  const withoutLanguage = tags.filter((tag) => !isLanguageTag(tag));
  if (!languageTag) {
    return withoutLanguage;
  }
  return [...withoutLanguage, languageTag];
}
