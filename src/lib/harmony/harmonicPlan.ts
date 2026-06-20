import type { GeneratedMelody } from '../types';
import { getPhraseBeats } from '../melody/phraseAnalysis';
import { getDirectiveForPhrase } from '../melody/phraseRolePlan';
import {
  createChordCandidatesForMelody,
  type ChordCandidate
} from './chordCandidates';

export type PlannedChord = {
  barIndex: number;
  candidate: ChordCandidate;
  melodySupportScore: number;
  transitionScore: number;
  phraseScore: number;
  totalScore: number;
};

export type HarmonicPlan = {
  bars: PlannedChord[];
  summary: {
    barCount: number;
    averageScore: number;
    tonicEmphasis: number;
    cadenceStrength: number;
  };
};

export type HarmonicPlanOptions = {
  variant?: number;
};

type ScoredCandidate = {
  candidate: ChordCandidate;
  melodySupportScore: number;
  transitionScore: number;
  phraseScore: number;
  totalScore: number;
};

const BEATS_PER_BAR = 4;

const TRANSITION_SAME_ROOT = 0.3;
const TRANSITION_FOURTH_FIFTH = 1.0;
const TRANSITION_STEPWISE = 0.4;
const TRANSITION_TRITONE = -1.2;

const PHRASE_STABLE_TONIC_BONUS = 0.8;
const PHRASE_STABLE_SUBDOMINANT_BONUS = 0.35;
const PHRASE_UNRESOLVED_TONIC_PENALTY = -0.6;

const STABLE_CADENCE_DEGREES = new Set([1, 4, 5]);

const ALTERNATE_MELODY_SCORE_GAP = 1.25;
const FALLBACK_MELODY_SCORE_GAP = 2.5;
const FALLBACK_CANDIDATE_LIMIT = 4;
const MIN_MELODY_SUPPORT_RATIO = 0.4;

function normalizePitchClass(pitchClass: number): number {
  return ((pitchClass % 12) + 12) % 12;
}

