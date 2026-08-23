export type ChordSlot = {
  chord: string;
  degree?: string;
  quality?: string;
};

export type Line = {
  lyrics: string;
  labels?: string[];
  slots: ChordSlot[];
};

export type Song = {
  id: string;
  title: string;
  originalKey: string;
  lines: Line[];
};
