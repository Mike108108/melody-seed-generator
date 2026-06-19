import type { MelodySettings, ScaleName } from '../types';

export type MelodyGenre =
  | 'pop-hook'
  | 'dark-trap'
  | 'edm-lead'
  | 'afro-house'
  | 'cinematic'
  | 'hyperpop';

export type MelodyRole = 'chorus-hook' | 'verse-motif' | 'drop-lead' | 'pre-chorus-lift';

export type MelodyDrama = 'question-answer' | 'build-release' | 'call-response' | 'loopable-hook';

export type MelodyComplexity = 'simple' | 'balanced' | 'twisty';

export type MelodyHookiness = 'safe' | 'catchy' | 'bold';

export type MelodyIntent = {
  genre: MelodyGenre;
  role: MelodyRole;
  drama: MelodyDrama;
  complexity: MelodyComplexity;
  hookiness: MelodyHookiness;
};

export type GenerationProfile = {
  intent: MelodyIntent;
  bpm: number;
  scale: ScaleName;
  bars: number;
  octave: number;
  range: number;
  density: number;
  restChance: number;
  variation: number;
  randomness: number;
  commercialSaferMode: boolean;
  summary: string;
};

export const GENRE_OPTIONS: { value: MelodyGenre; label: string }[] = [
  { value: 'pop-hook', label: 'Pop Diatonic' },
  { value: 'dark-trap', label: 'Dark Minor' },
  { value: 'edm-lead', label: 'EDM Bright' },
  { value: 'afro-house', label: 'Afro Modal' },
  { value: 'cinematic', label: 'Cinematic Minor' },
  { value: 'hyperpop', label: 'Hyperpop Bright' }
];

export const ROLE_OPTIONS: { value: MelodyRole; label: string }[] = [
  { value: 'chorus-hook', label: 'Chorus Hook' },
  { value: 'verse-motif', label: 'Verse' },
  { value: 'drop-lead', label: 'Drop' },
  { value: 'pre-chorus-lift', label: 'Pre-Chorus' }
];

export const DRAMA_OPTIONS: { value: MelodyDrama; label: string }[] = [
  { value: 'question-answer', label: 'Question → Answer' },
  { value: 'build-release', label: 'Build → Release' },
  { value: 'call-response', label: 'Call → Response' },
  { value: 'loopable-hook', label: 'Loopable Hook' }
];

export const COMPLEXITY_OPTIONS: { value: MelodyComplexity; label: string }[] = [
  { value: 'simple', label: 'Simple' },
  { value: 'balanced', label: 'Balanced' },
  { value: 'twisty', label: 'Twisty' }
];

export const HOOKINESS_OPTIONS: { value: MelodyHookiness; label: string }[] = [
  { value: 'safe', label: 'Light' },
  { value: 'catchy', label: 'Catchy' },
  { value: 'bold', label: 'Strong' }
];

export const DEFAULT_INTENT: MelodyIntent = {
  genre: 'pop-hook',
  role: 'chorus-hook',
  drama: 'loopable-hook',
  complexity: 'balanced',
  hookiness: 'catchy'
};

type ProfileDraft = Omit<GenerationProfile, 'intent' | 'summary'>;

const GENRE_BASE: Record<MelodyGenre, ProfileDraft> = {
  'pop-hook': {
    bpm: 118,
    scale: 'major',
    bars: 8,
    octave: 4,
    range: 16,
    density: 0.52,
    restChance: 0.12,
    variation: 0.42,
    randomness: 0.35,
    commercialSaferMode: true
  },
  'dark-trap': {
    bpm: 140,
    scale: 'minor',
    bars: 8,
    octave: 3,
    range: 14,
    density: 0.38,
    restChance: 0.22,
    variation: 0.35,
    randomness: 0.45,
    commercialSaferMode: true
  },
  'edm-lead': {
    bpm: 128,
    scale: 'major',
    bars: 8,
    octave: 5,
    range: 20,
    density: 0.55,
    restChance: 0.08,
    variation: 0.48,
    randomness: 0.42,
    commercialSaferMode: true
  },
  'afro-house': {
    bpm: 124,
    scale: 'mixolydian',
    bars: 8,
    octave: 4,
    range: 18,
    density: 0.5,
    restChance: 0.15,
    variation: 0.4,
    randomness: 0.38,
    commercialSaferMode: true
  },
  cinematic: {
    bpm: 90,
    scale: 'minor',
    bars: 8,
    octave: 4,
    range: 22,
    density: 0.35,
    restChance: 0.25,
    variation: 0.5,
    randomness: 0.55,
    commercialSaferMode: true
  },
  hyperpop: {
    bpm: 160,
    scale: 'lydian',
    bars: 8,
    octave: 5,
    range: 24,
    density: 0.58,
    restChance: 0.06,
    variation: 0.55,
    randomness: 0.65,
    commercialSaferMode: true
  }
};

