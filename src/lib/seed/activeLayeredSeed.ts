import type { GeneratedMelody, LayeredSeed } from '../types';
import type { BassLayerState } from './bassLayerState';
import { hasBassLayerNotes } from './bassLayerState';
import type { ChordLayerState } from './chordLayerState';
import { hasChordLayerNotes } from './chordLayerState';
import { createMelodyOnlyLayeredSeed } from './layeredSeed';

export function createActiveLayeredSeed(
  melody: GeneratedMelody,
  chordLayer: ChordLayerState | null,
  bassLayer: BassLayerState | null
): LayeredSeed {
  const melodyOnly = createMelodyOnlyLayeredSeed(melody);
  const tracks = [...melodyOnly.tracks];

  if (chordLayer?.enabled && hasChordLayerNotes(chordLayer.layeredSeed)) {
    const chordTrack = chordLayer.layeredSeed.tracks.find((track) => track.role === 'chords');
    if (chordTrack && chordTrack.notes.length > 0) {
      tracks.push(chordTrack);
    }
  }

  if (bassLayer?.enabled && hasBassLayerNotes(bassLayer)) {
    tracks.push(bassLayer.track);
  }

  return {
    ...melodyOnly,
    tracks
  };
}

export function hasActiveLayeredTracks(
  chordLayer: ChordLayerState | null,
  bassLayer: BassLayerState | null
): boolean {
  const hasActiveChords = chordLayer?.enabled === true && hasChordLayerNotes(chordLayer.layeredSeed);
  const hasActiveBass = bassLayer?.enabled === true && hasBassLayerNotes(bassLayer);
  return hasActiveChords || hasActiveBass;
}
