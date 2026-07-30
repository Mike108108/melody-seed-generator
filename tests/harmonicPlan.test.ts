import { describe, expect, it } from 'vitest';
import { createChordCandidatesForMelody } from '../src/lib/harmony/chordCandidates';
import { computePhraseScore } from '../src/lib/harmony/harmonicPlan';
import { generateMelody, DEFAULT_SETTINGS } from '../src/lib/melody/generateMelody';
import { DEFAULT_INTENT } from '../src/lib/melody/intent';
import { createPhraseRolePlan } from '../src/lib/melody/phraseRolePlan';

describe('phrase-aware harmonic scoring', () => {
  it('penalizes tonic resolution at an unresolved phrase ending', () => {
    const intent = { ...DEFAULT_INTENT, drama: 'question-answer' as const };
    const settings = { ...DEFAULT_SETTINGS, seed: 'unresolved-ending-test', bars: 8 };
    const melody = generateMelody(settings, [], {
      phraseRolePlan: createPhraseRolePlan(intent, settings)
    });
    const tonic = createChordCandidatesForMelody(melody).bars[1].candidates.find(
      (candidate) => candidate.degree === 1
    );

    expect(tonic).toBeDefined();
    expect(computePhraseScore(melody, 0, tonic!)).toBe(0);
    expect(computePhraseScore(melody, 1, tonic!)).toBeLessThan(0);
  });
});
