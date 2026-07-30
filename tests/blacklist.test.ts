import { describe, expect, it } from 'vitest';
import { detectCliches } from '../src/lib/melody/blacklist';
import { createFingerprint } from '../src/lib/melody/fingerprint';
import { makeNote } from '../src/lib/music/theory';

describe('cliche detection', () => {
  it('recognizes an octave scale pattern after pitch-class normalization', () => {
    const midis = [60, 62, 64, 65, 67, 69, 71, 72];
    const notes = midis.map((midi, index) => makeNote(midi, index, 1, 0.7, index % 7));
    const warnings = detectCliches(notes, createFingerprint(notes), 2);

    expect(warnings).toContain('Contains a known cliche-like pitch-class pattern.');
  });
});
