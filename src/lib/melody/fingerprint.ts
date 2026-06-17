import type { MelodyFingerprint, MelodyNote } from '../types';
import { contourSymbol } from '../music/intervals';
import { fnv1a } from '../utils/hash';

export function createFingerprint(notes: MelodyNote[]): MelodyFingerprint {
  const absolutePitches = notes.map((note) => note.midi);
  const pitchClasses = absolutePitches.map((midi) => ((midi % 12) + 12) % 12);
  const intervals = absolutePitches.slice(1).map((pitch, index) => pitch - absolutePitches[index]);
  const rhythm = notes.map((note) => `${note.startBeats.toFixed(2)}:${note.durationBeats.toFixed(2)}`);
  const contour = intervals.map(contourSymbol);
  const pitchNgrams = makeNgrams(pitchClasses.map(String), 4, 8);
  const intervalNgrams = makeNgrams(intervals.map(String), 4, 8);
  const payload = JSON.stringify({ pitchClasses, intervals, rhythm, contour });

  return {
    absolutePitches,
    pitchClasses,
    intervals,
    rhythm,
    contour,
    pitchNgrams,
    intervalNgrams,
    hash: fnv1a(payload)
  };
}

function makeNgrams(items: string[], minN: number, maxN: number): string[] {
  const grams: string[] = [];
  for (let n = minN; n <= maxN; n += 1) {
    if (items.length < n) continue;
    for (let i = 0; i <= items.length - n; i += 1) {
      grams.push(items.slice(i, i + n).join(','));
    }
  }
  return grams;
}
