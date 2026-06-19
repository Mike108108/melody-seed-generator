import type { MelodyFingerprint, MelodyNote, MelodyScore, MelodySettings } from '../types';
import { averageAbsoluteInterval, melodicRange } from '../music/intervals';
import { isStableDegree } from '../music/scales';
import { detectCliches } from './blacklist';
import type { PhraseRolePlan } from './phraseRolePlan';
import { phraseSignatureSimilarity, scoreMotifDevelopment, splitIntoPhraseChunks, type PhraseChunk } from './phraseAnalysis';
import { estimateSimilarityRisk } from './similarity';

export function scoreMelody(params: {
  notes: MelodyNote[];
  settings: MelodySettings;
  fingerprint: MelodyFingerprint;
  previousFingerprints?: MelodyFingerprint[];
  phraseRolePlan?: PhraseRolePlan;
}): MelodyScore {
  const { notes, settings, fingerprint, previousFingerprints = [], phraseRolePlan } = params;
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

  quality += scoreMotifDevelopment(phraseChunks);

  if (phraseRolePlan) {
    quality += scorePhraseRoleAlignment(phraseChunks, phraseRolePlan);
  }

  if (settings.commercialSaferMode) {
    quality += notes.length >= 10 ? 6 : -12;
    quality += uniquePitches >= 5 ? 7 : -10;
  }

  const baseSimilarityRisk = estimateSimilarityRisk(fingerprint, previousFingerprints, notes, settings.bars);
  const similarityRiskScore = baseSimilarityRisk + warnings.length * 8;

  return {
    qualityScore: Math.round(clamp(quality, 0, 100)),
    similarityRiskScore: Math.round(clamp(similarityRiskScore, 0, 100)),
    warnings
  };
}

function scorePhraseRoleAlignment(chunks: PhraseChunk[], plan: PhraseRolePlan): number {
  const anchor = chunks[0];
  if (!anchor || anchor.notes.length < 2) return 0;

  let bonus = 0;

  for (let i = 0; i < Math.min(chunks.length, plan.directives.length); i += 1) {
    const chunk = chunks[i];
    const directive = plan.directives[i];
    if (!chunk || chunk.notes.length < 2) continue;

    const lastNote = chunk.notes[chunk.notes.length - 1];

    if (directive.unresolvedEnding && lastNote && !isStableDegree(lastNote.degree)) {
      bonus += 2;
    }

    if (directive.stableEnding && lastNote && isStableDegree(lastNote.degree)) {
      bonus += 2;
    }

    if (i === 0) continue;

    const similarity = phraseSignatureSimilarity(chunk, anchor);

    if (directive.hookReturnStrength >= 0.7 && similarity >= 0.55 && similarity < 0.95) {
      bonus += 3;
    }

    if (directive.contrastAmount >= 0.5) {
      const contrast = 1 - similarity;
      if (contrast >= directive.contrastAmount * 0.12) bonus += 3;
    }

    if (directive.role === 'A_PRIME' && directive.variationMultiplier > 0) {
      if (similarity >= 0.45 && similarity < 0.92) bonus += 2;
    }
  }

  return Math.min(bonus, 12);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
