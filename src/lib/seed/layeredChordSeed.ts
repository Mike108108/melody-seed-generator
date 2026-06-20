import type { GeneratedMelody, LayeredSeed } from '../types';
import type { HarmonicPlanOptions } from '../harmony/harmonicPlan';
import { createChordTrackFromHarmonicPlan } from '../harmony/chordLayer';
import { createMelodyOnlyLayeredSeed } from './layeredSeed';

export function createLayeredSeedWithChordTrack(
  melody: GeneratedMelody,
  options?: HarmonicPlanOptions
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
