import type { GeneratedMelody, MelodyNote } from '../types';
import { getScaleDegree } from '../music/scales';
import { makeNote } from '../music/theory';
import { SeededRandom } from '../utils/seededRandom';
import type { ChordTone } from './chordCandidates';

export type ChordPattern = 'sustained' | 'half-bar' | 'quarter-pulse' | 'syncopated';
export type ChordLength = 'long' | 'medium' | 'short' | 'staccato';
export type ChordFeel = 'straight' | 'subtle' | 'groovy' | 'loose';

export type ChordPerformanceOptions = {
  pattern?: ChordPattern;
  length?: ChordLength;
  feel?: ChordFeel;
  variant?: number;
  nextBarTones?: ChordTone[];
};

export const DEFAULT_CHORD_PATTERN: ChordPattern = 'sustained';
export const DEFAULT_CHORD_LENGTH: ChordLength = 'long';
export const DEFAULT_CHORD_FEEL: ChordFeel = 'straight';

const BEATS_PER_BAR = 4;
const CHORD_VELOCITY = 0.52;
const ROOT_MIN_MIDI = 48;
const MIN_NOTE_DURATION = 0.12;
const PICKUP_BEAT = 3.5;

const GATE_BY_LENGTH: Record<ChordLength, number> = {
  long: 0.92,
  medium: 0.65,
  short: 0.42,
  staccato: 0.24
};

type FeelProfile = {
  durationMin: number;
  durationMax: number;
  restChance: number;
  pickupChance: number;
};

const FEEL_PROFILES: Record<Exclude<ChordFeel, 'straight'>, FeelProfile> = {
  subtle: {
    durationMin: 0.85,
    durationMax: 1.1,
    restChance: 0.08,
    pickupChance: 0
  },
  groovy: {
    durationMin: 0.65,
    durationMax: 1.25,
    restChance: 0.22,
    pickupChance: 0.35
  },
  loose: {
    durationMin: 0.45,
    durationMax: 1.4,
    restChance: 0.38,
    pickupChance: 0.55
  }
};

function pitchClassToMidiAtOrAbove(pitchClass: number, minMidi: number): number {
  const normalizedPc = ((pitchClass % 12) + 12) % 12;
  let midi = minMidi;

  while (((midi % 12) + 12) % 12 !== normalizedPc) {
    midi += 1;
  }

  return midi;
}

function getPatternHits(pattern: ChordPattern): number[] {
  switch (pattern) {
    case 'sustained':
      return [0];
    case 'half-bar':
      return [0, 2];
    case 'quarter-pulse':
      return [0, 1, 2, 3];
    case 'syncopated':
      return [0, 1.5, 2.5];
    default:
      return [0];
  }
}

function resolveHitDuration(
  stepDuration: number,
  pattern: ChordPattern,
  length: ChordLength
): number {
  const gate =
    pattern === 'sustained' && length === 'long' ? 1 : GATE_BY_LENGTH[length];
  return Math.max(MIN_NOTE_DURATION, stepDuration * gate);
}

function createFeelSeed(
  melody: GeneratedMelody,
  performance: ChordPerformanceOptions,
  barIndex: number,
  salt: string
): string {
  const { seed, key, scale, bpm, bars } = melody.settings;
  const pattern = performance.pattern ?? DEFAULT_CHORD_PATTERN;
  const length = performance.length ?? DEFAULT_CHORD_LENGTH;
  const feel = performance.feel ?? DEFAULT_CHORD_FEEL;
  const variant = performance.variant ?? 0;

  return `${seed}:${key}:${scale}:${bpm}:${bars}:chords:${variant}:${pattern}:${length}:${feel}:${barIndex}:${salt}`;
}

function emitChordNotesAt(
  melody: GeneratedMelody,
  startBeats: number,
  duration: number,
  tones: ChordTone[]
): MelodyNote[] {
  const { key, scale } = melody.settings;
  const notes: MelodyNote[] = [];
  let minMidi = ROOT_MIN_MIDI;

  for (const tone of tones) {
    const midi = pitchClassToMidiAtOrAbove(tone.pitchClass, minMidi);
    const degree = getScaleDegree(midi, key, scale);
    notes.push(makeNote(midi, startBeats, duration, CHORD_VELOCITY, degree));
    minMidi = midi + 1;
  }

  return notes;
}

