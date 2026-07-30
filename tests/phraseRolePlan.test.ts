import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/lib/melody/generateMelody';
import { DEFAULT_INTENT } from '../src/lib/melody/intent';
import { createPhraseRolePlan } from '../src/lib/melody/phraseRolePlan';

describe('phrase role planning', () => {
  it('covers every phrase in a 16-bar seed by repeating the complete four-part arc', () => {
    const plan = createPhraseRolePlan(DEFAULT_INTENT, { ...DEFAULT_SETTINGS, bars: 16 });

    expect(plan.directives).toHaveLength(plan.phraseCount);
    expect(plan.directives.map((directive) => directive.role)).toEqual([
      'A',
      'A_PRIME',
      'B_CONTRAST',
      'A_RETURN',
      'A',
      'A_PRIME',
      'B_CONTRAST',
      'A_RETURN'
    ]);
  });
});
