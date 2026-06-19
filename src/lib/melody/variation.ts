import type { MelodyNote, MelodySettings } from '../types';
import type { SeededRandom } from '../utils/seededRandom';
import { getScaleDegree, getStablePitches, nearestPitch } from '../music/scales';
import { makeNote } from '../music/theory';
import type { PhraseDirective } from './phraseRolePlan';

export function repeatMotifWithVariation(params: {
  motif: MelodyNote[];
  phraseIndex: number;
  startOffsetBeats: number;
  totalBeats: number;
  scalePitches: number[];
  settings: MelodySettings;
  rng: SeededRandom;
  directive?: PhraseDirective;
}): MelodyNote[] {
  const { motif, phraseIndex, startOffsetBeats, totalBeats, scalePitches, settings, rng, directive } = params;
  const baseMaxChance = settings.variation * (settings.commercialSaferMode ? 0.42 : 0.62);
  const stablePitches = getStablePitches(scalePitches, settings.key, settings.scale);

  const notesInPhrase = motif
    .map((note, index) => ({ note, index }))
    .filter(({ note }) => note.startBeats + startOffsetBeats < totalBeats);
  const lastIndexInPhrase = notesInPhrase.length > 0 ? notesInPhrase[notesInPhrase.length - 1].index : -1;

  return motif
    .map((note, index) => {
      const copiedStart = note.startBeats + startOffsetBeats;
      if (copiedStart >= totalBeats) return null;

      if (directive && directive.restMultiplier > 1) {
        const dropChance = clamp((directive.restMultiplier - 1) * 0.18, 0, 0.35);
        if (rng.chance(dropChance)) return null;
      }

      let midi = note.midi;
      const anchorMidi = motif[index]?.midi ?? midi;
      const effectiveVariation = directive
        ? baseMaxChance * directive.variationMultiplier
        : phraseIndex > 0
          ? baseMaxChance
          : 0;
      const shouldMutate = effectiveVariation > 0 && rng.chance(effectiveVariation);
      const phraseIsFinal = copiedStart + note.durationBeats >= totalBeats - 0.25;
      const isLastInPhrase = index === lastIndexInPhrase;

      if (shouldMutate) {
        midi = mutatePitchWithDirective(midi, scalePitches, rng, settings.randomness, directive, anchorMidi);
      }

      const contrastBoost = directive?.contrastAmount ?? (phraseIndex > 1 ? 0.35 : 0);
      if (index === 0 && contrastBoost > 0 && rng.chance(settings.variation * contrastBoost)) {
        midi = mutatePitchWithDirective(midi, scalePitches, rng, settings.randomness * 0.5, directive, anchorMidi);
      }

      if (!directive && phraseIndex > 1 && index === 0 && rng.chance(settings.variation * 0.35)) {
        midi = mutatePitchByScaleStep(midi, scalePitches, rng, settings.randomness * 0.5);
      }

      if (directive && directive.hookReturnStrength > 0.5 && !shouldMutate && rng.chance(directive.hookReturnStrength * 0.35)) {
        midi = anchorMidi;
      }

      if (phraseIsFinal || isLastInPhrase) {
        if (directive?.stableEnding) {
          midi = nearestPitch(midi, stablePitches.length > 0 ? stablePitches : scalePitches);
        } else if (directive?.unresolvedEnding && isLastInPhrase) {
          midi = biasAwayFromStable(midi, scalePitches, settings.key, settings.scale, rng);
        } else if (phraseIsFinal && !directive) {
          midi = nearestPitch(midi, stablePitches.length > 0 ? stablePitches : scalePitches);
        }
      }

      const durationBeats = Math.min(note.durationBeats, totalBeats - copiedStart);
      const degree = getScaleDegree(midi, settings.key, settings.scale);
      let velocity = clamp(note.velocity + rng.range(-0.06, 0.07), 0.45, 0.92);
      if (directive) {
        velocity = clamp(velocity + directive.energyBias * 0.12, 0.45, 0.92);
      }

      return makeNote(midi, copiedStart, durationBeats, velocity, degree);
    })
    .filter((note): note is MelodyNote => note !== null && note.durationBeats > 0);
}

function mutatePitchWithDirective(
  midi: number,
  scalePitches: number[],
  rng: SeededRandom,
  randomness: number,
  directive?: PhraseDirective,
  anchorMidi?: number
): number {
  const index = scalePitches.indexOf(midi);
  if (index < 0) return midi;

  let direction: number;
  if (directive?.contourGoal === 'rising' || directive?.contourGoal === 'peak') {
    direction = rng.chance(0.7) ? 1 : -1;
  } else if (directive?.contourGoal === 'falling') {
    direction = rng.chance(0.7) ? -1 : 1;
  } else if (directive?.contourGoal === 'stable' && anchorMidi !== undefined) {
    const anchorIndex = scalePitches.indexOf(anchorMidi);
    if (anchorIndex >= 0) {
      direction = anchorIndex > index ? 1 : anchorIndex < index ? -1 : rng.chance(0.5) ? 1 : -1;
    } else {
      direction = rng.chance(0.5) ? 1 : -1;
    }
  } else {
    direction = rng.chance(0.5) ? 1 : -1;
  }

  const maxStep = randomness > 0.75 && rng.chance(0.25) ? 2 : 1;
  const contrastStep =
    directive && directive.contrastAmount > 0.5 ? Math.min(2, maxStep + 1) : maxStep;
  const nextIndex = clamp(index + direction * contrastStep, 0, scalePitches.length - 1);
  return scalePitches[nextIndex];
}

function mutatePitchByScaleStep(midi: number, scalePitches: number[], rng: SeededRandom, randomness: number): number {
  const index = scalePitches.indexOf(midi);
  if (index < 0) return midi;

  const maxStep = randomness > 0.75 && rng.chance(0.25) ? 2 : 1;
  const direction = rng.chance(0.5) ? 1 : -1;
  const nextIndex = clamp(index + direction * maxStep, 0, scalePitches.length - 1);
  return scalePitches[nextIndex];
}

function biasAwayFromStable(
  midi: number,
  scalePitches: number[],
  key: string,
  scale: import('../types').ScaleName,
  rng: SeededRandom
): number {
  const stablePitches = getStablePitches(scalePitches, key, scale);
  if (stablePitches.length === 0) return midi;

  const index = scalePitches.indexOf(midi);
  if (index < 0) return midi;

  const isStable = stablePitches.includes(midi);
  if (!isStable) return midi;

  const direction = rng.chance(0.5) ? 1 : -1;
  const nextIndex = clamp(index + direction, 0, scalePitches.length - 1);
  return scalePitches[nextIndex];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
