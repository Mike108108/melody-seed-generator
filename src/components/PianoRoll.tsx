import { useMemo, type CSSProperties } from 'react';
import type { GeneratedMelody } from '../lib/types';
import { midiToNoteName } from '../lib/music/notes';
import { MelodyStatsCompact } from './MelodyStats';
import { MelodyTransport } from './MelodyTransport';
import { SeedIdChip } from './SeedIdChip';

export const BAR_WIDTH_PX = 200;
export const PITCH_ROW_HEIGHT_PX = 18;
export const VISIBLE_PITCH_ROWS = 15;
export const PIANO_ROLL_HEIGHT = VISIBLE_PITCH_ROWS * PITCH_ROW_HEIGHT_PX;
export const PITCH_KEY_WIDTH = 52;
const NOTE_INSET_PX = 2;
const NOTE_HEIGHT_PX = PITCH_ROW_HEIGHT_PX - NOTE_INSET_PX * 2;
const DEFAULT_PREVIEW_BARS = 8;

type PianoRollProps = {
  melody: GeneratedMelody | null;
  isMelodyLocked: boolean;
  hasChordLayerReady: boolean;
  chordLayerAttempted: boolean;
  onLockMelody: () => void;
  onUnlockMelody: () => void;
  onAddChords: () => void;
};

export function PianoRoll({
  melody,
  isMelodyLocked,
  hasChordLayerReady,
  chordLayerAttempted,
  onLockMelody,
  onUnlockMelody,
  onAddChords
}: PianoRollProps) {
  const bars = melody?.settings.bars ?? DEFAULT_PREVIEW_BARS;
  const displayRange = useMemo(() => getDisplayRange(melody), [melody]);
  const pitchLabels = useMemo(() => buildPitchLabels(displayRange), [displayRange]);
  const outputMeta = buildOutputMeta(melody);
  const timelineWidthPx = bars * BAR_WIDTH_PX;
  const totalBeats = bars * 4;
  const beatLines = Array.from({ length: totalBeats + 1 }, (_, index) => index);

  const pianoRollStyle = {
    height: PIANO_ROLL_HEIGHT,
    '--pitch-row-height': `${PITCH_ROW_HEIGHT_PX}px`
  } as CSSProperties;

  return (
    <section className="panel current-melody-panel melody-panel">
      <div className="current-melody-header">
        <div className="current-melody-title">
          <h2>Current Melody</h2>
          {outputMeta ? (
            <p
              className="output-meta-line"
              title={outputMeta.includes('Similarity Guard') ? 'Designed to reduce similarity risk, not to guarantee legal clearance.' : undefined}
            >
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

      <div className="piano-roll-shell piano-roll-fixed" style={pianoRollStyle}>
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

        <div className="piano-roll-viewport">
          <div className="piano-roll-timeline" style={{ width: timelineWidthPx, height: PIANO_ROLL_HEIGHT }}>
            {beatLines.map((beat) => (
              <div
                key={beat}
                className={`beat-line ${beat % 4 === 0 ? 'bar-line' : ''}`}
                style={{ left: `${(beat / totalBeats) * timelineWidthPx}px` }}
              />
            ))}

            {melody && melody.notes.length > 0 ? (
              melody.notes.map((note, index) => {
                const leftPx = (note.startBeats / totalBeats) * timelineWidthPx;
                const widthPx = Math.max((note.durationBeats / totalBeats) * timelineWidthPx, 6);
                const rowIndex = displayRange.maxMidi - note.midi;
                const topPx = rowIndex * PITCH_ROW_HEIGHT_PX + NOTE_INSET_PX;

                return (
                  <div
                    key={`${note.startBeats}-${note.midi}-${index}`}
                    className="piano-note"
                    style={{ left: `${leftPx}px`, width: `${widthPx}px`, top: `${topPx}px`, height: `${NOTE_HEIGHT_PX}px` }}
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
      </div>

      {melody ? (
        <footer className="melody-meta-row">
          <SeedIdChip seed={melody.settings.seed} />
          <div className="melody-footer-actions">
            <div className="melody-lock-controls">
              {isMelodyLocked ? (
                <>
                  <span className="melody-lock-chip" aria-label="Melody locked">
                    Locked
                  </span>
                  <button type="button" className="melody-lock-button" onClick={onUnlockMelody}>
                    Unlock
                  </button>
                </>
              ) : (
                <button type="button" className="melody-lock-button" onClick={onLockMelody}>
                  Lock Melody
                </button>
              )}
            </div>
            <div className="melody-chord-controls">
              {!isMelodyLocked ? (
                <>
                  <button type="button" className="melody-lock-button" disabled>
                    Add Chords
                  </button>
                  <span className="hint melody-chord-hint">Lock melody to add chords</span>
                </>
              ) : hasChordLayerReady ? (
                <>
                  <span className="melody-chord-ready-chip" aria-label="Chord layer ready">
                    Chord Layer Ready
                  </span>
                  <span className="hint melody-chord-hint">Melody-only playback/export for now</span>
                </>
              ) : chordLayerAttempted ? (
                <span className="hint melody-chord-hint">No chord layer generated for this melody</span>
              ) : (
                <button type="button" className="melody-lock-button" onClick={onAddChords}>
                  Add Chords
                </button>
              )}
            </div>
          </div>
        </footer>
      ) : null}
    </section>
  );
}

function getDisplayRange(melody: GeneratedMelody | null) {
  if (!melody || melody.notes.length === 0) {
    const minMidi = 60;
    return { minMidi, maxMidi: minMidi + VISIBLE_PITCH_ROWS - 1, span: VISIBLE_PITCH_ROWS };
  }

  const melodyMin = Math.min(...melody.notes.map((note) => note.midi));
  const melodyMax = Math.max(...melody.notes.map((note) => note.midi));
  const center = (melodyMin + melodyMax) / 2;
  const minMidi = Math.round(center - (VISIBLE_PITCH_ROWS - 1) / 2);
  return { minMidi, maxMidi: minMidi + VISIBLE_PITCH_ROWS - 1, span: VISIBLE_PITCH_ROWS };
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
