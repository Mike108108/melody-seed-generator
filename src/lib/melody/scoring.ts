import type { MelodyFingerprint, MelodyNote, MelodyScore, MelodySettings } from '../types';
import { averageAbsoluteInterval, melodicRange } from '../music/intervals';
import { isStableDegree } from '../music/scales';
import { detectCliches } from './blacklist';
import { scoreMotifDevelopment, splitIntoPhraseChunks } from './phraseAnalysis';
import { estimateSimilarityRisk } from './similarity';

export function scoreMelody(params: {
  notes: MelodyNote[];
  settings: MelodySettings;
  fingerprint: MelodyFingerprint;
  previousFingerprints?: MelodyFingerprint[];
}): MelodyScore {
  const { notes, settings, fingerprint, previousFingerprints = [] } = params;
  const warnings = detectCliches(notes, fingerprint, settings.bars);
  const phraseChunks = splitIntoPhraseChunks(notes, settings.bars);
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

  // Hook-first foundation: reward coherent A → A' → B → A'' development.
  // Future: Hook Score, Singability, Drama intent layers can plug in here.
  quality += scoreMotifDevelopment(phraseChunks);

  if (settings.commercialSaferMode) {
    quality += notes.length >= 10 ? 6 : -12;
    quality += uniquePitches >= 5 ? 7 : -10;
  }

  const baseSimilarityRisk = estimateSimilarityRisk(fingerprint, previousFingerprints, notes, settings.bars);
  // Only escalate similarity risk when warnings indicate excessive copy-paste, not normal hook repetition.
  const similarityRiskScore = baseSimilarityRisk + warnings.length * 8;

  return {
    qualityScore: Math.round(clamp(quality, 0, 100)),
    similarityRiskScore: Math.round(clamp(similarityRiskScore, 0, 100)),
    warnings
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
