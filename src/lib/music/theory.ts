import type { MelodySettings, ScaleName } from '../types';
import type { SeededRandom } from '../utils/seededRandom';
import { midiToNoteName } from './notes';
import { getScaleDegree, getStablePitches, isStableDegree, nearestPitch } from './scales';

export function chooseStartingPitch(
  pitches: number[],
  key: string,
  scale: ScaleName,
  targetCenter: number,
  rng: SeededRandom
): number {
  const stable = getStablePitches(pitches, key, scale);
  const weighted = stable.map((pitch) => ({
    value: pitch,
    weight: 1 / (1 + Math.abs(pitch - targetCenter))
  }));
  return rng.pickWeighted(weighted.length > 0 ? weighted : pitches.map((pitch) => ({ value: pitch, weight: 1 })));
}

export function chooseNextPitch(params: {
  currentPitch: number;
  previousInterval: number;
  candidates: number[];
  settings: MelodySettings;
  rng: SeededRandom;
  targetCenter: number;
  forceStable?: boolean;
}): number {
  const { currentPitch, previousInterval, candidates, settings, rng, targetCenter, forceStable = false } = params;
  const maxLeap = settings.commercialSaferMode ? 7 : 10;
  const usableCandidates = candidates.filter((pitch) => Math.abs(pitch - currentPitch) <= maxLeap || forceStable);
  const pool = usableCandidates.length > 0 ? usableCandidates : candidates;

  if (forceStable) {
    const stable = getStablePitches(pool, settings.key, settings.scale);
    return nearestPitch(currentPitch, stable.length > 0 ? stable : pool);
  }

  const weighted = pool.map((pitch) => {
    const interval = pitch - currentPitch;
    const degree = getScaleDegree(pitch, settings.key, settings.scale);
    const absInterval = Math.abs(interval);

    let weight = 1;
    weight *= isStableDegree(degree) ? 1.8 : 1;
    weight *= absInterval === 0 ? 0.35 : 1;
    weight *= absInterval <= 2 ? 3.2 : 1;
    weight *= absInterval <= 5 ? 1.6 : 0.65;
    weight *= 1 / (1 + Math.abs(pitch - targetCenter) / 8);

    const directionChanged = Math.sign(interval) !== 0 && Math.sign(interval) !== Math.sign(previousInterval);
    if (Math.abs(previousInterval) > 5 && directionChanged) weight *= 2.4;
    if (Math.abs(previousInterval) > 5 && !directionChanged) weight *= 0.5;

    const weirdness = 0.35 + settings.randomness * 1.4;
    weight *= 1 - settings.randomness * 0.45 + rng.next() * weirdness;

    return { value: pitch, weight };
  });

  return rng.pickWeighted(weighted);
}

export function makeNote(midi: number, startBeats: number, durationBeats: number, velocity: number, degree: number) {
  return {
    midi,
    noteName: midiToNoteName(midi),
    startBeats,
    durationBeats,
    velocity,
    degree
  };
}
