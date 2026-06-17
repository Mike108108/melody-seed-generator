import type { MelodyFingerprint, MelodyNote, MelodyScore, MelodySettings } from '../types';
import { averageAbsoluteInterval, melodicRange } from '../music/intervals';
import { isStableDegree } from '../music/scales';
import { detectCliches } from './blacklist';
import { estimateSimilarityRisk } from './similarity';

export function scoreMelody(params: {
  notes: MelodyNote[];
  settings: MelodySettings;
  fingerprint: MelodyFingerprint;
  previousFingerprints?: MelodyFingerprint[];
}): MelodyScore {
  const { notes, settings, fingerprint, previousFingerprints = [] } = params;
  const warnings = detectCliches(notes, fingerprint);
  const pitches = notes.map((note) => note.midi);
  const range = melodicRange(pitches);
  const avgInterval = averageAbsoluteInterval(pitches);
  const uniquePitches = new Set(pitches).size;
  const uniqueDurations = new Set(notes.map((note) => note.durationBeats)).size;
  const finalNote = notes[notes.length - 1];

  let quality = 50;
  quality += clamp(range, 3, settings.range) * 1.1;
  quality += uniquePitches * 2.2;
  quality += uniqueDurations * 3.2;
  quality += avgInterval >= 2 && avgInterval <= 5.5 ? 14 : -8;
  quality += finalNote && isStableDegree(finalNote.degree) ? 12 : -12;
  quality += notes.length >= settings.bars * 2 ? 10 : -10;
  quality -= warnings.length * 12;

  if (settings.commercialSaferMode) {
    quality += notes.length >= 10 ? 6 : -12;
    quality += uniquePitches >= 5 ? 7 : -10;
  }

  const similarityRiskScore = estimateSimilarityRisk(fingerprint, previousFingerprints) + warnings.length * 8;

  return {
    qualityScore: Math.round(clamp(quality, 0, 100)),
    similarityRiskScore: Math.round(clamp(similarityRiskScore, 0, 100)),
    warnings
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
