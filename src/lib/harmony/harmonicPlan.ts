import type { GeneratedMelody } from '../types';
import { getPhraseBeats } from '../melody/phraseAnalysis';
import { getDirectiveForPhrase } from '../melody/phraseRolePlan';
import { SeededRandom } from '../utils/seededRandom';
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

const MIN_MELODY_SUPPORT_RATIO = 0.4;
const WEIGHTED_CANDIDATE_LIMIT = 8;
const MIN_SELECTION_WEIGHT = 0.05;
const PHRASE_ENDING_TONIC_WEIGHT_FACTOR = 2.2;
const PHRASE_ENDING_SUBDOMINANT_WEIGHT_FACTOR = 1.4;

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

function createChordPlanSeed(melody: GeneratedMelody, variant: number): string {
  const { seed, key, scale, bpm, bars } = melody.settings;
  return `${seed}:${key}:${scale}:${bpm}:${bars}:chords:${variant}`;
}

function filterViableCandidates(scored: ScoredCandidate[]): ScoredCandidate[] {
  if (scored.length === 0) {
    return [];
  }

  const best = scored[0];
  const minSupport = Math.max(0, best.melodySupportScore * MIN_MELODY_SUPPORT_RATIO);
  const viable = scored.filter((entry) => entry.melodySupportScore >= minSupport);

  return viable.slice(0, WEIGHTED_CANDIDATE_LIMIT);
}

function buildSelectionWeights(
  melody: GeneratedMelody,
  barIndex: number,
  candidates: ScoredCandidate[]
): { value: ScoredCandidate; weight: number }[] {
  const minScore = Math.min(...candidates.map((entry) => entry.totalScore));
  const scoreOffset = minScore < 0 ? -minScore + 0.1 : 0.1;

  const plan = melody.phraseRolePlan;
  const phraseBeats = plan ? getPhraseBeats(melody.settings.bars) : 0;
  const atPhraseEnding = plan ? isPhraseEndingBar(barIndex, phraseBeats) : false;
  const phraseIndex = plan ? getPhraseIndexForBar(barIndex, phraseBeats) : 0;
  const directive = plan ? getDirectiveForPhrase(plan, phraseIndex) : null;

  return candidates.map((entry) => {
    let weight = entry.totalScore + scoreOffset + MIN_SELECTION_WEIGHT;

    if (directive?.stableEnding && atPhraseEnding) {
      if (entry.candidate.degree === 1) {
        weight *= PHRASE_ENDING_TONIC_WEIGHT_FACTOR;
      } else if (entry.candidate.degree === 4 || entry.candidate.degree === 5) {
        weight *= PHRASE_ENDING_SUBDOMINANT_WEIGHT_FACTOR;
      }
    }

    return {
      value: entry,
      weight: Math.max(MIN_SELECTION_WEIGHT, weight)
    };
  });
}

function selectWeightedCandidate(
  rng: SeededRandom,
  melody: GeneratedMelody,
  barIndex: number,
  scored: ScoredCandidate[]
): ScoredCandidate {
  const pool = filterViableCandidates(scored);

  if (pool.length === 0) {
    return scored[0];
  }

  if (pool.length === 1) {
    return pool[0];
  }

  const weights = buildSelectionWeights(melody, barIndex, pool);
  return rng.pickWeighted(weights);
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
  const useSeededRandom = variant > 0;
  const rng = useSeededRandom ? new SeededRandom(createChordPlanSeed(melody, variant)) : null;
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
    const selected =
      useSeededRandom && rng
        ? selectWeightedCandidate(rng, melody, barCandidates.barIndex, scored)
        : scored[0];

    previousRootPitchClass = selected.candidate.rootPitchClass;

    plannedBars.push({
      barIndex: barCandidates.barIndex,
      candidate: selected.candidate,
      melodySupportScore: selected.melodySupportScore,
      transitionScore: selected.transitionScore,
      phraseScore: selected.phraseScore,
      totalScore: selected.totalScore
    });
  }

  return {
    bars: plannedBars,
    summary: computeSummary(melody, plannedBars)
  };
}