function shortestPitchClassDistance(from: number, to: number): number {
  const diff = Math.abs(normalizePitchClass(to) - normalizePitchClass(from));
  return Math.min(diff, 12 - diff);
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function computeTransitionScore(
  previousRootPitchClass: number,
  nextRootPitchClass: number
): number {
  const distance = shortestPitchClassDistance(previousRootPitchClass, nextRootPitchClass);

  if (distance === 0) return TRANSITION_SAME_ROOT;
  if (distance === 6) return TRANSITION_TRITONE;
  if (distance === 5 || distance === 7) return TRANSITION_FOURTH_FIFTH;
  if (distance === 1 || distance === 2) return TRANSITION_STEPWISE;

  return 0;
}

function getPhraseIndexForBar(barIndex: number, phraseBeats: number): number {
  return Math.floor((barIndex * BEATS_PER_BAR) / phraseBeats);
}

function isPhraseEndingBar(barIndex: number, phraseBeats: number): boolean {
  const phraseIndex = getPhraseIndexForBar(barIndex, phraseBeats);
  const phraseEndBar = Math.floor(((phraseIndex + 1) * phraseBeats) / BEATS_PER_BAR) - 1;
  return barIndex === phraseEndBar;
}

function computePhraseScore(
  melody: GeneratedMelody,
  barIndex: number,
  candidate: ChordCandidate
): number {
  const plan = melody.phraseRolePlan;
  if (!plan) return 0;

  const phraseBeats = getPhraseBeats(melody.settings.bars);
  const phraseIndex = getPhraseIndexForBar(barIndex, phraseBeats);
  const directive = getDirectiveForPhrase(plan, phraseIndex);
  const atPhraseEnding = isPhraseEndingBar(barIndex, phraseBeats);

  let score = 0;

  if (directive.stableEnding && atPhraseEnding) {
    if (candidate.degree === 1) {
      score += PHRASE_STABLE_TONIC_BONUS;
    } else if (candidate.degree === 4 || candidate.degree === 5) {
      score += PHRASE_STABLE_SUBDOMINANT_BONUS;
    }
  }

  if (directive.unresolvedEnding && !atPhraseEnding && candidate.degree === 1) {
    score += PHRASE_UNRESOLVED_TONIC_PENALTY;
  }

  return score;
}

function buildAlternatePool(
  scored: ScoredCandidate[],
  melodyScoreGap: number,
  limit?: number
): ScoredCandidate[] {
  const best = scored[0];
  const minSupport = Math.max(0, best.melodySupportScore * MIN_MELODY_SUPPORT_RATIO);
  const pool = scored.filter((entry) => {
    const melodyGap = best.melodySupportScore - entry.melodySupportScore;
    return melodyGap <= melodyScoreGap && entry.melodySupportScore >= minSupport;
  });

  if (pool.length <= 1) {
    return [];
  }

  const alternates = pool.slice(1);
  return limit === undefined ? alternates : alternates.slice(0, limit);
}

function selectCandidateForBar(
  scored: ScoredCandidate[],
  barIndex: number,
  variant: number
): ScoredCandidate {
  if (variant === 0 || scored.length === 0) {
    return scored[0];
  }

  const best = scored[0];
  let alternatePool = buildAlternatePool(scored, ALTERNATE_MELODY_SCORE_GAP);

  if (alternatePool.length === 0) {
    alternatePool = buildAlternatePool(scored, FALLBACK_MELODY_SCORE_GAP, FALLBACK_CANDIDATE_LIMIT);
  }

  if (alternatePool.length === 0 && scored.length > 1) {
    const minSupport = Math.max(0, best.melodySupportScore * MIN_MELODY_SUPPORT_RATIO);
    alternatePool = scored
      .slice(1, FALLBACK_CANDIDATE_LIMIT + 1)
      .filter((entry) => entry.melodySupportScore >= minSupport);
  }

  if (alternatePool.length === 0) {
    return best;
  }

  const alternateIndex = (variant + barIndex - 1) % alternatePool.length;
  return alternatePool[alternateIndex];
}

function compareCandidates(
  a: { candidate: ChordCandidate; totalScore: number },
  b: { candidate: ChordCandidate; totalScore: number }
): number {
  if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
  if (b.candidate.score !== a.candidate.score) return b.candidate.score - a.candidate.score;
  if (a.candidate.degree !== b.candidate.degree) return a.candidate.degree - b.candidate.degree;
  return a.candidate.rootPitchClass - b.candidate.rootPitchClass;
}

function emptySummary(): HarmonicPlan['summary'] {
  return {
    barCount: 0,
    averageScore: 0,
    tonicEmphasis: 0,
    cadenceStrength: 0
  };
}

function computeSummary(melody: GeneratedMelody, bars: PlannedChord[]): HarmonicPlan['summary'] {
  if (bars.length === 0) return emptySummary();

  const totalScoreSum = bars.reduce((sum, bar) => sum + bar.totalScore, 0);
  const tonicCount = bars.filter((bar) => bar.candidate.degree === 1).length;

  let stableCadenceTargets = 0;
  let stableCadenceHits = 0;

  const plan = melody.phraseRolePlan;
  if (plan) {
    const phraseBeats = getPhraseBeats(melody.settings.bars);

    for (let phraseIndex = 0; phraseIndex < plan.phraseCount; phraseIndex += 1) {
      const directive = getDirectiveForPhrase(plan, phraseIndex);
      if (!directive.stableEnding) continue;

      const endingBarIndex = Math.floor(((phraseIndex + 1) * phraseBeats) / BEATS_PER_BAR) - 1;
      const planned = bars.find((bar) => bar.barIndex === endingBarIndex);
      if (!planned) continue;

      stableCadenceTargets += 1;
      if (STABLE_CADENCE_DEGREES.has(planned.candidate.degree)) {
        stableCadenceHits += 1;
      }
    }
  }

  return {
    barCount: bars.length,
    averageScore: roundScore(totalScoreSum / bars.length),
    tonicEmphasis: roundScore(tonicCount / bars.length),
    cadenceStrength:
      stableCadenceTargets === 0 ? 0 : roundScore(stableCadenceHits / stableCadenceTargets)
  };
}

export function createHarmonicPlanForMelody(
  melody: GeneratedMelody,
  options: HarmonicPlanOptions = {}
): HarmonicPlan {
  const variant = options.variant ?? 0;
  const candidateAnalysis = createChordCandidatesForMelody(melody);

  if (candidateAnalysis.bars.length === 0) {
    return { bars: [], summary: emptySummary() };
  }

  const plannedBars: PlannedChord[] = [];
  let previousRootPitchClass: number | undefined;

  for (const barCandidates of candidateAnalysis.bars) {
    if (barCandidates.candidates.length === 0) continue;

    const scored = barCandidates.candidates.map((candidate) => {
      const melodySupportScore = candidate.score;
      const transitionScore =
        previousRootPitchClass === undefined
          ? 0
          : computeTransitionScore(previousRootPitchClass, candidate.rootPitchClass);
      const phraseScore = computePhraseScore(melody, barCandidates.barIndex, candidate);
      const totalScore = roundScore(melodySupportScore + transitionScore + phraseScore);

      return {
        candidate,
        melodySupportScore,
        transitionScore,
        phraseScore,
        totalScore
      };
    });

    scored.sort(compareCandidates);
    const best = selectCandidateForBar(scored, barCandidates.barIndex, variant);

    previousRootPitchClass = best.candidate.rootPitchClass;

    plannedBars.push({
      barIndex: barCandidates.barIndex,
      candidate: best.candidate,
      melodySupportScore: best.melodySupportScore,
      transitionScore: best.transitionScore,
      phraseScore: best.phraseScore,
      totalScore: best.totalScore
    });
  }

  return {
    bars: plannedBars,
    summary: computeSummary(melody, plannedBars)
  };
}
