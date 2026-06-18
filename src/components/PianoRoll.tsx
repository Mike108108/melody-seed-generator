import { useMemo } from 'react';
import type { GeneratedMelody } from '../lib/types';
import { DRAMA_OPTIONS, GENRE_OPTIONS, ROLE_OPTIONS } from '../lib/melody/intent';
import { MelodyStatsCompact } from './MelodyStats';
import { MelodyTransport } from './MelodyTransport';
import { SeedIdChip } from './SeedIdChip';

const PIANO_ROLL_HEIGHT = 280;
const FIXED_PITCH_SPAN = 24;

type PianoRollProps = {
  melody: GeneratedMelody | null;
};

export function PianoRoll({ melody }: PianoRollProps) {
  const displayRange = useMemo(() => getDisplayRange(melody), [melody]);
  const totalBeats = melody ? melody.settings.bars * 4 : 32;
  const beatLines = Array.from({ length: totalBeats + 1 }, (_, index) => index);
  const statusTags = buildStatusTags(melody);

  return (
    <section className="panel current-melody-panel melody-panel">
      <div className="current-melody-header">
        <div className="current-melody-title">
          <p className="eyebrow">Output</p>
          <h2>Current Melody</h2>
          {statusTags.length > 0 ? (
            <div className="status-tags" aria-label="Melody status">
              {statusTags.map((tag) => (
                <span
                  key={tag}
                  className="status-tag"
                  title={tag === 'Similarity Guard: On' ? 'Designed to reduce similarity risk, not to guarantee legal clearance.' : undefined}
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
          {!melody ? (
            <p className="hint current-melody-empty">Generate a melody to preview playback and export.</p>
          ) : null}
        </div>
        <MelodyStatsCompact melody={melody} />
      </div>

      <MelodyTransport melody={melody} />

      <div className="piano-roll piano-roll-fixed" style={{ height: PIANO_ROLL_HEIGHT }}>
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

      {melody ? (
        <footer className="melody-meta-row">
          <div className="melody-meta-primary">
            <span>Type: Monophonic Lead</span>
            <SeedIdChip seed={melody.settings.seed} />
          </div>
          {melody.warnings.length > 0 ? (
            <span className="melody-meta-warning" title={melody.warnings.join(' · ')}>
              {melody.warnings.length} warning{melody.warnings.length === 1 ? '' : 's'}
            </span>
          ) : null}
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

function buildStatusTags(melody: GeneratedMelody | null): string[] {
  const saferMode = melody?.settings.commercialSaferMode ?? true;
  const tags: string[] = saferMode ? ['Similarity Guard: On'] : [];

  if (!melody) {
    return tags;
  }

  const intent = melody.intent;
  return [
    ...tags,
    labelFor(GENRE_OPTIONS, intent?.genre),
    labelFor(ROLE_OPTIONS, intent?.role),
    labelFor(DRAMA_OPTIONS, intent?.drama),
    `${melody.settings.key} ${melody.settings.scale}`,
    `${melody.settings.bpm} BPM`,
    `${melody.settings.bars} bars`,
    'Active'
  ].filter(Boolean) as string[];
}

function labelFor<T extends string>(
  options: { value: T; label: string }[],
  value: T | undefined
): string | null {
  if (!value) return null;
  return options.find((option) => option.value === value)?.label ?? null;
}
