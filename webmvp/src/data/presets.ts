import type { Key } from "@/lib/engine";
import type { ChordMark, LyricLine, Section } from "@/lib/types";

// Parses "[C]Twinkle, [Am]twinkle" → { lyrics: "Twinkle, twinkle", chords: [{chord:"C",position:0},{chord:"Am",position:9}] }
function L(input: string): LyricLine {
  const chords: ChordMark[] = [];
  let lyrics = "";
  let i = 0;

  while (i < input.length) {
    if (input[i] === "[") {
      const end = input.indexOf("]", i);
      if (end !== -1) {
        chords.push({ chord: input.slice(i + 1, end), position: lyrics.length });
        i = end + 1;
        continue;
      }
    }
    lyrics += input[i];
    i++;
  }

  return { lyrics, chords };
}

function S(label: string, lines: LyricLine[]): Section {
  return { label, lines };
}

export type SongPreset = {
  presetId: string;
  title: string;
  originalKey: Key;
  sections: Section[];
};

export const SONG_PRESETS: SongPreset[] = [
  // ──────────────────────────────────────────
  // 1. Twinkle Twinkle Little Star
  // ──────────────────────────────────────────
  {
    presetId: "twinkle",
    title: "Twinkle Twinkle Little Star",
    originalKey: "C",
    sections: [
      S("Verse", [
        L("[C]Twinkle, [C]twinkle, [F]little [C]star,"),
        L("[F]How I [C]wonder [G]what you [C]are."),
        L("[C]Up a[F]bove the [C]world so [G]high,"),
        L("[C]Like a [F]diamond [C]in the [G]sky."),
        L("[C]Twinkle, [C]twinkle, [F]little [C]star,"),
        L("[F]How I [C]wonder [G]what you [C]are."),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 2. Amazing Grace
  // ──────────────────────────────────────────
  {
    presetId: "amazing-grace",
    title: "Amazing Grace",
    originalKey: "G",
    sections: [
      S("Verse 1", [
        L("[G]Amazing grace, how [C]sweet the [G]sound,"),
        L("That saved a [Em]wretch like [D]me."),
        L("I [G]once was lost, but [C]now am [G]found,"),
        L("Was blind, but [D]now I [G]see."),
      ]),
      S("Verse 2", [
        L("'Twas [G]grace that taught my [C]heart to [G]fear,"),
        L("And grace my [Em]fears re[D]lieved."),
        L("How [G]precious did that [C]grace ap[G]pear,"),
        L("The hour I [D]first be[G]lieved."),
      ]),
      S("Verse 3", [
        L("Through [G]many dangers, [C]toils and [G]snares,"),
        L("I have al[Em]ready [D]come."),
        L("'Tis [G]grace hath brought me [C]safe thus [G]far,"),
        L("And grace will [D]lead me [G]home."),
      ]),
      S("Verse 4", [
        L("When [G]we've been there ten [C]thousand [G]years,"),
        L("Bright shining [Em]as the [D]sun,"),
        L("We've [G]no less days to [C]sing God's [G]praise,"),
        L("Than when we [D]first be[G]gun."),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 3. Blessed Be Your Name
  // ──────────────────────────────────────────
  {
    presetId: "blessed-be-your-name",
    title: "Blessed Be Your Name",
    originalKey: "A",
    sections: [
      S("Verse 1", [
        L("[A]Blessed be Your [E]name"),
        L("In the [F#m]land that is [D]plentiful"),
        L("Where Your [A]streams of a[E]bundance flow"),
        L("Blessed [F#m]be Your [D]name"),
      ]),
      S("Verse 2", [
        L("[A]Blessed be Your [E]name"),
        L("When I'm [F#m]found in the [D]desert place"),
        L("Though I [A]walk through the [E]wilderness"),
        L("Blessed [F#m]be Your [D]name"),
      ]),
      S("Pre-Chorus", [
        L("[A]Every blessing [E]You pour out I'll"),
        L("[F#m]Turn back to [D]praise"),
        L("[A]When the darkness [E]closes in, Lord"),
        L("[F#m]Still I will [D]say"),
      ]),
      S("Chorus", [
        L("[A]Blessed be the [E]name of the Lord"),
        L("Blessed be Your [F#m]name"),
        L("[A]Blessed be the [E]name of the Lord"),
        L("Blessed be Your [F#m]glorious [D]name"),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 4. Good Good Father
  // ──────────────────────────────────────────
  {
    presetId: "good-good-father",
    title: "Good Good Father",
    originalKey: "A",
    sections: [
      S("Verse 1", [
        L("[A]Oh, I've heard a [E/G#]thousand stories"),
        L("[F#m]Of what they [D]think You're like"),
        L("[A]But I've heard the [E/G#]tender whisper"),
        L("[F#m]Of love in the [D]dead of night"),
        L("[A]And You tell me [E/G#]that You're pleased"),
        L("[F#m]And that I'm [D]never a[A]lone"),
      ]),
      S("Chorus", [
        L("[D]You're a Good, Good [A]Father"),
        L("[E]It's who You [F#m]are, it's who You [D]are, it's who You are"),
        L("[D]And I'm loved by [A]You"),
        L("[E]It's who I [F#m]am, it's who I [D]am, it's who I am"),
      ]),
      S("Verse 2", [
        L("[A]Oh, and I've seen [E/G#]many searching"),
        L("[F#m]For answers [D]far and wide"),
        L("[A]But I know we're [E/G#]all searching"),
        L("[F#m]For answers only [D]You provide"),
        L("[A]'Cause You know just [E/G#]what we need"),
        L("[F#m]Before we [D]say a [A]word"),
      ]),
      S("Bridge", [
        L("[D]You are [A]perfect in [E]all of Your [F#m]ways"),
        L("[D]You are [A]perfect in [E]all of Your [F#m]ways"),
        L("[D]You are [A]perfect in [E]all of Your [F#m]ways to [D]us"),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 5. How Great Thou Art
  // ──────────────────────────────────────────
  {
    presetId: "how-great-thou-art",
    title: "How Great Thou Art",
    originalKey: "G",
    sections: [
      S("Verse 1", [
        L("O Lord my [G]God, when I in [C]awesome wonder"),
        L("Con[G]sider [D]all the worlds Thy [G]hands have made"),
        L("I see the [G]stars, I hear the [C]rolling thunder"),
        L("Thy [G]power through[D]out the uni[G]verse displayed"),
      ]),
      S("Chorus", [
        L("Then sings my [G]soul, my Savior [C]God, to Thee"),
        L("How great Thou [G]art, how [D]great Thou [G]art"),
        L("Then sings my [G]soul, my Savior [C]God, to Thee"),
        L("How great Thou [G]art, how [D]great Thou [G]art"),
      ]),
      S("Verse 2", [
        L("When through the [G]woods and forest [C]glades I wander"),
        L("And hear the [G]birds sing [D]sweetly in the [G]trees"),
        L("When I look [G]down from lofty [C]mountain grandeur"),
        L("And hear the [G]brook and [D]feel the gentle [G]breeze"),
      ]),
      S("Verse 3", [
        L("And when I [G]think that God, His [C]Son not sparing"),
        L("Sent Him to [G]die, I [D]scarce can take it [G]in"),
        L("That on the [G]cross, my burden [C]gladly bearing"),
        L("He bled and [G]died to [D]take away my [G]sin"),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 6. 10,000 Reasons (Bless the Lord)
  // ──────────────────────────────────────────
  {
    presetId: "ten-thousand-reasons",
    title: "10,000 Reasons (Bless the Lord)",
    originalKey: "G",
    sections: [
      S("Chorus", [
        L("[G]Bless the [D]Lord, O my [Em]soul, [C]O my soul"),
        L("[G]Worship His [D]holy [C]name"),
        L("Sing like [Em]never be[C]fore, [G]O my [D]soul"),
        L("I'll [C]worship Your [D]holy [G]name"),
      ]),
      S("Verse 1", [
        L("The [G]sun comes [D]up, it's a [Em]new day [C]dawning"),
        L("[G]It's time to [D]sing Your [C]song again"),
        L("What[G]ever may [D]pass, and what[Em]ever lies be[C]fore me"),
        L("[G]Let me be [D]singing when the [C]evening [G]comes"),
      ]),
      S("Verse 2", [
        L("You're [G]rich in [D]love and You're [Em]slow to [C]anger"),
        L("Your [G]name is [D]great and Your [C]heart is kind"),
        L("For [G]all Your [D]goodness I will [Em]keep on [C]singing"),
        L("[G]Ten thousand [D]reasons for my [C]heart to [G]find"),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 7. Great Is Thy Faithfulness
  // ──────────────────────────────────────────
  {
    presetId: "great-is-thy-faithfulness",
    title: "Great Is Thy Faithfulness",
    originalKey: "D",
    sections: [
      S("Verse 1", [
        L("[D]Great is Thy [D7]faithfulness, [G]O God my [D]Father"),
        L("There is no [Bm]shadow of [A]turning with Thee"),
        L("[D]Thou changest [D7]not, Thy com[G]passions they [D]fail not"),
        L("As Thou hast [A]been, Thou for[D]ever wilt be"),
      ]),
      S("Chorus", [
        L("[D]Great is Thy [G]faithfulness, [D]great is Thy [A]faithfulness"),
        L("[D]Morning by [Bm]morning new [A]mercies I see"),
        L("[D]All I have [D7]needed Thy [G]hand hath pro[Em]vided"),
        L("[D]Great is Thy [A]faithfulness, [D]Lord, unto me"),
      ]),
      S("Verse 2", [
        L("[D]Summer and [D7]winter and [G]springtime and [D]harvest"),
        L("Sun, moon and [Bm]stars in their [A]courses above"),
        L("[D]Join with all [D7]nature in [G]manifold [D]witness"),
        L("To Thy great [A]faithfulness, [D]mercy and love"),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 8. Holy Spirit
  // ──────────────────────────────────────────
  {
    presetId: "holy-spirit",
    title: "Holy Spirit",
    originalKey: "G",
    sections: [
      S("Verse 1", [
        L("[G]Holy Spirit, [Em]You are welcome here"),
        L("[C]Come flood this [D]place and fill the atmosphere"),
        L("[G]Your glory, [Em]God, is what our hearts long for"),
        L("[C]To be over[D]come by Your presence, Lord"),
      ]),
      S("Verse 2", [
        L("[G]Holy Spirit, [Em]You are welcome here"),
        L("[C]Come flood this [D]place and fill the atmosphere"),
        L("[G]Your glory, [Em]God, is what our hearts long for"),
        L("[C]To be over[D]come by Your presence, Lord"),
      ]),
      S("Chorus", [
        L("Let us be[G]come more a[Em]ware of Your presence"),
        L("Let us ex[C]perience the [D]glory of Your goodness"),
        L("Let us be[G]come more a[Em]ware of Your presence"),
        L("Let us ex[C]perience the [D]glory of Your [G]goodness"),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 9. Way Maker
  // ──────────────────────────────────────────
  {
    presetId: "way-maker",
    title: "Way Maker",
    originalKey: "E",
    sections: [
      S("Verse 1", [
        L("[E]You are here, [B]moving in our midst"),
        L("[C#m]I worship [A]You, I worship You"),
        L("[E]You are here, [B]working in this place"),
        L("[C#m]I worship [A]You, I worship You"),
      ]),
      S("Chorus", [
        L("[E]Way maker, [B]miracle worker"),
        L("[C#m]Promise keeper, [A]light in the darkness"),
        L("[E]My God, [B]that is who You [C#m]are[A]"),
      ]),
      S("Verse 2", [
        L("[E]You are here, [B]touching every heart"),
        L("[C#m]I worship [A]You, I worship You"),
        L("[E]You are here, [B]healing every heart"),
        L("[C#m]I worship [A]You, I worship You"),
      ]),
      S("Verse 3", [
        L("[E]You are here, [B]turning lives around"),
        L("[C#m]I worship [A]You, I worship You"),
        L("[E]You are here, [B]mending every heart"),
        L("[C#m]I worship [A]You, I worship You"),
      ]),
      S("Tag", [
        L("[E]Even when I don't [B]see it, You're working"),
        L("[C#m]Even when I don't [A]feel it, You're working"),
        L("[E]You never stop, You [B]never stop working"),
        L("[C#m]You never stop, You [A]never stop working"),
      ]),
    ],
  },

  // ──────────────────────────────────────────
  // 10. What a Beautiful Name
  // ──────────────────────────────────────────
  {
    presetId: "what-a-beautiful-name",
    title: "What a Beautiful Name",
    originalKey: "D",
    sections: [
      S("Verse 1", [
        L("[D]You were the Word at the [A]beginning"),
        L("[Bm]One with God the Lord [G]Most High"),
        L("[D]Your hidden glory in [A]creation"),
        L("[Bm]Now revealed in You our [G]Christ"),
      ]),
      S("Chorus 1", [
        L("What a [D]beautiful [A]Name it is"),
        L("What a [Bm]beautiful [G]Name it is"),
        L("The Name of [D]Jesus [A]Christ my King"),
        L("What a [Bm]beautiful [G]Name it is"),
        L("Nothing com[D]pares to [A]this"),
        L("What a [Bm]beautiful [G]Name it is"),
        L("The Name of [D]Jesus"),
      ]),
      S("Verse 2", [
        L("[D]You didn't want heaven with[A]out us"),
        L("[Bm]So Jesus, You brought heaven [G]down"),
        L("[D]My sin was great, Your love was [A]greater"),
        L("[Bm]What could separate us [G]now"),
      ]),
      S("Chorus 2", [
        L("What a [D]wonderful [A]Name it is"),
        L("What a [Bm]wonderful [G]Name it is"),
        L("The Name of [D]Jesus [A]Christ my King"),
        L("What a [Bm]wonderful [G]Name it is"),
        L("Nothing com[D]pares to [A]this"),
        L("What a [Bm]wonderful [G]Name it is"),
        L("The Name of [D]Jesus"),
      ]),
      S("Bridge", [
        L("[Bm]Death could not [A]hold You, the [D]veil tore be[G]fore You"),
        L("[Bm]You silence the [A]boast of sin and [D]grave[G]"),
        L("[Bm]The heavens are [A]roaring the [D]praise of Your [G]glory"),
        L("[Bm]For You are [A]raised to life a[D]gain[G]"),
      ]),
    ],
  },
];

export function getPresetById(presetId: string): SongPreset | undefined {
  return SONG_PRESETS.find((preset) => preset.presetId === presetId);
}