function renderStraightBar(
  melody: GeneratedMelody,
  barIndex: number,
  tones: ChordTone[],
  pattern: ChordPattern,
  length: ChordLength
): MelodyNote[] {
  const barStart = barIndex * BEATS_PER_BAR;
  const hits = getPatternHits(pattern);
  const notes: MelodyNote[] = [];

  for (let hitIndex = 0; hitIndex < hits.length; hitIndex += 1) {
    const hitBeat = hits[hitIndex];
    const nextHitBeat = hits[hitIndex + 1];
    const stepDuration = nextHitBeat !== undefined ? nextHitBeat - hitBeat : BEATS_PER_BAR - hitBeat;
    const duration = Math.min(
      resolveHitDuration(stepDuration, pattern, length),
      BEATS_PER_BAR - hitBeat
    );

    notes.push(...emitChordNotesAt(melody, barStart + hitBeat, duration, tones));
  }

  return notes;
}

function renderFeelBar(
  melody: GeneratedMelody,
  barIndex: number,
  tones: ChordTone[],
  performance: ChordPerformanceOptions
): MelodyNote[] {
  const pattern = performance.pattern ?? DEFAULT_CHORD_PATTERN;
  const length = performance.length ?? DEFAULT_CHORD_LENGTH;
  const feel = performance.feel ?? DEFAULT_CHORD_FEEL;
  const profile = FEEL_PROFILES[feel as Exclude<ChordFeel, 'straight'>];
  const barStart = barIndex * BEATS_PER_BAR;
  const hits = getPatternHits(pattern);
  const notes: MelodyNote[] = [];
  let emittedHits = 0;

  for (let hitIndex = 0; hitIndex < hits.length; hitIndex += 1) {
    const hitRng = new SeededRandom(createFeelSeed(melody, performance, barIndex, `hit:${hitIndex}`));

    if (hitIndex > 0 && hitRng.chance(profile.restChance)) {
      continue;
    }

    const hitBeat = hits[hitIndex];
    const nextHitBeat = hits[hitIndex + 1];
    const stepDuration = nextHitBeat !== undefined ? nextHitBeat - hitBeat : BEATS_PER_BAR - hitBeat;
    const baseDuration = resolveHitDuration(stepDuration, pattern, length);
    const multiplier = hitRng.range(profile.durationMin, profile.durationMax);
    const duration = Math.max(
      MIN_NOTE_DURATION,
      Math.min(baseDuration * multiplier, BEATS_PER_BAR - hitBeat)
    );

    notes.push(...emitChordNotesAt(melody, barStart + hitBeat, duration, tones));
    emittedHits += 1;
  }

  if (emittedHits === 0) {
    notes.push(
      ...emitChordNotesAt(
        melody,
        barStart,
        resolveHitDuration(BEATS_PER_BAR, pattern, length),
        tones
      )
    );
  }

  if (profile.pickupChance > 0 && PICKUP_BEAT < BEATS_PER_BAR) {
    const pickupRng = new SeededRandom(createFeelSeed(melody, performance, barIndex, 'pickup'));

    if (pickupRng.chance(profile.pickupChance)) {
      const pickupTones = performance.nextBarTones ?? tones;
      const pickupDuration = Math.max(
        MIN_NOTE_DURATION,
        Math.min(pickupRng.range(0.18, 0.42), BEATS_PER_BAR - PICKUP_BEAT)
      );
      notes.push(...emitChordNotesAt(melody, barStart + PICKUP_BEAT, pickupDuration, pickupTones));
    }
  }

  return notes;
}

export function renderChordNotesForBar(
  melody: GeneratedMelody,
  barIndex: number,
  tones: ChordTone[],
  performance: ChordPerformanceOptions = {}
): MelodyNote[] {
  const pattern = performance.pattern ?? DEFAULT_CHORD_PATTERN;
  const length = performance.length ?? DEFAULT_CHORD_LENGTH;
  const feel = performance.feel ?? DEFAULT_CHORD_FEEL;

  if (feel === 'straight') {
    return renderStraightBar(melody, barIndex, tones, pattern, length);
  }

  return renderFeelBar(melody, barIndex, tones, performance);
}

export function chordHarmonicSignature(notes: MelodyNote[]): string {
  const byBar = new Map<number, number[]>();

  for (const note of notes) {
    const barIndex = Math.floor(note.startBeats / BEATS_PER_BAR);
    const barMidis = byBar.get(barIndex) ?? [];

    if (!barMidis.includes(note.midi)) {
      barMidis.push(note.midi);
    }

    byBar.set(barIndex, barMidis);
  }

  return [...byBar.entries()]
    .sort(([leftBar], [rightBar]) => leftBar - rightBar)
    .map(([barIndex, midis]) => `${barIndex}:${[...midis].sort((a, b) => a - b).join(',')}`)
    .join('|');
}
