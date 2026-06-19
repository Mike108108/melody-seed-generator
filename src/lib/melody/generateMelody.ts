import type { GeneratedMelody, MelodyFingerprint, MelodyNote, MelodySettings } from '../types';
import { SeededRandom } from '../utils/seededRandom';
import { createFingerprint } from './fingerprint';
import { createMotif } from './phrase';
import { getDirectiveForPhrase, type PhraseRolePlan } from './phraseRolePlan';
import { repeatMotifWithVariation } from './variation';
import { scoreMelody } from './scoring';

const BEATS_PER_BAR = 4;
const MAX_ATTEMPTS = 80;

export type GenerateMelodyOptions = {
  phraseRolePlan?: PhraseRolePlan;
};

export const DEFAULT_SETTINGS: MelodySettings = {
  seed: 'suno-seed-demo',
  bpm: 120,
  key: 'C',
  scale: 'minor',
  bars: 8,
  octave: 4,
  range: 18,
  density: 0.48,
  restChance: 0.14,
  variation: 0.45,
  randomness: 0.4,
  commercialSaferMode: true
};

export function generateMelody(
  settings: MelodySettings,
  previousFingerprints: MelodyFingerprint[] = [],
  options: GenerateMelodyOptions = {}
): GeneratedMelody {
  const { phraseRolePlan } = options;
  let best: GeneratedMelody | null = null;
  const attempts = settings.commercialSaferMode ? MAX_ATTEMPTS : 1;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const attemptSeed = attempt === 0 ? settings.seed : `${settings.seed}:attempt:${attempt}`;
    const rng = new SeededRandom(attemptSeed);
    const melody = buildCandidate(settings, rng, previousFingerprints, phraseRolePlan);

    if (!best || melody.qualityScore - melody.similarityRiskScore > best.qualityScore - best.similarityRiskScore) {
      best = melody;
    }

    const passesSaferMode = melody.qualityScore >= 68 && melody.similarityRiskScore <= 42 && melody.warnings.length === 0;
    if (!settings.commercialSaferMode || passesSaferMode) {
      return melody;
    }
  }

  return best ?? buildCandidate(settings, new SeededRandom(settings.seed), previousFingerprints, phraseRolePlan);
}

function buildCandidate(
  settings: MelodySettings,
  rng: SeededRandom,
  previousFingerprints: MelodyFingerprint[],
  phraseRolePlan?: PhraseRolePlan
): GeneratedMelody {
  const { motif, motifBars, context } = createMotif(settings, rng);
  const totalBeats = settings.bars * BEATS_PER_BAR;
  const phraseBeats = motifBars * BEATS_PER_BAR;
  const notes: MelodyNote[] = [];

  for (let start = 0, phraseIndex = 0; start < totalBeats; start += phraseBeats, phraseIndex += 1) {
    const directive = phraseRolePlan ? getDirectiveForPhrase(phraseRolePlan, phraseIndex) : undefined;

    notes.push(
      ...repeatMotifWithVariation({
        motif,
        phraseIndex,
        startOffsetBeats: start,
        totalBeats,
        scalePitches: context.scalePitches,
        settings,
        rng,
        directive
      })
    );
  }

  notes.sort((a, b) => a.startBeats - b.startBeats);
  const fingerprint = createFingerprint(notes);
  const score = scoreMelody({ notes, settings, fingerprint, previousFingerprints, phraseRolePlan });

  return {
    notes,
    settings,
    fingerprint,
    qualityScore: score.qualityScore,
    similarityRiskScore: score.similarityRiskScore,
    warnings: score.warnings,
    phraseRolePlan
  };
}
