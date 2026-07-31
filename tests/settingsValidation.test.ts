import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../src/lib/melody/generateMelody';
import { validateMelodySettings } from '../src/lib/melody/settingsValidation';

describe('melody settings validation', () => {
  it('accepts the documented boundary values', () => {
    expect(
      validateMelodySettings({
        ...DEFAULT_SETTINGS,
        bars: 2,
        bpm: 60,
        octave: 2,
        range: 7
      }).valid
    ).toBe(true);

    expect(
      validateMelodySettings({
        ...DEFAULT_SETTINGS,
        bars: 16,
        bpm: 190,
        octave: 6,
        range: 36
      }).valid
    ).toBe(true);
  });

  it.each([
    ['bars below minimum', { bars: 1 }],
    ['bars above maximum', { bars: 17 }],
    ['zero tempo', { bpm: 0 }],
    ['fractional tempo', { bpm: 120.5 }],
    ['octave above maximum', { octave: 7 }],
    ['range below minimum', { range: 6 }],
    ['non-finite value', { bars: Number.NaN }],
    ['slider outside range', { randomness: 1.1 }]
  ])('rejects %s', (_label, patch) => {
    expect(validateMelodySettings({ ...DEFAULT_SETTINGS, ...patch }).valid).toBe(false);
  });
});
