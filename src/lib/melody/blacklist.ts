import type { MelodyFingerprint, MelodyNote } from '../types';
import { hasExcessivePhraseRepetition, splitIntoPhraseChunks } from './phraseAnalysis';

const CLICHE_PITCH_CLASS_PATTERNS = [
  '0,0,7,7,9,9,7',
  '0,2,4,5,7,9,11,12',
  '0,11,9,7,5,4,2,0',
  '0,4,7,4,0',
  '0,7,0,7',
  '0,3,5,7,10,7,5,3'
];

export function detectCliches(notes: MelodyNote[], fingerprint: MelodyFingerprint, bars: number): string[] {
  const warnings: string[] = [];
  const normalized = normalizePitchClasses(fingerprint.pitchClasses).join(',');
  const phraseChunks = splitIntoPhraseChunks(notes, bars);

  if (fingerprint.intervals.length >= 5 && fingerprint.intervals.every((interval) => interval === 0)) {
    warnings.push('Too many repeated identical pitches.');
  }

  if (notes.length > 0 && new Set(fingerprint.pitchClasses).size < 3) {
    warnings.push('Melody uses too few distinct pitch classes.');
  }

  if (isMostlyStepwiseScaleRun(fingerprint.intervals)) {
    warnings.push('Looks like a plain scale run.');
  }

  if (hasExcessivePhraseRhythmRepetition(phraseChunks)) {
    warnings.push('Rhythm is overly repetitive across phrases.');
  }

  if (CLICHE_PITCH_CLASS_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    warnings.push('Contains a known cliche-like pitch-class pattern.');
  }

  if (hasOneDirectionalOpeningContour(phraseChunks)) {
    warnings.push('Contour is too one-directional.');
  }

  return warnings;
}

function normalizePitchClasses(pitchClasses: number[]): number[] {
  if (pitchClasses.length === 0) return [];
  const root = pitchClasses[0];
  return pitchClasses.map((pc) => (pc - root + 12) % 12);
}

function isMostlyStepwiseScaleRun(intervals: number[]): boolean {
  if (intervals.length < 6) return false;
  const smallSteps = intervals.filter((interval) => Math.abs(interval) <= 2 && interval !== 0).length;
  const sameDirection = intervals.every((interval) => interval >= 0) || intervals.every((interval) => interval <= 0);
  return sameDirection && smallSteps / intervals.length > 0.8;
}

/** Allows A / A' motif repetition; warns only when 3+ phrase chunks are nearly identical. */
function hasExcessivePhraseRhythmRepetition(chunks: ReturnType<typeof splitIntoPhraseChunks>): boolean {
  if (chunks.length < 3) return false;

  const rhythmChunks = chunks.map((chunk) => ({
    ...chunk,
    signature: chunk.durations.join(',')
  }));

  const populated = rhythmChunks.filter((chunk) => chunk.notes.length > 0);
  if (populated.length < 3) return false;

  let matchAnchor = 1;
  for (let i = 1; i < populated.length; i += 1) {
    if (populated[i].signature === populated[0].signature) {
      matchAnchor += 1;
    }
  }
  if (matchAnchor >= 3) return true;

  for (let i = 0; i < populated.length - 2; i += 1) {
    const a = populated[i].signature;
    const b = populated[i + 1].signature;
    const c = populated[i + 2].signature;
    if (a === b && b === c) return true;
  }

  return hasExcessivePhraseRepetition(
    populated.map(({ phraseIndex, notes, durations, pitchClasses, intervals, contour }) => ({
      phraseIndex,
      notes,
      durations,
      pitchClasses,
      intervals,
      contour
    })),
    0.92
  );
}

/** Check contour monotony per phrase opening, not across intentional hook returns. */
function hasOneDirectionalOpeningContour(chunks: ReturnType<typeof splitIntoPhraseChunks>): boolean {
  const firstPhrase = chunks[0];
  if (!firstPhrase || firstPhrase.contour.length < 6) return false;
  return new Set(firstPhrase.contour.slice(0, 6)).size === 1;
}
