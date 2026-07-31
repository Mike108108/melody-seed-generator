import { Midi } from '@tonejs/midi';
import { describe, expect, it } from 'vitest';
import { audioBufferToWavBytes } from '../src/lib/audio/exportWav';
import { generateMelody, DEFAULT_SETTINGS } from '../src/lib/melody/generateMelody';
import { createProvenanceJson, exportMelodyToMidiBytes } from '../src/lib/midi/exportMidi';

describe('export formats', () => {
  it('creates a parseable MIDI file with notes and tempo', () => {
    const melody = generateMelody({ ...DEFAULT_SETTINGS, seed: 'midi-export-test' });
    const bytes = exportMelodyToMidiBytes(melody);
    const parsed = new Midi(bytes);

    expect(Array.from(bytes.slice(0, 4))).toEqual([0x4d, 0x54, 0x68, 0x64]);
    expect(parsed.tracks).toHaveLength(1);
    expect(parsed.tracks[0].notes).toHaveLength(melody.notes.length);
    expect(parsed.header.tempos[0].bpm).toBe(melody.settings.bpm);
  });

  it('writes a valid 16-bit PCM WAV header and payload', () => {
    const channel = Float32Array.from([-1, 0, 1]);
    const buffer = {
      numberOfChannels: 1,
      sampleRate: 44_100,
      length: channel.length,
      getChannelData: () => channel
    } as AudioBuffer;

    const bytes = audioBufferToWavBytes(buffer);
    const view = new DataView(bytes);
    const text = (offset: number, length: number) =>
      String.fromCharCode(...new Uint8Array(bytes, offset, length));

    expect(text(0, 4)).toBe('RIFF');
    expect(text(8, 4)).toBe('WAVE');
    expect(text(36, 4)).toBe('data');
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(44_100);
    expect(view.getUint16(34, true)).toBe(16);
    expect(bytes.byteLength).toBe(44 + channel.length * 2);
  });

  it('creates provenance with an explicit non-guarantee disclosure', () => {
    const melody = generateMelody({ ...DEFAULT_SETTINGS, seed: 'provenance-export-test' });
    const provenance = createProvenanceJson(melody);

    expect(provenance.seed).toBe(melody.settings.seed);
    expect(provenance.melodyHash).toBe(melody.fingerprint.hash);
    expect(provenance.copyrightGuarantee).toBe(false);
    expect(provenance.riskDisclosure).toContain('not a legal guarantee');
  });
});
