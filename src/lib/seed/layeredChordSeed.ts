import type { GeneratedMelody, LayeredSeed } from '../types';
import type { ChordTrackOptions } from '../harmony/chordLayer';
import { createChordTrackFromHarmonicPlan } from '../harmony/chordLayer';
import { createMelodyOnlyLayeredSeed } from './layeredSeed';

export function createLayeredSeedWithChordTrack(
  melody: GeneratedMelody,
  options?: ChordTrackOptions
): LayeredSeed {
  const melodyOnly = createMelodyOnlyLayeredSeed(melody);
  const chordTrack = createChordTrackFromHarmonicPlan(melody, options);

  if (chordTrack.notes.length === 0) {
    return melodyOnly;
  }

  return {
    ...melodyOnly,
    tracks: [...melodyOnly.tracks, chordTrack]
  };
}
