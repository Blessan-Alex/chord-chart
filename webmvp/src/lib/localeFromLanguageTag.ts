import { getLanguageTag, type LanguageTagValue } from "@/lib/languageTags";

/** BCP 47 locale for `Intl.Segmenter` / grapheme helpers. */
export function localeFromLanguageTag(tag: LanguageTagValue | null): string {
  switch (tag) {
    case "lang:malayalam":
      return "ml";
    case "lang:hindi":
      return "hi";
    case "lang:marathi":
      return "mr";
    case "lang:tamil":
      return "ta";
    case "lang:telugu":
      return "te";
    case "lang:english":
    default:
      return "en";
  }
}

export function graphemeLocaleFromTags(tags: string[]): string {
  return localeFromLanguageTag(getLanguageTag(tags));
}

/** `data-lyric-script` for editor font stack (CSS). */
export function lyricScriptFromTags(tags: string[]): string {
  const tag = getLanguageTag(tags);
  switch (tag) {
    case "lang:malayalam":
      return "malayalam";
    case "lang:hindi":
    case "lang:marathi":
      return "devanagari";
    case "lang:tamil":
      return "tamil";
    case "lang:telugu":
      return "telugu";
    default:
      return "latin";
  }
}
