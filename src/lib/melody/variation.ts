import type { MelodyNote, MelodySettings } from '../types';
import type { SeededRandom } from '../utils/seededRandom';
import { getScaleDegree, getStablePitches, nearestPitch } from '../music/scales';
import { makeNote } from '../music/theory';

export function repeatMotifWithVariation(params: {
  motif: MelodyNote[];
  phraseIndex: number;
  startOffsetBeats: number;
  totalBeats: number;
  scalePitches: number[];
  settings: MelodySettings;
  rng: SeededRandom;
}): MelodyNote[] {
  const { motif, phraseIndex, startOffsetBeats, totalBeats, scalePitches, settings, rng } = params;
  const maxChance = settings.variation * (settings.commercialSaferMode ? 0.42 : 0.62);
  const stablePitches = getStablePitches(scalePitches, settings.key, settings.scale);

  return motif
    .map((note, index) => {
      const copiedStart = note.startBeats + startOffsetBeats;
      if (copiedStart >= totalBeats) return null;

      let midi = note.midi;
      const shouldMutate = phraseIndex > 0 && rng.chance(maxChance);
      const phraseIsFinal = copiedStart + note.durationBeats >= totalBeats - 0.25;

      if (shouldMutate) {
        midi = mutatePitchByScaleStep(midi, scalePitches, rng, settings.randomness);
      }

      if (phraseIndex > 1 && index === 0 && rng.chance(settings.variation * 0.35)) {
        midi = mutatePitchByScaleStep(midi, scalePitches, rng, settings.randomness * 0.5);
      }

      if (phraseIsFinal) {
        midi = nearestPitch(midi, stablePitches.length > 0 ? stablePitches : scalePitches);
      }

      const durationBeats = Math.min(note.durationBeats, totalBeats - copiedStart);
      const degree = getScaleDegree(midi, settings.key, settings.scale);
      const velocity = clamp(note.velocity + rng.range(-0.06, 0.07), 0.45, 0.92);

      return makeNote(midi, copiedStart, durationBeats, velocity, degree);
    })
    .filter((note): note is MelodyNote => note !== null && note.durationBeats > 0);
}

function mutatePitchByScaleStep(midi: number, scalePitches: number[], rng: SeededRandom, randomness: number): number {
  const index = scalePitches.indexOf(midi);
  if (index < 0) return midi;

  const maxStep = randomness > 0.75 && rng.chance(0.25) ? 2 : 1;
  const direction = rng.chance(0.5) ? 1 : -1;
  const nextIndex = clamp(index + direction * maxStep, 0, scalePitches.length - 1);
  return scalePitches[nextIndex];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
