import type { GeneratedMelody, GeneratedTrack } from '../types';
import type { ChordPerformanceOptions } from './chordPerformance';
import { renderChordNotesForBar } from './chordPerformance';
import { createHarmonicPlanForMelody, type HarmonicPlanOptions } from './harmonicPlan';

export type ChordTrackOptions = HarmonicPlanOptions & {
  performance?: ChordPerformanceOptions;
};

function createEmptyChordTrack(): GeneratedTrack {
  return {
    id: 'chord-layer',
    role: 'chords',
    name: 'Chord Layer',
    channel: 1,
    notes: []
  };
}

export function createChordTrackFromHarmonicPlan(
  melody: GeneratedMelody,
  options?: ChordTrackOptions
): GeneratedTrack {
  const plan = createHarmonicPlanForMelody(melody, options);
  const performance = options?.performance ?? {};

  const variant = options?.variant ?? 0;
  const performanceWithVariant = { ...performance, variant };

  if (plan.bars.length === 0) {
    return createEmptyChordTrack();
  }

  const notes = plan.bars.flatMap((planned, index) =>
    renderChordNotesForBar(melody, planned.barIndex, planned.candidate.tones, {
      ...performanceWithVariant,
      nextBarTones: plan.bars[index + 1]?.candidate.tones
    })
  );

  return {
    id: 'chord-layer',
    role: 'chords',
    name: 'Chord Layer',
    channel: 1,
    notes
  };
}
