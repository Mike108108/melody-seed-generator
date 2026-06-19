import type { GeneratedMelody, LayeredSeed } from '../types';
import { createChordTrackFromHarmonicPlan } from '../harmony/chordLayer';
import { createMelodyOnlyLayeredSeed } from './layeredSeed';

export function createLayeredSeedWithChordTrack(melody: GeneratedMelody): LayeredSeed {
  const melodyOnly = createMelodyOnlyLayeredSeed(melody);
  const chordTrack = createChordTrackFromHarmonicPlan(melody);

  if (chordTrack.notes.length === 0) {
    return melodyOnly;
  }

  return {
    ...melodyOnly,
    tracks: [...melodyOnly.tracks, chordTrack]
  };
}
