import type { MelodyFingerprint } from '../types';

export function estimateSimilarityRisk(fingerprint: MelodyFingerprint, previousFingerprints: MelodyFingerprint[] = []): number {
  const internalRisk = previousFingerprints.reduce((maxRisk, previous) => {
    return Math.max(maxRisk, fingerprintSimilarity(fingerprint, previous));
  }, 0);

  const selfRisk = repetitiveSelfSimilarity(fingerprint);
  return Math.round(Math.max(internalRisk, selfRisk) * 100);
}

export function fingerprintSimilarity(a: MelodyFingerprint, b: MelodyFingerprint): number {
  const intervalScore = jaccard(new Set(a.intervalNgrams), new Set(b.intervalNgrams));
  const pitchScore = jaccard(new Set(a.pitchNgrams), new Set(b.pitchNgrams));
  const contourScore = sequenceOverlap(a.contour, b.contour);
  const rhythmScore = sequenceOverlap(a.rhythm.map(durationOnly), b.rhythm.map(durationOnly));

  return clamp01(intervalScore * 0.38 + pitchScore * 0.22 + contourScore * 0.2 + rhythmScore * 0.2);
}

function repetitiveSelfSimilarity(fingerprint: MelodyFingerprint): number {
  const uniqueIntervals = new Set(fingerprint.intervals).size;
  const uniqueRhythms = new Set(fingerprint.rhythm.map(durationOnly)).size;
  const intervalPenalty = fingerprint.intervals.length > 0 ? 1 - uniqueIntervals / Math.max(1, fingerprint.intervals.length) : 0;
  const rhythmPenalty = fingerprint.rhythm.length > 0 ? 1 - uniqueRhythms / Math.max(1, fingerprint.rhythm.length) : 0;
  return clamp01(intervalPenalty * 0.5 + rhythmPenalty * 0.3);
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  const intersection = [...a].filter((item) => b.has(item)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

function sequenceOverlap(a: string[], b: string[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;
  let matches = 0;
  for (let i = 0; i < length; i += 1) {
    if (a[i] === b[i]) matches += 1;
  }
  return matches / Math.max(a.length, b.length);
}

function durationOnly(token: string): string {
  return token.split(':')[1] ?? token;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
