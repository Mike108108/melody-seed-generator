import * as Tone from 'tone';
import type { GeneratedMelody, MelodyNote } from '../types';

let melodySynth: Tone.PolySynth | null = null;
let chordSynth: Tone.PolySynth | null = null;
let bassSynth: Tone.PolySynth | null = null;
let playbackEndTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let playbackGeneration = 0;

export async function playMelody(
  melody: GeneratedMelody,
  chordNotes: MelodyNote[] | null = null,
  bassNotes: MelodyNote[] | null = null,
  onPlaybackEnd?: () => void
): Promise<boolean> {
  const generation = playbackGeneration + 1;
  playbackGeneration = generation;
  await Tone.start();

  const context = Tone.getContext();
  if (context.state !== 'running') {
    await context.resume();
  }

  if (generation !== playbackGeneration || context.state !== 'running') {
    return false;
  }

  disposePlaybackResources();
  Tone.getDestination().mute = false;

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
  const startTime = Tone.now() + 0.06;

  melody.notes.forEach((note) => {
    scheduleNote(melodySynth!, note, bpm, startTime);
  });

  if (hasChords) {
    chordNotes!.forEach((note) => {
      scheduleNote(chordSynth!, note, bpm, startTime);
    });
  }

  if (hasBass) {
    bassNotes!.forEach((note) => {
      scheduleNote(bassSynth!, note, bpm, startTime);
    });
  }

  const endSeconds = beatsToSeconds(melody.settings.bars * 4 + 0.25, bpm);
  playbackEndTimer = globalThis.setTimeout(() => {
    if (generation !== playbackGeneration) return;
    stopPlayback();
    onPlaybackEnd?.();
  }, (endSeconds + 0.06) * 1_000);
  return true;
}

export function stopPlayback(): void {
  playbackGeneration += 1;
  disposePlaybackResources();
}

function disposePlaybackResources(): void {
  if (playbackEndTimer !== null) {
    globalThis.clearTimeout(playbackEndTimer);
    playbackEndTimer = null;
  }
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

function scheduleNote(
  synth: Tone.PolySynth,
  note: MelodyNote,
  bpm: number,
  startTime: number
): void {
  const startSeconds = beatsToSeconds(note.startBeats, bpm);
  const durationSeconds = beatsToSeconds(note.durationBeats * 0.92, bpm);
  synth.triggerAttackRelease(note.noteName, durationSeconds, startTime + startSeconds, note.velocity);
}

function beatsToSeconds(beats: number, bpm: number): number {
  return beats * (60 / bpm);
}
