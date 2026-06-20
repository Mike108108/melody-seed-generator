import type { GeneratedMelody, MelodyNote } from '../types';
import { makeNote } from '../music/theory';

export type BassMode = 'root-pulse' | 'groove' | 'sparse';

const BEATS_PER_BAR = 4;
const BASS_ROOT_MIDI = 36;
const BASS_MAX_MIDI = 48;
const BASS_VELOCITY = 0.62;
const MIN_NOTE_DURATION = 0.12;
const VARIANT_FAMILY_COUNT = 5;

export type BassGenerationOptions = {
  mode: BassMode;
  variant: number;
  chordSignature: string;
};

type BassHit = {
  beatOffset: number;
  duration: number;
  midiOffset: number;
  velocityScale?: number;
  degree?: number;
};

function pitchClassToBassMidi(pitchClass: number): number {
  const normalizedPc = ((pitchClass % 12) + 12) % 12;
  let midi = BASS_ROOT_MIDI;

  while (midi % 12 !== normalizedPc) {
    midi += 1;
  }

  if (midi > BASS_MAX_MIDI) {
    midi -= 12;
  }

  return midi;
}

export function extractBarRoots(chordNotes: MelodyNote[], bars: number): number[] {
  const byBar = new Map<number, number[]>();

  for (const note of chordNotes) {
    const barIndex = Math.floor(note.startBeats / BEATS_PER_BAR);
    const barMidis = byBar.get(barIndex) ?? [];
    barMidis.push(note.midi);
    byBar.set(barIndex, barMidis);
  }

  const roots: number[] = [];
  let lastRootMidi: number | null = null;

  for (let bar = 0; bar < bars; bar += 1) {
    const barMidis = byBar.get(bar);

    if (barMidis && barMidis.length > 0) {
      const lowest = Math.min(...barMidis);
      lastRootMidi = pitchClassToBassMidi(lowest);
      roots.push(lastRootMidi);
    } else if (lastRootMidi !== null) {
      roots.push(lastRootMidi);
    } else {
      roots.push(BASS_ROOT_MIDI);
    }
  }

  return roots;
}

function safeFifthMidi(rootMidi: number): number | null {
  const fifth = rootMidi + 7;
  return fifth <= BASS_MAX_MIDI ? fifth : null;
}

function safeOctaveMidi(rootMidi: number): number | null {
  const octave = rootMidi + 12;
  return octave <= BASS_MAX_MIDI ? octave : null;
}

function resolveMidi(rootMidi: number, offset: number): number {
  const midi = rootMidi + offset;
  if (midi < BASS_ROOT_MIDI - 12 || midi > BASS_MAX_MIDI) {
    return rootMidi;
  }
  return midi;
}

function getVariantFamily(variant: number): number {
  return ((variant % VARIANT_FAMILY_COUNT) + VARIANT_FAMILY_COUNT) % VARIANT_FAMILY_COUNT;
}

function makeBassNote(
  rootMidi: number,
  barStart: number,
  hit: BassHit,
  totalBeats: number
): MelodyNote | null {
  const startBeats = barStart + hit.beatOffset;
  if (startBeats >= totalBeats) {
    return null;
  }

  const duration = Math.max(
    MIN_NOTE_DURATION,
    Math.min(hit.duration, totalBeats - startBeats)
  );

  if (duration < MIN_NOTE_DURATION) {
    return null;
  }

  const midi = resolveMidi(rootMidi, hit.midiOffset);
  const velocity = BASS_VELOCITY * (hit.velocityScale ?? 1);
  const degree = hit.degree ?? (hit.midiOffset === 7 ? 5 : hit.midiOffset === 12 ? 8 : 1);

  return makeNote(midi, startBeats, duration, velocity, degree);
}

function renderHits(
  barIndex: number,
  rootMidi: number,
  hits: BassHit[],
  totalBeats: number
): MelodyNote[] {
  const barStart = barIndex * BEATS_PER_BAR;
  const notes: MelodyNote[] = [];

  for (const hit of hits) {
    const note = makeBassNote(rootMidi, barStart, hit, totalBeats);
    if (note) {
      notes.push(note);
    }
  }

  return notes;
}

function renderRootPulseBar(
  barIndex: number,
  rootMidi: number,
  variantFamily: number,
  variant: number,
  totalBeats: number
): MelodyNote[] {
  const fifth = safeFifthMidi(rootMidi);
  const octave = safeOctaveMidi(rootMidi);
  const restBar = (barIndex + variant) % 4 === 0;

  switch (variantFamily) {
    case 0:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.85, midiOffset: 0 },
          { beatOffset: 2, duration: 1.85, midiOffset: 0 }
        ],
        totalBeats
      );
    case 1:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 0.92, midiOffset: 0 },
          { beatOffset: 1, duration: 0.92, midiOffset: 0 },
          { beatOffset: 2, duration: 0.92, midiOffset: 0 },
          { beatOffset: 3, duration: 0.92, midiOffset: 0 }
        ],
        totalBeats
      );
    case 2:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.85, midiOffset: 0 },
          { beatOffset: 2, duration: 1.5, midiOffset: octave ? 12 : 0, degree: 8 }
        ],
        totalBeats
      );
    case 3:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.85, midiOffset: 0 },
          { beatOffset: 2, duration: 1.45, midiOffset: fifth ? 7 : 0, degree: 5 }
        ],
        totalBeats
      );
    default:
      if (restBar) {
        return renderHits(
          barIndex,
          rootMidi,
          [{ beatOffset: 1, duration: 2.5, midiOffset: 0 }],
          totalBeats
        );
      }

      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 2.35, midiOffset: 0 },
          { beatOffset: 3.5, duration: 0.42, midiOffset: 0, velocityScale: 0.88 }
        ],
        totalBeats
      );
  }
}

