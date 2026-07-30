import { describe, expect, it } from 'vitest';
import { generateMelody, DEFAULT_SETTINGS } from '../src/lib/melody/generateMelody';

describe('melody generation', () => {
  it('is deterministic and keeps notes inside MIDI and timeline bounds', () => {
    const settings = { ...DEFAULT_SETTINGS, seed: 'deterministic-test', bars: 16, range: 36 };
    const first = generateMelody(settings);
    const second = generateMelody(settings);

    expect(first.fingerprint.hash).toBe(second.fingerprint.hash);

    for (const note of first.notes) {
      expect(note.midi).toBeGreaterThanOrEqual(0);
      expect(note.midi).toBeLessThanOrEqual(127);
      expect(note.startBeats).toBeGreaterThanOrEqual(0);
      expect(note.durationBeats).toBeGreaterThan(0);
      expect(note.startBeats + note.durationBeats).toBeLessThanOrEqual(settings.bars * 4);
    }
  });
});
