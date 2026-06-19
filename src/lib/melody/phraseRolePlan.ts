import type { MelodySettings } from '../types';
import type { MelodyDrama, MelodyIntent } from './intent';
import { getMotifBars } from './phraseAnalysis';

export type PhraseRole = 'A' | 'A_PRIME' | 'B_CONTRAST' | 'A_RETURN';

export type ContourGoal = 'neutral' | 'rising' | 'falling' | 'peak' | 'stable';

export type PhraseDirective = {
  role: PhraseRole;
  label: string;
  contourGoal: ContourGoal;
  energyBias: number;
  variationMultiplier: number;
  restMultiplier: number;
  stableEnding: boolean;
  unresolvedEnding: boolean;
  contrastAmount: number;
  hookReturnStrength: number;
};

export type PhraseRolePlan = {
  drama: MelodyDrama;
  phraseCount: number;
  directives: PhraseDirective[];
};

const BEATS_PER_BAR = 4;

const DRAMA_DIRECTIVES: Record<
  MelodyDrama,
  [PhraseDirective, PhraseDirective, PhraseDirective, PhraseDirective]
> = {
  'question-answer': [
    {
      role: 'A',
      label: 'Question',
      contourGoal: 'rising',
      energyBias: 0.1,
      variationMultiplier: 0,
      restMultiplier: 0.9,
      stableEnding: false,
      unresolvedEnding: true,
      contrastAmount: 0,
      hookReturnStrength: 0
    },
    {
      role: 'A_PRIME',
      label: 'Answer',
      contourGoal: 'stable',
      energyBias: 0,
      variationMultiplier: 0.55,
      restMultiplier: 1,
      stableEnding: true,
      unresolvedEnding: false,
      contrastAmount: 0.15,
      hookReturnStrength: 0.3
    },
    {
      role: 'B_CONTRAST',
      label: 'Contrast',
      contourGoal: 'falling',
      energyBias: 0.15,
      variationMultiplier: 1.1,
      restMultiplier: 1,
      stableEnding: false,
      unresolvedEnding: false,
      contrastAmount: 0.75,
      hookReturnStrength: 0
    },
    {
      role: 'A_RETURN',
      label: 'Stable return',
      contourGoal: 'stable',
      energyBias: -0.05,
      variationMultiplier: 0.35,
      restMultiplier: 1,
      stableEnding: true,
      unresolvedEnding: false,
      contrastAmount: 0.1,
      hookReturnStrength: 0.85
    }
  ],
  'build-release': [
    {
      role: 'A',
      label: 'Build start',
      contourGoal: 'neutral',
      energyBias: 0.15,
      variationMultiplier: 0,
      restMultiplier: 1,
      stableEnding: false,
      unresolvedEnding: false,
      contrastAmount: 0,
      hookReturnStrength: 0
    },
    {
      role: 'A_PRIME',
      label: 'Build lift',
      contourGoal: 'rising',
      energyBias: 0.35,
      variationMultiplier: 0.5,
      restMultiplier: 0.95,
      stableEnding: false,
      unresolvedEnding: false,
      contrastAmount: 0.2,
      hookReturnStrength: 0.2
    },
    {
      role: 'B_CONTRAST',
      label: 'Peak',
      contourGoal: 'peak',
      energyBias: 0.6,
      variationMultiplier: 0.85,
      restMultiplier: 0.85,
      stableEnding: false,
      unresolvedEnding: false,
      contrastAmount: 0.55,
      hookReturnStrength: 0
    },
    {
      role: 'A_RETURN',
      label: 'Release',
      contourGoal: 'falling',
      energyBias: -0.1,
      variationMultiplier: 0.4,
      restMultiplier: 1.05,
      stableEnding: true,
      unresolvedEnding: false,
      contrastAmount: 0.15,
      hookReturnStrength: 0.7
    }
  ],
  'call-response': [
    {
      role: 'A',
      label: 'Call',
      contourGoal: 'rising',
      energyBias: 0.2,
      variationMultiplier: 0,
      restMultiplier: 0.75,
      stableEnding: false,
      unresolvedEnding: true,
      contrastAmount: 0,
      hookReturnStrength: 0
    },
    {
      role: 'A_PRIME',
      label: 'Response',
      contourGoal: 'falling',
      energyBias: 0,
      variationMultiplier: 0.6,
      restMultiplier: 1.4,
      stableEnding: true,
      unresolvedEnding: false,
      contrastAmount: 0.2,
      hookReturnStrength: 0.25
    },
    {
      role: 'B_CONTRAST',
      label: 'Contrast',
      contourGoal: 'neutral',
      energyBias: 0.1,
      variationMultiplier: 1,
      restMultiplier: 1.1,
      stableEnding: false,
      unresolvedEnding: false,
      contrastAmount: 0.65,
      hookReturnStrength: 0
    },
    {
      role: 'A_RETURN',
      label: 'Return',
      contourGoal: 'stable',
      energyBias: 0,
      variationMultiplier: 0.45,
      restMultiplier: 1.15,
      stableEnding: true,
      unresolvedEnding: false,
      contrastAmount: 0.12,
      hookReturnStrength: 0.8
    }
  ],
  'loopable-hook': [
    {
      role: 'A',
      label: 'Hook anchor',
      contourGoal: 'neutral',
      energyBias: 0.25,
      variationMultiplier: 0,
      restMultiplier: 0.9,
      stableEnding: true,
      unresolvedEnding: false,
      contrastAmount: 0,
      hookReturnStrength: 1
    },
    {
      role: 'A_PRIME',
      label: 'Hook variation',
      contourGoal: 'neutral',
      energyBias: 0.2,
      variationMultiplier: 0.45,
      restMultiplier: 1,
      stableEnding: true,
      unresolvedEnding: false,
      contrastAmount: 0.08,
      hookReturnStrength: 0.75
    },
    {
      role: 'B_CONTRAST',
      label: 'Light contrast',
      contourGoal: 'neutral',
      energyBias: 0.15,
      variationMultiplier: 0.55,
      restMultiplier: 1,
      stableEnding: false,
      unresolvedEnding: false,
      contrastAmount: 0.25,
      hookReturnStrength: 0.15
    },
    {
      role: 'A_RETURN',
      label: 'Loop return',
      contourGoal: 'stable',
      energyBias: 0.2,
      variationMultiplier: 0.2,
      restMultiplier: 1,
      stableEnding: true,
      unresolvedEnding: false,
      contrastAmount: 0.05,
      hookReturnStrength: 0.95
    }
  ]
};

export function getPhraseCount(bars: number): number {
  const motifBars = getMotifBars(bars);
  const phraseBeats = motifBars * BEATS_PER_BAR;
  return Math.max(1, Math.ceil((bars * BEATS_PER_BAR) / phraseBeats));
}

export function createPhraseRolePlan(intent: MelodyIntent, settings: MelodySettings): PhraseRolePlan {
  const phraseCount = getPhraseCount(settings.bars);
  const template = DRAMA_DIRECTIVES[intent.drama];

  return {
    drama: intent.drama,
    phraseCount,
    directives: template.slice(0, phraseCount)
  };
}

export function getDirectiveForPhrase(plan: PhraseRolePlan, phraseIndex: number): PhraseDirective {
  return plan.directives[phraseIndex] ?? plan.directives[plan.directives.length - 1];
}