function renderGrooveBar(
  barIndex: number,
  rootMidi: number,
  variantFamily: number,
  totalBeats: number
): MelodyNote[] {
  const fifth = safeFifthMidi(rootMidi);
  const octave = safeOctaveMidi(rootMidi);

  switch (variantFamily) {
    case 0:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 0.9, midiOffset: 0 },
          { beatOffset: 1, duration: 0.72, midiOffset: 0, velocityScale: 0.92 },
          { beatOffset: 2, duration: 0.88, midiOffset: fifth ? 7 : 0, degree: 5 },
          { beatOffset: 3, duration: 0.78, midiOffset: 0, velocityScale: 0.9 }
        ],
        totalBeats
      );
    case 1:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.0, midiOffset: 0 },
          { beatOffset: 1.5, duration: 0.82, midiOffset: octave ? 12 : 0, degree: 8 },
          { beatOffset: 2.5, duration: 0.85, midiOffset: fifth ? 7 : 0, degree: 5 },
          { beatOffset: 3.5, duration: 0.45, midiOffset: 0, velocityScale: 0.88 }
        ],
        totalBeats
      );
    case 2:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.85, midiOffset: 0 },
          { beatOffset: 2, duration: 1.45, midiOffset: fifth ? 7 : 0, degree: 5, velocityScale: 0.94 }
        ],
        totalBeats
      );
    case 3:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.15, midiOffset: 0 },
          { beatOffset: 2.5, duration: 0.92, midiOffset: fifth ? 7 : 0, degree: 5 },
          { beatOffset: 3.5, duration: 0.38, midiOffset: 0, velocityScale: 0.86 }
        ],
        totalBeats
      );
    default:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.45, midiOffset: 0 },
          { beatOffset: 2, duration: 0.95, midiOffset: octave ? 12 : 0, degree: 8 },
          { beatOffset: 3.25, duration: 0.55, midiOffset: 0, velocityScale: 0.9 }
        ],
        totalBeats
      );
  }
}

function renderSparseBar(
  barIndex: number,
  rootMidi: number,
  variantFamily: number,
  variant: number,
  totalBeats: number
): MelodyNote[] {
  const octave = safeOctaveMidi(rootMidi);
  const leaveSpace = (barIndex + variant) % 3 === 2 && variantFamily === 4;

  if (leaveSpace) {
    return [];
  }

  switch (variantFamily) {
    case 0:
      return renderHits(
        barIndex,
        rootMidi,
        [{ beatOffset: 0, duration: 3.75, midiOffset: 0, velocityScale: 0.95 }],
        totalBeats
      );
    case 1:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.85, midiOffset: 0, velocityScale: 0.94 },
          { beatOffset: 2, duration: 1.85, midiOffset: 0, velocityScale: 0.92 }
        ],
        totalBeats
      );
    case 2:
      if (barIndex % 2 === 1) {
        return [];
      }

      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 1.85, midiOffset: 0, velocityScale: 0.93 },
          { beatOffset: 2, duration: 1.85, midiOffset: 0, velocityScale: 0.91 }
        ],
        totalBeats
      );
    case 3:
      return renderHits(
        barIndex,
        rootMidi,
        [
          { beatOffset: 0, duration: 3.15, midiOffset: 0, velocityScale: 0.95 },
          {
            beatOffset: 3.5,
            duration: 0.38,
            midiOffset: octave ? 12 : 0,
            degree: 8,
            velocityScale: 0.84
          }
        ],
        totalBeats
      );
    default:
      if (barIndex % 2 === 1) {
        return renderHits(
          barIndex,
          rootMidi,
          [{ beatOffset: 0, duration: 3.75, midiOffset: 0, velocityScale: 0.92 }],
          totalBeats
        );
      }

      return renderHits(
        barIndex,
        rootMidi,
        [{ beatOffset: 0, duration: 3.75, midiOffset: 0, velocityScale: 0.95 }],
        totalBeats
      );
  }
}

export function generateBassNotes(
  melody: GeneratedMelody,
  chordNotes: MelodyNote[],
  options: BassGenerationOptions
): MelodyNote[] {
  const bars = melody.settings.bars;
  const totalBeats = bars * BEATS_PER_BAR;
  const barRoots = extractBarRoots(chordNotes, bars);
  const variantFamily = getVariantFamily(options.variant);
  const notes: MelodyNote[] = [];

  for (let bar = 0; bar < bars; bar += 1) {
    const rootMidi = barRoots[bar];

    switch (options.mode) {
      case 'root-pulse':
        notes.push(...renderRootPulseBar(bar, rootMidi, variantFamily, options.variant, totalBeats));
        break;
      case 'groove':
        notes.push(...renderGrooveBar(bar, rootMidi, variantFamily, totalBeats));
        break;
      case 'sparse':
        notes.push(...renderSparseBar(bar, rootMidi, variantFamily, options.variant, totalBeats));
        break;
    }
  }

  return notes.sort((left, right) => left.startBeats - right.startBeats || left.midi - right.midi);
}
