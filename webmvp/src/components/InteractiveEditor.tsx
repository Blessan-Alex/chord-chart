"use client";

import { useState } from "react";
import { ChordRow } from "@/components/ChordRow";
import { getDiatonicChords, isValidChord, type Key } from "@/lib/engine";
import type { Section } from "@/lib/types";

type InteractiveEditorProps = {
  sections: Section[];
  onSave: (sections: Section[]) => void;
  originalKey: Key;
};

export function InteractiveEditor({
  sections: initialSections,
  onSave,
  originalKey,
}: InteractiveEditorProps) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  const [activeChord, setActiveChord] = useState<{
    sIndex: number;
    lIndex: number;
    charIndex: number;
    currentVal: string;
  } | null>(null);
  const [chordError, setChordError] = useState<string | null>(null);

  const handleWordClick = (
    sIndex: number,
    lIndex: number,
    charIndex: number,
  ) => {
    // Check if there's already a chord here
    const line = sections[sIndex].lines[lIndex];
    const existing = line.chords.find((c) => c.position === charIndex);
    
    setChordError(null);
    setActiveChord({
      sIndex,
      lIndex,
      charIndex,
      currentVal: existing ? existing.chord : "",
    });
  };

  const commitChord = (chord: string) => {
    if (!activeChord) return;
    const trimmed = chord.trim();
    if (trimmed && !isValidChord(trimmed)) {
      setChordError("Invalid chord. Use formats like Am7, G/B, or Dsus4.");
      return;
    }
    setChordError(null);

    const { sIndex, lIndex, charIndex } = activeChord;
    
    setSections((prev) => {
      const next = [...prev];
      const section = { ...next[sIndex], lines: [...next[sIndex].lines] };
      const line = {
        ...section.lines[lIndex],
        chords: [...section.lines[lIndex].chords],
      };
      const chords = line.chords;
      
      const existingIdx = chords.findIndex((c) => c.position === charIndex);

      if (!trimmed) {
        // Delete if empty
        if (existingIdx >= 0) chords.splice(existingIdx, 1);
      } else {
        if (existingIdx >= 0) {
          chords[existingIdx] = { ...chords[existingIdx], chord: trimmed };
        } else {
          chords.push({ chord: trimmed, position: charIndex });
        }
      }
      
      line.chords = chords;
      section.lines[lIndex] = line;
      next[sIndex] = section;
      return next;
    });
    
    setActiveChord(null);
  };

  const removeChord = (sIndex: number, lIndex: number, charIndex: number) => {
    setSections((prev) => {
      const next = [...prev];
      const section = { ...next[sIndex], lines: [...next[sIndex].lines] };
      const line = {
        ...section.lines[lIndex],
        chords: section.lines[lIndex].chords.filter(
          (c) => c.position !== charIndex,
        ),
      };
      section.lines[lIndex] = line;
      next[sIndex] = section;
      return next;
    });
  };

  const palette = getDiatonicChords(originalKey);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-neutral-200 pb-4 dark:border-neutral-800">
        <h2 className="text-lg font-semibold">Step 2: Place Chords</h2>
        <button
          onClick={() => onSave(sections)}
          className="rounded bg-black px-4 py-1.5 text-sm font-medium text-white dark:bg-white dark:text-black"
        >
          Finish & Save
        </button>
      </div>

      <p className="text-sm text-neutral-500">
        Click any word to add a chord exactly above it.
      </p>

      <div className="chord-chart rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
        {sections.map((section, si) => (
          <div key={`s-${si}`} className="mb-6 last:mb-0">
            <div className="section-label">[{section.label}]</div>
            
            {section.lines.map((line, li) => {
              // Split lyrics by space to render clickable words, but keep exact char indices
              let currentIndex = 0;
              const words = line.lyrics.split(/(\s+)/); // keep spaces as elements

              return (
                <div key={`l-${li}`} className="chord-line mb-3 relative group">
                  
                  <ChordRow
                    chords={line.chords}
                    originalKey={originalKey}
                    targetKey={originalKey}
                    viewMode="chords"
                    onChordClick={(mark) => {
                      setChordError(null);
                      setActiveChord({
                        sIndex: si,
                        lIndex: li,
                        charIndex: mark.position,
                        currentVal: mark.chord,
                      });
                    }}
                  />

                  {/* Render lyrics as clickable words */}
                  <div className="lyric-row flex whitespace-pre min-w-max">
                    {words.map((word, wi) => {
                      const startIndex = currentIndex;
                      currentIndex += word.length;
                      
                      const isSpace = /^\s+$/.test(word);
                      if (isSpace) {
                        return <span key={wi}>{word}</span>;
                      }

                      return (
                        <span
                          key={wi}
                          className="cursor-pointer hover:bg-blue-50 hover:text-blue-600 active:bg-blue-100 rounded-sm px-px -mx-px dark:hover:bg-blue-900/30 dark:hover:text-blue-300"
                          onClick={() => handleWordClick(si, li, startIndex)}
                        >
                          {word}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Editor Modal / Palette */}
      {activeChord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl dark:bg-neutral-900 dark:border dark:border-neutral-800">
            <h3 className="mb-4 font-semibold text-lg">Enter Chord</h3>
            
            <form onSubmit={(e) => { e.preventDefault(); commitChord(activeChord.currentVal); }}>
              <input
                type="text"
                autoFocus
                className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-lg font-bold mb-4 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 dark:border-neutral-700 dark:bg-neutral-950"
                value={activeChord.currentVal}
                onChange={(e) => {
                  setChordError(null);
                  setActiveChord({ ...activeChord, currentVal: e.target.value });
                }}
                placeholder="e.g. Am7"
              />
              {chordError && (
                <p className="mb-4 text-sm text-red-600 dark:text-red-400">
                  {chordError}
                </p>
              )}
              
              <div className="grid grid-cols-3 gap-2 mb-6">
                {palette.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => commitChord(p)}
                    className="rounded-md bg-neutral-100 py-2 font-mono font-medium hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => {
                    removeChord(activeChord.sIndex, activeChord.lIndex, activeChord.charIndex);
                    setActiveChord(null);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Remove
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setChordError(null);
                      setActiveChord(null);
                    }}
                    className="text-neutral-500 hover:text-neutral-700 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded bg-black px-4 py-1.5 font-medium text-white dark:bg-white dark:text-black"
                  >
                    Save
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
