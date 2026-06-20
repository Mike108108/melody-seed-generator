import { generateBassNotes, type BassMode } from '../harmony/bassGeneration';
import { chordHarmonicSignature } from '../harmony/chordPerformance';
import type { GeneratedMelody, GeneratedTrack, MelodyNote } from '../types';
import {
  getChordNotesFromLayeredSeed,
  hasChordLayerNotes,
  type ChordLayerState
} from './chordLayerState';

export type { BassMode } from '../harmony/bassGeneration';

export const DEFAULT_BASS_MODE: BassMode = 'root-pulse';

export type BassLayerState = {
  enabled: boolean;
  track: GeneratedTrack;
  mode: BassMode;
  variant: number;
  sourceChordSignature: string;
};

function buildBassTrack(notes: MelodyNote[]): GeneratedTrack {
  return {
    id: 'bass-layer',
    role: 'bass',
    name: 'Bass Layer',
    channel: 2,
    notes
  };
}

function buildBassLayerState(
  melody: GeneratedMelody,
  chordLayer: ChordLayerState,
  mode: BassMode,
  variant: number,
  enabled = true
): BassLayerState {
  const chordNotes = getChordNotesFromLayeredSeed(chordLayer.layeredSeed);
  const sourceChordSignature = chordHarmonicSignature(chordNotes);
  const notes = generateBassNotes(melody, chordNotes, {
    mode,
    variant,
    chordSignature: sourceChordSignature
  });

  return {
    enabled,
    track: buildBassTrack(notes),
    mode,
    variant,
    sourceChordSignature
  };
}

export function getBassNotesFromBassLayer(bassLayer: BassLayerState): MelodyNote[] {
  return bassLayer.track.notes;
}

export function hasBassLayerNotes(bassLayer: BassLayerState | null | undefined): boolean {
  return (bassLayer?.track.notes.length ?? 0) > 0;
}

export function createBassLayerState(
  melody: GeneratedMelody,
  chordLayer: ChordLayerState,
  mode: BassMode = DEFAULT_BASS_MODE
): BassLayerState | null {
  if (!hasChordLayerNotes(chordLayer.layeredSeed)) {
    return null;
  }

  return buildBassLayerState(melody, chordLayer, mode, 0);
}

export function regenerateBassLayer(
  bassLayer: BassLayerState,
  melody: GeneratedMelody,
  chordLayer: ChordLayerState
): BassLayerState | null {
  if (!hasChordLayerNotes(chordLayer.layeredSeed)) {
    return null;
  }

  return buildBassLayerState(
    melody,
    chordLayer,
    bassLayer.mode,
    bassLayer.variant + 1,
    bassLayer.enabled
  );
}

export function rebuildBassLayerMode(
  bassLayer: BassLayerState,
  melody: GeneratedMelody,
  chordLayer: ChordLayerState,
  nextMode: BassMode
): BassLayerState | null {
  if (!hasChordLayerNotes(chordLayer.layeredSeed)) {
    return null;
  }

  return buildBassLayerState(melody, chordLayer, nextMode, 0, bassLayer.enabled);
}

export function rebuildBassLayerFromChords(
  bassLayer: BassLayerState,
  melody: GeneratedMelody,
  chordLayer: ChordLayerState
): BassLayerState | null {
  if (!hasChordLayerNotes(chordLayer.layeredSeed)) {
    return null;
  }

  return buildBassLayerState(
    melody,
    chordLayer,
    bassLayer.mode,
    bassLayer.variant,
    bassLayer.enabled
  );
}

export function isBassLayerStale(
  bassLayer: BassLayerState,
  chordLayer: ChordLayerState
): boolean {
  const currentSignature = chordHarmonicSignature(getChordNotesFromLayeredSeed(chordLayer.layeredSeed));
  return bassLayer.sourceChordSignature !== currentSignature;
}
