import * as Tone from 'tone';
import type { GeneratedMelody, MelodyNote } from '../types';

let melodySynth: Tone.PolySynth | null = null;
let chordSynth: Tone.PolySynth | null = null;
let bassSynth: Tone.PolySynth | null = null;

export async function playMelody(
  melody: GeneratedMelody,
  chordNotes: MelodyNote[] | null = null,
  bassNotes: MelodyNote[] | null = null
): Promise<void> {
  await Tone.start();
  stopPlayback();

  melodySynth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: {
      attack: 0.01,
      decay: 0.08,
      sustain: 0.45,
      release: 0.18
    }
  }).toDestination();

  const hasChords = chordNotes !== null && chordNotes.length > 0;
  const hasBass = bassNotes !== null && bassNotes.length > 0;

  if (hasChords) {
    chordSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.02,
        decay: 0.12,
        sustain: 0.55,
        release: 0.25
      }
    }).toDestination();
    chordSynth.volume.value = -12;
  }

  if (hasBass) {
    bassSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: {
        attack: 0.015,
        decay: 0.1,
        sustain: 0.5,
        release: 0.22
      }
    }).toDestination();
    bassSynth.volume.value = -8;
  }

  const bpm = melody.settings.bpm;
  Tone.Transport.bpm.value = bpm;
  Tone.Transport.cancel(0);
  Tone.Transport.position = 0;

  melody.notes.forEach((note) => {
    scheduleNote(melodySynth!, note, bpm);
  });

  if (hasChords) {
    chordNotes!.forEach((note) => {
      scheduleNote(chordSynth!, note, bpm);
    });
  }

  if (hasBass) {
    bassNotes!.forEach((note) => {
      scheduleNote(bassSynth!, note, bpm);
    });
  }

  const endSeconds = beatsToSeconds(melody.settings.bars * 4 + 0.25, bpm);
  Tone.Transport.scheduleOnce(() => stopPlayback(), endSeconds);
  Tone.Transport.start('+0.05', 0);
}

export function stopPlayback(): void {
  Tone.Transport.stop();
  Tone.Transport.cancel(0);
  if (melodySynth) {
    melodySynth.releaseAll();
    melodySynth.dispose();
    melodySynth = null;
  }
  if (chordSynth) {
    chordSynth.releaseAll();
    chordSynth.dispose();
    chordSynth = null;
  }
  if (bassSynth) {
    bassSynth.releaseAll();
    bassSynth.dispose();
    bassSynth = null;
  }
}

function scheduleNote(synth: Tone.PolySynth, note: MelodyNote, bpm: number): void {
  const startSeconds = beatsToSeconds(note.startBeats, bpm);
  const durationSeconds = beatsToSeconds(note.durationBeats * 0.92, bpm);
  Tone.Transport.scheduleOnce((time) => {
    synth.triggerAttackRelease(note.noteName, durationSeconds, time, note.velocity);
  }, startSeconds);
}

function beatsToSeconds(beats: number, bpm: number): number {
  return beats * (60 / bpm);
}
