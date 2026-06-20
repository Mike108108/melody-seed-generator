import type { GeneratedMelody, MelodyNote } from '../types';
import { getScaleDegree } from '../music/scales';
import { makeNote } from '../music/theory';
import type { ChordTone } from './chordCandidates';

export type ChordPattern = 'sustained' | 'half-bar' | 'quarter-pulse' | 'syncopated';
export type ChordLength = 'long' | 'medium' | 'short' | 'staccato';

export type ChordPerformanceOptions = {
  pattern?: ChordPattern;
  length?: ChordLength;
};

export const DEFAULT_CHORD_PATTERN: ChordPattern = 'sustained';
export const DEFAULT_CHORD_LENGTH: ChordLength = 'long';

const BEATS_PER_BAR = 4;
const CHORD_VELOCITY = 0.52;
const ROOT_MIN_MIDI = 48;
const MIN_NOTE_DURATION = 0.12;

const GATE_BY_LENGTH: Record<ChordLength, number> = {
  long: 0.92,
  medium: 0.65,
  short: 0.42,
  staccato: 0.24
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

export function renderChordNotesForBar(
  melody: GeneratedMelody,
  barIndex: number,
  tones: ChordTone[],
  performance: ChordPerformanceOptions = {}
): MelodyNote[] {
  const pattern = performance.pattern ?? DEFAULT_CHORD_PATTERN;
  const length = performance.length ?? DEFAULT_CHORD_LENGTH;
  const barStart = barIndex * BEATS_PER_BAR;
  const hits = getPatternHits(pattern);
  const { key, scale } = melody.settings;
  const notes: MelodyNote[] = [];

  for (let hitIndex = 0; hitIndex < hits.length; hitIndex += 1) {
    const hitBeat = hits[hitIndex];
    const nextHitBeat = hits[hitIndex + 1];
    const stepDuration = nextHitBeat !== undefined ? nextHitBeat - hitBeat : BEATS_PER_BAR - hitBeat;
    const duration = Math.min(
      resolveHitDuration(stepDuration, pattern, length),
      BEATS_PER_BAR - hitBeat
    );
    const startBeats = barStart + hitBeat;
    let minMidi = ROOT_MIN_MIDI;

    for (const tone of tones) {
      const midi = pitchClassToMidiAtOrAbove(tone.pitchClass, minMidi);
      const degree = getScaleDegree(midi, key, scale);
      notes.push(makeNote(midi, startBeats, duration, CHORD_VELOCITY, degree));
      minMidi = midi + 1;
    }
  }

  return notes;
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
