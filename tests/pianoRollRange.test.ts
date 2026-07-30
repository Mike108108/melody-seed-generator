import { describe, expect, it } from 'vitest';
import type { MelodyNote } from '../src/lib/types';
import { getDisplayRangeForNotes } from '../src/lib/visualization/pianoRollRange';

function note(midi: number): MelodyNote {
  return { midi, noteName: `midi-${midi}`, startBeats: 0, durationBeats: 1, velocity: 0.7, degree: 0 };
}

describe('piano roll display range', () => {
  it('contains the complete note range when it exceeds the default rows', () => {
    const range = getDisplayRangeForNotes([note(48), note(64)], 8);

    expect(range).toEqual({ minMidi: 48, maxMidi: 64, span: 17 });
  });

  it('keeps a minimum centered viewport for narrow material', () => {
    const range = getDisplayRangeForNotes([note(60), note(64)], 8);

    expect(range.span).toBe(8);
    expect(range.minMidi).toBeLessThanOrEqual(60);
    expect(range.maxMidi).toBeGreaterThanOrEqual(64);
  });
});
