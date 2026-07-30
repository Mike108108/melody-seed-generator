import type { MelodyNote } from '../types';

export type DisplayRange = { minMidi: number; maxMidi: number; span: number };

export function getDisplayRangeForNotes(
  notes: MelodyNote[],
  visibleRows: number,
  emptyMinMidi = 60
): DisplayRange {
  if (notes.length === 0) {
    return {
      minMidi: emptyMinMidi,
      maxMidi: emptyMinMidi + visibleRows - 1,
      span: visibleRows
    };
  }

  const noteMin = Math.min(...notes.map((note) => note.midi));
  const noteMax = Math.max(...notes.map((note) => note.midi));
  const noteSpan = noteMax - noteMin + 1;

  if (noteSpan >= visibleRows) {
    return { minMidi: noteMin, maxMidi: noteMax, span: noteSpan };
  }

  const center = (noteMin + noteMax) / 2;
  const minMidi = Math.round(center - (visibleRows - 1) / 2);
  return { minMidi, maxMidi: minMidi + visibleRows - 1, span: visibleRows };
}
