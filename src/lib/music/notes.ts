export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

type KeyName = (typeof KEYS)[number];

const NOTE_TO_PC: Record<KeyName, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  Eb: 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  Ab: 8,
  A: 9,
  Bb: 10,
  B: 11
};

const PC_TO_NOTE = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

export function noteToPitchClass(note: string): number {
  const key = note as KeyName;
  if (!(key in NOTE_TO_PC)) {
    throw new Error(`Unsupported key: ${note}`);
  }
  return NOTE_TO_PC[key];
}

export function noteToMidi(note: string, octave: number): number {
  return 12 * (octave + 1) + noteToPitchClass(note);
}

export function midiToNoteName(midi: number): string {
  const pitchClass = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${PC_TO_NOTE[pitchClass]}${octave}`;
}

export function pitchClassName(pitchClass: number): string {
  return PC_TO_NOTE[((pitchClass % 12) + 12) % 12];
}
