import * as Tone from 'tone';
import type { GeneratedMelody } from '../types';

let synth: Tone.PolySynth | null = null;

export async function playMelody(melody: GeneratedMelody): Promise<void> {
  await Tone.start();
  stopPlayback();

  synth = new Tone.PolySynth(Tone.Synth, {
    oscillator: { type: 'triangle' },
    envelope: {
      attack: 0.01,
      decay: 0.08,
      sustain: 0.45,
      release: 0.18
    }
  }).toDestination();

  Tone.Transport.bpm.value = melody.settings.bpm;
  Tone.Transport.cancel(0);
  Tone.Transport.position = 0;

  melody.notes.forEach((note) => {
    const startSeconds = beatsToSeconds(note.startBeats, melody.settings.bpm);
    const durationSeconds = beatsToSeconds(note.durationBeats * 0.92, melody.settings.bpm);
    Tone.Transport.scheduleOnce((time) => {
      synth?.triggerAttackRelease(note.noteName, durationSeconds, time, note.velocity);
    }, startSeconds);
  });

  const endSeconds = beatsToSeconds(melody.settings.bars * 4 + 0.25, melody.settings.bpm);
  Tone.Transport.scheduleOnce(() => stopPlayback(), endSeconds);
  Tone.Transport.start('+0.05', 0);
}

export function stopPlayback(): void {
  Tone.Transport.stop();
  Tone.Transport.cancel(0);
  if (synth) {
    synth.releaseAll();
    synth.dispose();
    synth = null;
  }
}

function beatsToSeconds(beats: number, bpm: number): number {
  return beats * (60 / bpm);
}
