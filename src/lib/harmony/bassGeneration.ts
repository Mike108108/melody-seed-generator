import type { GeneratedMelody, MelodyNote } from '../types';
import { makeNote } from '../music/theory';
import { SeededRandom } from '../utils/seededRandom';

export type BassMode = 'root-pulse' | 'groove' | 'sparse';

const BEATS_PER_BAR = 4;
const BASS_ROOT_MIDI = 36;
const BASS_MAX_MIDI = 48;
const BASS_VELOCITY = 0.62;

export type BassGenerationOptions = {
  mode: BassMode;
  variant: number;
  chordSignature: string;
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

function createBassSeed(melody: GeneratedMelody, options: BassGenerationOptions): string {
  const { seed, key, scale, bpm, bars } = melody.settings;
  return `${seed}:${key}:${scale}:${bpm}:${bars}:${options.chordSignature}:bass:${options.mode}:${options.variant}`;
}

function safeFifthMidi(rootMidi: number): number | null {
  const fifth = rootMidi + 7;
  return fifth <= BASS_MAX_MIDI ? fifth : null;
}

function renderRootPulseBar(
  barIndex: number,
  rootMidi: number,
  useQuarterPulse: boolean
): MelodyNote[] {
  const barStart = barIndex * BEATS_PER_BAR;
  const hits = useQuarterPulse ? [0, 1, 2, 3] : [0, 2];
  const duration = useQuarterPulse ? 0.92 : 1.85;

  return hits.map((beatOffset) =>
    makeNote(rootMidi, barStart + beatOffset, duration, BASS_VELOCITY, 1)
  );
}

function renderGrooveBar(
  barIndex: number,
  rootMidi: number,
  templateIndex: number
): MelodyNote[] {
  const barStart = barIndex * BEATS_PER_BAR;
  const fifth = safeFifthMidi(rootMidi);
  const notes: MelodyNote[] = [
    makeNote(rootMidi, barStart, 1.35, BASS_VELOCITY, 1)
  ];

  switch (templateIndex % 3) {
    case 0:
      if (fifth) {
        notes.push(makeNote(fifth, barStart + 2, 1.1, BASS_VELOCITY * 0.92, 5));
      } else {
        notes.push(makeNote(rootMidi, barStart + 2.5, 1.0, BASS_VELOCITY * 0.88, 1));
      }
      break;
    case 1:
      notes.push(makeNote(rootMidi, barStart + 1.5, 0.85, BASS_VELOCITY * 0.9, 1));
      if (fifth) {
        notes.push(makeNote(fifth, barStart + 3, 0.75, BASS_VELOCITY * 0.86, 5));
      }
      break;
    default:
      notes.push(makeNote(rootMidi, barStart + 2, 1.25, BASS_VELOCITY * 0.9, 1));
      break;
  }

  return notes;
}

function renderSparseBar(barIndex: number, rootMidi: number, skipBar: boolean): MelodyNote[] {
  if (skipBar) {
    return [];
  }

  const barStart = barIndex * BEATS_PER_BAR;
  return [makeNote(rootMidi, barStart, 3.75, BASS_VELOCITY * 0.95, 1)];
}

export function generateBassNotes(
  melody: GeneratedMelody,
  chordNotes: MelodyNote[],
  options: BassGenerationOptions
): MelodyNote[] {
  const bars = melody.settings.bars;
  const barRoots = extractBarRoots(chordNotes, bars);
  const rng = new SeededRandom(createBassSeed(melody, options));
  const notes: MelodyNote[] = [];

  for (let bar = 0; bar < bars; bar += 1) {
    const rootMidi = barRoots[bar];

    switch (options.mode) {
      case 'root-pulse': {
        const useQuarterPulse = options.variant % 2 === 1;
        notes.push(...renderRootPulseBar(bar, rootMidi, useQuarterPulse));
        break;
      }
      case 'groove': {
        const templateIndex = options.variant + bar + Math.floor(rng.next() * 3);
        notes.push(...renderGrooveBar(bar, rootMidi, templateIndex));
        break;
      }
      case 'sparse': {
        const skipBar = bar % 2 === 1 && options.variant % 3 !== 0;
        notes.push(...renderSparseBar(bar, rootMidi, skipBar));
        break;
      }
    }
  }

  return notes.sort((left, right) => left.startBeats - right.startBeats || left.midi - right.midi);
}
