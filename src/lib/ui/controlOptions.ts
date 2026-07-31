import type { BassMode } from '../harmony/bassGeneration';
import type { ChordFeel, ChordLength, ChordPattern } from '../harmony/chordPerformance';

export type ControlOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export const CHORD_PATTERN_OPTIONS: ControlOption<ChordPattern>[] = [
  { value: 'sustained', label: 'Sustained' },
  { value: 'half-bar', label: 'Half-bar' },
  { value: 'quarter-pulse', label: 'Quarter pulse' },
  { value: 'syncopated', label: 'Syncopated' }
];

export const CHORD_LENGTH_OPTIONS: ControlOption<ChordLength>[] = [
  { value: 'long', label: 'Long' },
  { value: 'medium', label: 'Medium' },
  { value: 'short', label: 'Short' },
  { value: 'staccato', label: 'Staccato' }
];

export const CHORD_FEEL_OPTIONS: ControlOption<ChordFeel>[] = [
  { value: 'straight', label: 'Straight' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'groovy', label: 'Groovy' },
  { value: 'loose', label: 'Loose' }
];

export const BASS_MODE_OPTIONS: ControlOption<BassMode>[] = [
  { value: 'root-pulse', label: 'Root Pulse' },
  { value: 'groove', label: 'Groove' },
  { value: 'sparse', label: 'Sparse' }
];

export type DownloadFormat = 'midi' | 'wav' | 'project' | 'provenance' | 'mp3';

export const DOWNLOAD_OPTIONS: ControlOption<DownloadFormat>[] = [
  { value: 'midi', label: 'MIDI' },
  { value: 'wav', label: 'WAV' },
  { value: 'project', label: 'Project' },
  { value: 'provenance', label: 'Provenance' },
  { value: 'mp3', label: 'MP3', disabled: true }
];
