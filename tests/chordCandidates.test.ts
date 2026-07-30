import { describe, expect, it } from 'vitest';
import { createChordCandidatesForMelody } from '../src/lib/harmony/chordCandidates';
import { generateMelody, DEFAULT_SETTINGS } from '../src/lib/melody/generateMelody';
import { noteToPitchClass } from '../src/lib/music/notes';
import { SCALE_INTERVALS } from '../src/lib/music/scales';
import type { ScaleName } from '../src/lib/types';

describe('modal chord candidates', () => {
  for (const scale of Object.keys(SCALE_INTERVALS) as ScaleName[]) {
    it(`keeps every ${scale} triad inside the selected scale`, () => {
      const melody = generateMelody({
        ...DEFAULT_SETTINGS,
        seed: `test-chords-${scale}`,
        key: 'C',
        scale,
        bars: 4
      });
      const tonic = noteToPitchClass(melody.settings.key);
      const allowedPitchClasses = new Set(
        SCALE_INTERVALS[scale].map((interval) => (tonic + interval) % 12)
      );
      const bars = createChordCandidatesForMelody(melody).bars;

      expect(bars.length).toBeGreaterThan(0);
      expect(bars[0].candidates.length).toBeGreaterThanOrEqual(2);

      for (const candidate of bars[0].candidates) {
        expect(allowedPitchClasses.has(candidate.rootPitchClass)).toBe(true);
        expect(candidate.tones.every((tone) => allowedPitchClasses.has(tone.pitchClass))).toBe(true);
      }
    });
  }
});
