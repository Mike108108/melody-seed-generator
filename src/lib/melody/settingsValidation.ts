import type { MelodySettings } from '../types';

export const MELODY_SETTING_LIMITS = {
  bpm: { min: 60, max: 190 },
  bars: { min: 2, max: 16 },
  octave: { min: 2, max: 6 },
  range: { min: 7, max: 36 }
} as const;

export type MelodySettingsValidation = {
  valid: boolean;
  errors: Partial<Record<keyof MelodySettings, string>>;
};

export function validateMelodySettings(settings: MelodySettings): MelodySettingsValidation {
  const errors: MelodySettingsValidation['errors'] = {};

  validateIntegerSetting('bars', settings.bars, MELODY_SETTING_LIMITS.bars, errors);
  validateIntegerSetting('bpm', settings.bpm, MELODY_SETTING_LIMITS.bpm, errors);
  validateIntegerSetting('octave', settings.octave, MELODY_SETTING_LIMITS.octave, errors);
  validateIntegerSetting('range', settings.range, MELODY_SETTING_LIMITS.range, errors);

  for (const key of ['density', 'restChance', 'variation', 'randomness'] as const) {
    const value = settings[key];
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      errors[key] = `${key} must be between 0 and 1.`;
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function validateIntegerSetting(
  key: 'bars' | 'bpm' | 'octave' | 'range',
  value: number,
  limits: { min: number; max: number },
  errors: MelodySettingsValidation['errors']
) {
  if (!Number.isInteger(value) || value < limits.min || value > limits.max) {
    errors[key] = `${key} must be a whole number from ${limits.min} to ${limits.max}.`;
  }
}
