import type { GeneratedMelody, LayeredSeed, ProvenanceLayer } from '../types';

const MAIN_MELODY_TRACK_ID = 'main-melody';

export function createMelodyOnlyLayeredSeed(melody: GeneratedMelody): LayeredSeed {
  return {
    schemaVersion: 1,
    id: melody.settings.seed,
    primaryTrackId: MAIN_MELODY_TRACK_ID,
    tracks: [
      {
        id: MAIN_MELODY_TRACK_ID,
        role: 'melody',
        name: 'Main Melody',
        channel: 0,
        notes: melody.notes
      }
    ]
  };
}

export function createProvenanceLayers(layeredSeed: LayeredSeed): ProvenanceLayer[] {
  return layeredSeed.tracks.map((track) => ({
    id: track.id,
    role: track.role,
    name: track.name,
    channel: track.channel,
    noteCount: track.notes.length,
    primary: track.id === layeredSeed.primaryTrackId
  }));
}
