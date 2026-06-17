import type { ScaleName } from '../types';
import { noteToMidi, noteToPitchClass } from './notes';

export const SCALE_INTERVALS: Record<ScaleName, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  'minor-pentatonic': [0, 3, 5, 7, 10],
  'major-pentatonic': [0, 2, 4, 7, 9]
};

export const SCALE_OPTIONS = Object.keys(SCALE_INTERVALS) as ScaleName[];

export function getScalePitches(key: string, scale: ScaleName, octave: number, rangeSemitones: number): number[] {
  const root = noteToMidi(key, octave);
  const max = root + rangeSemitones;
  const min = root - Math.min(12, Math.floor(rangeSemitones / 3));
  const pitchClasses = new Set(SCALE_INTERVALS[scale].map((interval) => (noteToPitchClass(key) + interval) % 12));
  const pitches: number[] = [];

  for (let midi = min; midi <= max; midi += 1) {
    if (pitchClasses.has(((midi % 12) + 12) % 12)) {
      pitches.push(midi);
    }
  }

  return pitches;
}

export function getScaleDegree(midi: number, key: string, scale: ScaleName): number {
  const rootPc = noteToPitchClass(key);
  const pc = ((midi % 12) + 12) % 12;
  const rel = (pc - rootPc + 12) % 12;
  const intervals = SCALE_INTERVALS[scale];
  const degree = intervals.indexOf(rel);
  return degree >= 0 ? degree : 0;
}

export function isStableDegree(degree: number): boolean {
  return degree === 0 || degree === 2 || degree === 4;
}

export function getStablePitches(pitches: number[], key: string, scale: ScaleName): number[] {
  return pitches.filter((midi) => isStableDegree(getScaleDegree(midi, key, scale)));
}

export function nearestPitch(target: number, candidates: number[]): number {
  return candidates.reduce((best, pitch) => (Math.abs(pitch - target) < Math.abs(best - target) ? pitch : best), candidates[0]);
}
