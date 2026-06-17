import type { MelodyNote } from '../types';
import { contourSymbol } from '../music/intervals';

export const BEATS_PER_BAR = 4;

/** Matches motif tiling in generateMelody / createMotif. */
export function getMotifBars(bars: number): number {
  return bars >= 4 ? 2 : 1;
}

export function getPhraseBeats(bars: number): number {
  return getMotifBars(bars) * BEATS_PER_BAR;
}

export type PhraseChunk = {
  phraseIndex: number;
  notes: MelodyNote[];
  durations: string[];
  pitchClasses: number[];
  intervals: number[];
  contour: string[];
};

export function splitIntoPhraseChunks(notes: MelodyNote[], bars: number): PhraseChunk[] {
  const phraseBeats = getPhraseBeats(bars);
  const phraseCount = Math.max(1, Math.ceil((bars * BEATS_PER_BAR) / phraseBeats));
  const chunks: PhraseChunk[] = [];

  for (let phraseIndex = 0; phraseIndex < phraseCount; phraseIndex += 1) {
    const start = phraseIndex * phraseBeats;
    const end = start + phraseBeats;
    const phraseNotes = notes
      .filter((note) => note.startBeats >= start && note.startBeats < end)
      .sort((a, b) => a.startBeats - b.startBeats);

    const absolutePitches = phraseNotes.map((note) => note.midi);
    const pitchClasses = absolutePitches.map((midi) => ((midi % 12) + 12) % 12);
    const intervals = absolutePitches.slice(1).map((pitch, index) => pitch - absolutePitches[index]);

    chunks.push({
      phraseIndex,
      notes: phraseNotes,
      durations: phraseNotes.map((note) => note.durationBeats.toFixed(2)),
      pitchClasses,
      intervals,
      contour: intervals.map(contourSymbol)
    });
  }

  return chunks;
}

export function phraseRhythmSimilarity(a: PhraseChunk, b: PhraseChunk): number {
  return sequenceOverlap(a.durations, b.durations);
}

export function phrasePitchSimilarity(a: PhraseChunk, b: PhraseChunk): number {
  const aNorm = normalizePitchClasses(a.pitchClasses);
  const bNorm = normalizePitchClasses(b.pitchClasses);
  return sequenceOverlap(aNorm.map(String), bNorm.map(String));
}

export function phraseContourSimilarity(a: PhraseChunk, b: PhraseChunk): number {
  return sequenceOverlap(a.contour, b.contour);
}

/** Combined phrase signature similarity; rhythm weighted for hook repetition detection. */
export function phraseSignatureSimilarity(a: PhraseChunk, b: PhraseChunk): number {
  if (a.notes.length === 0 || b.notes.length === 0) return 0;

  const rhythm = phraseRhythmSimilarity(a, b);
  const pitch = phrasePitchSimilarity(a, b);
  const contour = phraseContourSimilarity(a, b);

  return clamp01(rhythm * 0.45 + pitch * 0.35 + contour * 0.2);
}

/** True when three or more phrase-sized chunks are almost identical (copy-paste). */
export function hasExcessivePhraseRepetition(chunks: PhraseChunk[], threshold = 0.9): boolean {
  if (chunks.length < 3) return false;

  const comparable = chunks.filter((chunk) => chunk.notes.length > 0);
  if (comparable.length < 3) return false;

  let matchAnchor = 1;
  for (let i = 1; i < comparable.length; i += 1) {
    if (phraseSignatureSimilarity(comparable[i], comparable[0]) >= threshold) {
      matchAnchor += 1;
    }
  }
  if (matchAnchor >= 3) return true;

  for (let i = 0; i < comparable.length - 2; i += 1) {
    const first = comparable[i];
    const second = comparable[i + 1];
    const third = comparable[i + 2];
    if (
      phraseSignatureSimilarity(first, second) >= threshold &&
      phraseSignatureSimilarity(second, third) >= threshold
    ) {
      return true;
    }
  }

  return false;
}

export const MIN_PHRASE_NOTES_FOR_DEVELOPMENT = 2;

function hasPhraseDensity(chunk: PhraseChunk | undefined): chunk is PhraseChunk {
  return chunk !== undefined && chunk.notes.length >= MIN_PHRASE_NOTES_FOR_DEVELOPMENT;
}

/**
 * Hook-oriented development score: rewards A → A' → B → A'' style arcs.
 * Future Hook Score / Singability / Drama layers can extend this module.
 */
export function scoreMotifDevelopment(chunks: PhraseChunk[]): number {
  const anchor = chunks[0];
  if (!hasPhraseDensity(anchor)) return 0;

  let bonus = 0;

  const aPrime = chunks[1];
  if (hasPhraseDensity(aPrime)) {
    const aaPrime = phraseSignatureSimilarity(aPrime, anchor);
    // Cohesive hook statement with variation, not a carbon copy.
    if (aaPrime >= 0.5 && aaPrime < 0.95) bonus += 10;
  }

  const contrastPhrase = chunks[2];
  if (hasPhraseDensity(contrastPhrase)) {
    const contrast = 1 - phraseSignatureSimilarity(contrastPhrase, anchor);
    if (contrast >= 0.12) bonus += 8;
  }

  const hookReturn = chunks[3];
  if (hasPhraseDensity(hookReturn)) {
    const returnSimilarity = phraseSignatureSimilarity(hookReturn, anchor);
    if (returnSimilarity >= 0.45 && returnSimilarity < 0.95) bonus += 6;
  }

  return bonus;
}

/**
 * Phrase-aware self-similarity risk: A / A' repetition is expected;
 * penalize only excessive copy-paste across later phrases.
 */
export function phraseAwareSelfSimilarityRisk(chunks: PhraseChunk[]): number {
  const populated = chunks.filter((chunk) => chunk.notes.length > 0);
  if (populated.length <= 1) return 0;

  let risk = 0;

  if (hasExcessivePhraseRepetition(populated)) {
    risk = Math.max(risk, 0.55);
  }

  if (populated.length >= 3) {
    const latePhrases = populated.slice(2);
    const lateCopies = latePhrases.filter(
      (chunk) => phraseSignatureSimilarity(chunk, populated[0]) >= 0.88
    ).length;

    if (lateCopies === latePhrases.length && latePhrases.length >= 2) {
      risk = Math.max(risk, 0.48);
    } else if (lateCopies >= 1 && populated.length >= 4) {
      risk = Math.max(risk, 0.22);
    }
  }

  // Residual global monotony guard for non-phrase-aware edge cases.
  const allIntervals = populated.flatMap((chunk) => chunk.intervals);
  const uniqueIntervals = new Set(allIntervals).size;
  if (allIntervals.length >= 8 && uniqueIntervals <= 2) {
    risk = Math.max(risk, 0.35);
  }

  return clamp01(risk);
}

function normalizePitchClasses(pitchClasses: number[]): number[] {
  if (pitchClasses.length === 0) return [];
  const root = pitchClasses[0];
  return pitchClasses.map((pc) => (pc - root + 12) % 12);
}

function sequenceOverlap(a: string[], b: string[]): number {
  const length = Math.min(a.length, b.length);
  if (length === 0) return 0;

  let matches = 0;
  for (let i = 0; i < length; i += 1) {
    if (a[i] === b[i]) matches += 1;
  }

  return matches / Math.max(a.length, b.length);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
