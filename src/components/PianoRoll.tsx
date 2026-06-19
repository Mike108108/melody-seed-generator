import { useMemo } from 'react';
import type { GeneratedMelody } from '../lib/types';
import { midiToNoteName } from '../lib/music/notes';
import { MelodyStatsCompact } from './MelodyStats';
import { MelodyTransport } from './MelodyTransport';
import { SeedIdChip } from './SeedIdChip';

const PIANO_ROLL_HEIGHT = 280;
const FIXED_PITCH_SPAN = 24;
const PITCH_KEY_WIDTH = 52;

type PianoRollProps = {
  melody: GeneratedMelody | null;
};

export function PianoRoll({ melody }: PianoRollProps) {
  const displayRange = useMemo(() => getDisplayRange(melody), [melody]);
  const pitchLabels = useMemo(() => buildPitchLabels(displayRange), [displayRange]);
  const outputMeta = buildOutputMeta(melody);
  const totalBeats = melody ? melody.settings.bars * 4 : 32;
  const beatLines = Array.from({ length: totalBeats + 1 }, (_, index) => index);

  return (
    <section className="panel current-melody-panel melody-panel">
      <div className="current-melody-header">
        <div className="current-melody-title">
          <h2>Current Melody</h2>
          {outputMeta ? (
            <p className="output-meta-line" title={outputMeta.includes('Similarity Guard') ? 'Designed to reduce similarity risk, not to guarantee legal clearance.' : undefined}>
              {outputMeta}
            </p>
          ) : null}
          {!melody ? (
            <p className="hint current-melody-empty">Generate a melody to preview playback and export.</p>
          ) : null}
        </div>
        <MelodyStatsCompact melody={melody} />
      </div>

      <MelodyTransport melody={melody} />

      <div className="piano-roll-shell piano-roll-fixed" style={{ height: PIANO_ROLL_HEIGHT }}>
        <div className="piano-roll-keys" style={{ width: PITCH_KEY_WIDTH }} aria-hidden="true">
          {pitchLabels.map((label, index) => (
            <div
              key={label.midi}
              className={`pitch-key ${label.isC ? 'pitch-key--c' : ''} ${index % 2 === 1 ? 'pitch-key--alt' : ''}`}
            >
              {label.text}
            </div>
          ))}
        </div>

        <div className="piano-roll-grid">
          {beatLines.map((beat) => (
            <div
              key={beat}
              className={`beat-line ${beat % 4 === 0 ? 'bar-line' : ''}`}
              style={{ left: `${(beat / totalBeats) * 100}%` }}
            />
          ))}

          {melody && melody.notes.length > 0 ? (
            melody.notes.map((note, index) => {
              const left = (note.startBeats / totalBeats) * 100;
              const width = (note.durationBeats / totalBeats) * 100;
              const top = ((displayRange.maxMidi - note.midi) / (displayRange.span - 1)) * 100;

              return (
                <div
                  key={`${note.startBeats}-${note.midi}-${index}`}
                  className="piano-note"
                  style={{ left: `${left}%`, width: `${Math.max(width, 1.2)}%`, top: `${top}%` }}
                  title={`${note.noteName} / beat ${note.startBeats} / ${note.durationBeats} beats`}
                >
                  {note.noteName}
                </div>
              );
            })
          ) : (
            <div className="piano-roll-placeholder">Piano roll preview</div>
          )}
        </div>
      </div>

      {melody ? (
        <footer className="melody-meta-row">
          <SeedIdChip seed={melody.settings.seed} />
        </footer>
      ) : null}
    </section>
  );
}

function getDisplayRange(melody: GeneratedMelody | null) {
  if (!melody || melody.notes.length === 0) {
    return { minMidi: 60, maxMidi: 83, span: FIXED_PITCH_SPAN };
  }

  const melodyMin = Math.min(...melody.notes.map((note) => note.midi));
  const melodyMax = Math.max(...melody.notes.map((note) => note.midi));
  const center = (melodyMin + melodyMax) / 2;
  const minMidi = Math.round(center - FIXED_PITCH_SPAN / 2);
  return { minMidi, maxMidi: minMidi + FIXED_PITCH_SPAN - 1, span: FIXED_PITCH_SPAN };
}

function buildPitchLabels(displayRange: { minMidi: number; maxMidi: number; span: number }) {
  return Array.from({ length: displayRange.span }, (_, index) => {
    const midi = displayRange.maxMidi - index;
    const text = midiToNoteName(midi);
    const isC = text.startsWith('C') && !text.startsWith('C#');
    return { midi, text, isC };
  });
}

function buildOutputMeta(melody: GeneratedMelody | null): string | null {
  const saferMode = melody?.settings.commercialSaferMode ?? true;
  const parts: string[] = [];

  if (melody) {
    parts.push(`${melody.settings.key} ${melody.settings.scale}`);
    parts.push(`${melody.settings.bpm} BPM`);
    parts.push(`${melody.settings.bars} bars`);
  }

  if (saferMode) {
    parts.push('Similarity Guard On');
  }

  return parts.length > 0 ? parts.join(' · ') : null;
}
