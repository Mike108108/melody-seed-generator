import type { GeneratedMelody, GeneratedTrack, MelodyNote } from '../types';
import { getScaleDegree } from '../music/scales';
import { makeNote } from '../music/theory';
import type { ChordTone } from './chordCandidates';
import { createHarmonicPlanForMelody } from './harmonicPlan';

const BEATS_PER_BAR = 4;
const CHORD_VELOCITY = 0.52;
const ROOT_MIN_MIDI = 48;

function pitchClassToMidiAtOrAbove(pitchClass: number, minMidi: number): number {
  const normalizedPc = ((pitchClass % 12) + 12) % 12;
  let midi = minMidi;

  while (((midi % 12) + 12) % 12 !== normalizedPc) {
    midi += 1;
  }

  return midi;
}

function createEmptyChordTrack(): GeneratedTrack {
  return {
    id: 'chord-layer',
    role: 'chords',
    name: 'Chord Layer',
    channel: 1,
    notes: []
  };
}

function createChordNotesForBar(
  melody: GeneratedMelody,
  barIndex: number,
  tones: ChordTone[]
): MelodyNote[] {
  const startBeats = barIndex * BEATS_PER_BAR;
  const { key, scale } = melody.settings;
  const notes: MelodyNote[] = [];
  let minMidi = ROOT_MIN_MIDI;

  for (const tone of tones) {
    const midi = pitchClassToMidiAtOrAbove(tone.pitchClass, minMidi);
    const degree = getScaleDegree(midi, key, scale);
    notes.push(makeNote(midi, startBeats, BEATS_PER_BAR, CHORD_VELOCITY, degree));
    minMidi = midi + 1;
  }

  return notes;
}

export function createChordTrackFromHarmonicPlan(melody: GeneratedMelody): GeneratedTrack {
  const plan = createHarmonicPlanForMelody(melody);

  if (plan.bars.length === 0) {
    return createEmptyChordTrack();
  }

  const notes = plan.bars.flatMap((planned) =>
    createChordNotesForBar(melody, planned.barIndex, planned.candidate.tones)
  );

  return {
    id: 'chord-layer',
    role: 'chords',
    name: 'Chord Layer',
    channel: 1,
    notes
  };
}
