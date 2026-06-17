import type { MelodyFingerprint, MelodyNote } from '../types';

const CLICHE_PITCH_CLASS_PATTERNS = [
  '0,0,7,7,9,9,7',
  '0,2,4,5,7,9,11,12',
  '0,11,9,7,5,4,2,0',
  '0,4,7,4,0',
  '0,7,0,7',
  '0,3,5,7,10,7,5,3'
];

export function detectCliches(notes: MelodyNote[], fingerprint: MelodyFingerprint): string[] {
  const warnings: string[] = [];
  const normalized = normalizePitchClasses(fingerprint.pitchClasses).join(',');

  if (fingerprint.intervals.length >= 5 && fingerprint.intervals.every((interval) => interval === 0)) {
    warnings.push('Too many repeated identical pitches.');
  }

  if (isMostlyStepwiseScaleRun(fingerprint.intervals)) {
    warnings.push('Looks like a plain scale run.');
  }

  if (hasLongRepeatedRhythm(notes)) {
    warnings.push('Rhythm is overly repetitive.');
  }

  if (CLICHE_PITCH_CLASS_PATTERNS.some((pattern) => normalized.includes(pattern))) {
    warnings.push('Contains a known cliche-like pitch-class pattern.');
  }

  if (fingerprint.contour.length >= 6 && new Set(fingerprint.contour.slice(0, 6)).size === 1) {
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

function hasLongRepeatedRhythm(notes: MelodyNote[]): boolean {
  if (notes.length < 8) return false;
  const durations = notes.map((note) => note.durationBeats.toFixed(2));
  const firstFour = durations.slice(0, 4).join(',');
  const secondFour = durations.slice(4, 8).join(',');
  const thirdFour = durations.slice(8, 12).join(',');
  return firstFour === secondFour && (thirdFour.length === 0 || firstFour === thirdFour);
}