export function createGenerationProfile(intent: MelodyIntent): GenerationProfile {
  const profile = { ...GENRE_BASE[intent.genre] };

  applyRole(profile, intent.role);
  applyDrama(profile, intent.drama);
  applyComplexity(profile, intent.complexity);
  applyHookiness(profile, intent.hookiness);

  profile.density = clamp(profile.density, 0.2, 0.75);
  profile.restChance = clamp(profile.restChance, 0.04, 0.35);
  profile.variation = clamp(profile.variation, 0.15, 0.75);
  profile.randomness = clamp(profile.randomness, 0.1, 0.85);
  profile.bpm = clamp(Math.round(profile.bpm), 60, 190);
  profile.bars = clamp(Math.round(profile.bars), 2, 16);
  profile.octave = clamp(Math.round(profile.octave), 2, 6);
  profile.range = clamp(Math.round(profile.range), 7, 36);

  const summary = [
    labelFor(GENRE_OPTIONS, intent.genre),
    labelFor(ROLE_OPTIONS, intent.role),
    labelFor(DRAMA_OPTIONS, intent.drama)
  ].join(' · ');

  return {
    intent,
    ...profile,
    summary
  };
}

export function applyIntentToSettings(settings: MelodySettings, intent: MelodyIntent): MelodySettings {
  const profile = createGenerationProfile(intent);

  return {
    ...settings,
    bpm: profile.bpm,
    scale: profile.scale,
    bars: profile.bars,
    octave: profile.octave,
    range: profile.range,
    density: profile.density,
    restChance: profile.restChance,
    variation: profile.variation,
    randomness: profile.randomness
    // commercialSaferMode: preserved from settings — always enabled by default
  };
}

function applyRole(profile: ProfileDraft, role: MelodyRole): void {
  switch (role) {
    case 'chorus-hook':
      profile.bars = 8;
      profile.density += 0.05;
      profile.restChance -= 0.02;
      profile.variation = 0.45;
      break;
    case 'verse-motif':
      profile.bars = 4;
      profile.density -= 0.08;
      profile.restChance += 0.06;
      profile.variation = 0.55;
      profile.randomness -= 0.05;
      break;
    case 'drop-lead':
      profile.bars = 8;
      profile.density = 0.58;
      profile.restChance = 0.06;
      profile.variation = 0.35;
      profile.octave += 1;
      profile.range += 2;
      break;
    case 'pre-chorus-lift':
      profile.bars = 4;
      profile.density = 0.46;
      profile.restChance = 0.12;
      profile.variation = 0.52;
      profile.range += 2;
      break;
  }
}

function applyDrama(profile: ProfileDraft, drama: MelodyDrama): void {
  switch (drama) {
    case 'question-answer':
      profile.variation = 0.5;
      profile.randomness = 0.38;
      profile.restChance = 0.14;
      break;
    case 'build-release':
      profile.variation = 0.48;
      profile.density = 0.48;
      profile.randomness = 0.4;
      profile.restChance = 0.1;
      break;
    case 'call-response':
      profile.variation = 0.52;
      profile.restChance = 0.16;
      profile.density -= 0.03;
      break;
    case 'loopable-hook':
      profile.variation = 0.38;
      profile.restChance = 0.08;
      profile.density += 0.04;
      profile.randomness -= 0.05;
      break;
  }
}

function applyComplexity(profile: ProfileDraft, complexity: MelodyComplexity): void {
  switch (complexity) {
    case 'simple':
      profile.density -= 0.1;
      profile.randomness -= 0.15;
      profile.variation -= 0.1;
      break;
    case 'balanced':
      break;
    case 'twisty':
      profile.density += 0.08;
      profile.randomness += 0.18;
      profile.variation += 0.12;
      break;
  }
}

function applyHookiness(profile: ProfileDraft, hookiness: MelodyHookiness): void {
  switch (hookiness) {
    case 'safe':
      profile.commercialSaferMode = true;
      profile.randomness -= 0.1;
      profile.variation -= 0.08;
      profile.density -= 0.03;
      break;
    case 'catchy':
      profile.commercialSaferMode = true;
      break;
    case 'bold':
      profile.commercialSaferMode = true;
      profile.randomness += 0.15;
      profile.variation += 0.1;
      profile.density += 0.04;
      break;
  }
}

function labelFor<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((option) => option.value === value)?.label ?? value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
