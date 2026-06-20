import * as Tone from 'tone';
import type { GeneratedMelody, MelodyNote } from '../types';
import { slugifyFilePart } from '../utils/hash';

const LEAD_SYNTH_OPTIONS = {
  oscillator: { type: 'triangle' as const },
  envelope: {
    attack: 0.01,
    decay: 0.08,
    sustain: 0.45,
    release: 0.18
  }
};

const CHORD_SYNTH_OPTIONS = {
  oscillator: { type: 'sine' as const },
  envelope: {
    attack: 0.02,
    decay: 0.12,
    sustain: 0.55,
    release: 0.25
  }
};

const CHORD_VOLUME_DB = -12;

const NOTE_DURATION_FACTOR = 0.92;
const TAIL_BEATS = 0.25;
const RELEASE_TAIL_SECONDS = 0.2;

function beatsToSeconds(beats: number, bpm: number): number {
  return beats * (60 / bpm);
}

function lastNoteEndBeats(notes: MelodyNote[]): number {
  return notes.reduce(
    (max, note) => Math.max(max, note.startBeats + note.durationBeats * NOTE_DURATION_FACTOR),
    0
  );
}

function computeRenderDurationSeconds(
  melody: GeneratedMelody,
  chordNotes?: MelodyNote[] | null
): number {
  const { bpm, bars } = melody.settings;
  const melodyEndBeats = lastNoteEndBeats(melody.notes);
  const chordEndBeats = chordNotes && chordNotes.length > 0 ? lastNoteEndBeats(chordNotes) : 0;
  const lastNoteEndBeatsValue = Math.max(melodyEndBeats, chordEndBeats);
  const contentEndBeats = Math.max(bars * 4 + TAIL_BEATS, lastNoteEndBeatsValue + TAIL_BEATS);
  return beatsToSeconds(contentEndBeats, bpm) + RELEASE_TAIL_SECONDS;
}

function scheduleNotes(
  synth: Tone.PolySynth,
  notes: MelodyNote[],
  bpm: number,
  transport: ReturnType<typeof Tone.getTransport>
): void {
  notes.forEach((note) => {
    const startSeconds = beatsToSeconds(note.startBeats, bpm);
    const noteDurationSeconds = beatsToSeconds(note.durationBeats * NOTE_DURATION_FACTOR, bpm);
    transport.schedule((time) => {
      synth.triggerAttackRelease(note.noteName, noteDurationSeconds, time, note.velocity);
    }, startSeconds);
  });
}

export async function renderMelodyToAudioBuffer(
  melody: GeneratedMelody,
  chordNotes?: MelodyNote[] | null
): Promise<AudioBuffer> {
  const hasChords = chordNotes !== null && chordNotes !== undefined && chordNotes.length > 0;
  const durationSeconds = computeRenderDurationSeconds(melody, hasChords ? chordNotes : null);

  const toneBuffer = await Tone.Offline(({ transport }) => {
    const melodySynth = new Tone.PolySynth(Tone.Synth, LEAD_SYNTH_OPTIONS).toDestination();
    scheduleNotes(melodySynth, melody.notes, melody.settings.bpm, transport);

    if (hasChords) {
      const chordSynth = new Tone.PolySynth(Tone.Synth, CHORD_SYNTH_OPTIONS).toDestination();
      chordSynth.volume.value = CHORD_VOLUME_DB;
      scheduleNotes(chordSynth, chordNotes!, melody.settings.bpm, transport);
    }

    transport.start(0);
  }, durationSeconds);

  const audioBuffer = toneBuffer.get();
  if (!audioBuffer) {
    throw new Error('Failed to render melody audio buffer.');
  }

  return audioBuffer;
}

export function audioBufferToWavBytes(buffer: AudioBuffer): ArrayBuffer {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  const samples = buffer.length;
  const dataLength = samples * blockAlign;
  const headerLength = 44;
  const totalLength = headerLength + dataLength;
  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);
  const channels = Array.from({ length: numChannels }, (_, index) => buffer.getChannelData(index));

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = headerLength;
  for (let i = 0; i < samples; i += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = Math.max(-1, Math.min(1, channels[channel][i]));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(offset, intSample, true);
      offset += bytesPerSample;
    }
  }

  return arrayBuffer;
}

function baseFileName(melody: GeneratedMelody): string {
  const seed = slugifyFilePart(melody.settings.seed) || 'seed';
  return `melody-${seed}-${melody.fingerprint.hash}`;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function downloadWav(melody: GeneratedMelody, chordNotes?: MelodyNote[] | null): Promise<void> {
  const hasChords = chordNotes !== null && chordNotes !== undefined && chordNotes.length > 0;
  const audioBuffer = await renderMelodyToAudioBuffer(melody, hasChords ? chordNotes : null);
  const wavArrayBuffer = audioBufferToWavBytes(audioBuffer);
  const blob = new Blob([wavArrayBuffer], { type: 'audio/wav' });
  const filename = hasChords
    ? `${baseFileName(melody)}-wav-chords.wav`
    : `${baseFileName(melody)}.wav`;
  downloadBlob(blob, filename);
}
