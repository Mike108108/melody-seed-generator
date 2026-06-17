import { Midi } from '@tonejs/midi';
import type { GeneratedMelody, ProvenanceJson } from '../types';
import { slugifyFilePart } from '../utils/hash';

export function exportMelodyToMidiBytes(melody: GeneratedMelody): Uint8Array {
  const midi = new Midi();
  midi.header.setTempo(melody.settings.bpm);

  const track = midi.addTrack();
  track.name = 'Procedural Melody Seed';
  track.instrument.name = 'synth lead';
  track.channel = 0;

  melody.notes.forEach((note) => {
    track.addNote({
      midi: note.midi,
      time: beatsToSeconds(note.startBeats, melody.settings.bpm),
      duration: beatsToSeconds(note.durationBeats, melody.settings.bpm),
      velocity: note.velocity
    });
  });

  return new Uint8Array(midi.toArray());
}

export function createProvenanceJson(melody: GeneratedMelody): ProvenanceJson {
  return {
    createdBy: 'Melody Seed Generator',
    generatorVersion: '0.2.0',
    createdAt: new Date().toISOString(),
    seed: melody.settings.seed,
    key: melody.settings.key,
    scale: melody.settings.scale,
    bpm: melody.settings.bpm,
    bars: melody.settings.bars,
    mode: melody.settings.commercialSaferMode ? 'commercial-safer' : 'standard',
    intent: melody.intent,
    generationProfile: melody.generationProfile,
    usesSamples: false,
    usesAudioLoops: false,
    usesTrainingData: false,
    copyrightGuarantee: false,
    riskDisclosure:
      'This file is procedurally generated and includes local similarity/cliche checks, but it is not a legal guarantee of uniqueness or copyright clearance.',
    melodyHash: melody.fingerprint.hash,
    absolutePitchFingerprint: melody.fingerprint.absolutePitches,
    pitchClassFingerprint: melody.fingerprint.pitchClasses,
    intervalFingerprint: melody.fingerprint.intervals,
    rhythmFingerprint: melody.fingerprint.rhythm,
    contourFingerprint: melody.fingerprint.contour,
    qualityScore: melody.qualityScore,
    similarityRiskScore: melody.similarityRiskScore
  };
}

export function downloadMidi(melody: GeneratedMelody): void {
  const bytes = exportMelodyToMidiBytes(melody);
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  const midiBlob = new Blob([arrayBuffer], { type: 'audio/midi' });
  downloadBlob(midiBlob, `${baseFileName(melody)}.mid`, 'audio/midi');
}

export function downloadProvenance(melody: GeneratedMelody): void {
  const provenance = createProvenanceJson(melody);
  const blob = new Blob([JSON.stringify(provenance, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${baseFileName(melody)}.provenance.json`, 'application/json');
}

function downloadBlob(data: BlobPart | BlobPart[], filename: string, type: string): void {
  const blob = data instanceof Blob ? data : new Blob(Array.isArray(data) ? data : [data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function beatsToSeconds(beats: number, bpm: number): number {
  return beats * (60 / bpm);
}

function baseFileName(melody: GeneratedMelody): string {
  const seed = slugifyFilePart(melody.settings.seed) || 'seed';
  return `melody-${seed}-${melody.fingerprint.hash}`;
}
