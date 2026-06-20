import type { ChordTrackOptions } from '../harmony/chordLayer';
import {
  chordHarmonicSignature,
  DEFAULT_CHORD_FEEL,
  DEFAULT_CHORD_LENGTH,
  DEFAULT_CHORD_PATTERN,
  type ChordFeel,
  type ChordLength,
  type ChordPattern
} from '../harmony/chordPerformance';
import type { GeneratedMelody, LayeredSeed, MelodyNote } from '../types';
import { createLayeredSeedWithChordTrack } from './layeredChordSeed';

export const MAX_CHORD_REGENERATE_ATTEMPTS = 64;

export type ChordLayerPerformance = {
  pattern: ChordPattern;
  length: ChordLength;
  feel: ChordFeel;
};

export type ChordLayerState = {
  enabled: boolean;
  layeredSeed: LayeredSeed;
  variant: number;
  seenHarmonicSignatures: string[];
  performance: ChordLayerPerformance;
};

export function getChordNotesFromLayeredSeed(layeredSeed: LayeredSeed): MelodyNote[] {
  return layeredSeed.tracks.find((track) => track.role === 'chords')?.notes ?? [];
}

export function hasChordLayerNotes(layeredSeed: LayeredSeed | null | undefined): boolean {
  return layeredSeed?.tracks.some((track) => track.role === 'chords' && track.notes.length > 0) ?? false;
}

export function getChordLayerSignature(layeredSeed: LayeredSeed): string {
  return chordHarmonicSignature(getChordNotesFromLayeredSeed(layeredSeed));
}

function buildChordLayeredSeed(
  melody: GeneratedMelody,
  variant: number,
  performance: ChordLayerPerformance
): LayeredSeed {
  const options: ChordTrackOptions = {
    variant,
    performance
  };
  return createLayeredSeedWithChordTrack(melody, options);
}

function areChordHarmoniesIdentical(current: MelodyNote[], next: MelodyNote[]): boolean {
  return chordHarmonicSignature(current) === chordHarmonicSignature(next);
}

export function createChordLayerState(
  melody: GeneratedMelody,
  performance: ChordLayerPerformance = {
    pattern: DEFAULT_CHORD_PATTERN,
    length: DEFAULT_CHORD_LENGTH,
    feel: DEFAULT_CHORD_FEEL
  }
): ChordLayerState {
  const layeredSeed = buildChordLayeredSeed(melody, 0, performance);
  const signature = getChordLayerSignature(layeredSeed);

  return {
    enabled: true,
    layeredSeed,
    variant: 0,
    seenHarmonicSignatures: signature ? [signature] : [],
    performance
  };
}

export function rebuildChordLayerPerformance(
  chordLayer: ChordLayerState,
  melody: GeneratedMelody,
  performance: ChordLayerPerformance
): ChordLayerState {
  return {
    ...chordLayer,
    performance,
    layeredSeed: buildChordLayeredSeed(melody, chordLayer.variant, performance)
  };
}

export function regenerateChordLayer(
  chordLayer: ChordLayerState,
  melody: GeneratedMelody
): ChordLayerState | null {
  if (!hasChordLayerNotes(chordLayer.layeredSeed)) {
    return null;
  }

  const currentChordNotes = getChordNotesFromLayeredSeed(chordLayer.layeredSeed);
  const seenSignatures = new Set(chordLayer.seenHarmonicSignatures);
  let attemptVariant = chordLayer.variant + 1;
  let chosenLayeredSeed: LayeredSeed | null = null;
  let chosenVariant = chordLayer.variant;
  let firstDifferentSeed: LayeredSeed | null = null;
  let firstDifferentVariant = attemptVariant;

  for (let attempt = 0; attempt < MAX_CHORD_REGENERATE_ATTEMPTS; attempt += 1) {
    const candidateSeed = buildChordLayeredSeed(melody, attemptVariant, chordLayer.performance);
    const candidateNotes = getChordNotesFromLayeredSeed(candidateSeed);
    const candidateSignature = chordHarmonicSignature(candidateNotes);

    if (areChordHarmoniesIdentical(currentChordNotes, candidateNotes)) {
      attemptVariant += 1;
      continue;
    }

    if (!firstDifferentSeed) {
      firstDifferentSeed = candidateSeed;
      firstDifferentVariant = attemptVariant;
    }

    if (!seenSignatures.has(candidateSignature)) {
      chosenLayeredSeed = candidateSeed;
      chosenVariant = attemptVariant;
      break;
    }

    attemptVariant += 1;
  }

  if (!chosenLayeredSeed && firstDifferentSeed) {
    chosenLayeredSeed = firstDifferentSeed;
    chosenVariant = firstDifferentVariant;
  }

  if (!chosenLayeredSeed) {
    return null;
  }

  const chosenSignature = getChordLayerSignature(chosenLayeredSeed);
  const seenHarmonicSignatures = chordLayer.seenHarmonicSignatures.includes(chosenSignature)
    ? chordLayer.seenHarmonicSignatures
    : [...chordLayer.seenHarmonicSignatures, chosenSignature];

  return {
    ...chordLayer,
    enabled: true,
    layeredSeed: chosenLayeredSeed,
    variant: chosenVariant,
    seenHarmonicSignatures
  };
}
