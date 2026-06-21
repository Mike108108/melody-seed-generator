import { useMemo, useRef, type CSSProperties } from 'react';
import type { ChordFeel, ChordLength, ChordPattern } from '../lib/harmony/chordPerformance';
import type { BassLayerState, BassMode } from '../lib/seed/bassLayerState';
import type { ChordLayerState } from '../lib/seed/chordLayerState';
import type { GeneratedMelody, MelodyNote } from '../lib/types';
import { midiToNoteName } from '../lib/music/notes';
import { MelodyStatsCompact } from './MelodyStats';
import { MelodyTransport } from './MelodyTransport';

export const BAR_WIDTH_PX = 200;
export const PITCH_ROW_HEIGHT_PX = 18;
export const VISIBLE_PITCH_ROWS = 15;
export const PIANO_ROLL_HEIGHT = VISIBLE_PITCH_ROWS * PITCH_ROW_HEIGHT_PX;
export const CHORD_VISIBLE_PITCH_ROWS = 8;
export const CHORD_ROLL_HEIGHT = CHORD_VISIBLE_PITCH_ROWS * PITCH_ROW_HEIGHT_PX;
export const BASS_VISIBLE_PITCH_ROWS = 6;
export const BASS_ROLL_HEIGHT = BASS_VISIBLE_PITCH_ROWS * PITCH_ROW_HEIGHT_PX;
export const BASS_DEFAULT_MIN_MIDI = 28;
export const PITCH_KEY_WIDTH = 52;
const NOTE_INSET_PX = 2;
const NOTE_HEIGHT_PX = PITCH_ROW_HEIGHT_PX - NOTE_INSET_PX * 2;
const DEFAULT_PREVIEW_BARS = 8;

type IconProps = {
  className?: string;
};

function RegenerateIcon({ className = 'icon-circle-button__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.5 2.75A5.25 5.25 0 0 0 4.5 4.5M4.5 13.25A5.25 5.25 0 0 0 11.5 11.5"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.5 2.75V5.5h-2.75M4.5 13.25v-2.75h2.75"
      />
    </svg>
  );
}

type DisplayRange = { minMidi: number; maxMidi: number; span: number };

type PianoRollProps = {
  melody: GeneratedMelody | null;
  hasChordLayerReady: boolean;
  chordNotesForDisplay: MelodyNote[] | null;
  chordNotesForPlayback: MelodyNote[] | null;
  chordLayer: ChordLayerState | null;
  onRegenerateChords?: () => void;
  canRegenerateChords?: boolean;
  onChordPatternChange?: (pattern: ChordPattern) => void;
  onChordLengthChange?: (length: ChordLength) => void;
  onChordFeelChange?: (feel: ChordFeel) => void;
  onToggleChordLayerEnabled: () => void;
  hasBassLayerReady: boolean;
  bassNotesForDisplay: MelodyNote[] | null;
  bassNotesForPlayback: MelodyNote[] | null;
  bassLayer: BassLayerState | null;
  onRegenerateBass?: () => void;
  canRegenerateBass?: boolean;
  onBassModeChange?: (mode: BassMode) => void;
  onToggleBassLayerEnabled: () => void;
};

type PianoRollTimelineProps = {
  notes: MelodyNote[];
  displayRange: DisplayRange;
  timelineWidthPx: number;
  totalBeats: number;
  height: number;
  noteClassName?: string;
  placeholder?: string;
};

function PianoRollTimeline({
  notes,
  displayRange,
  timelineWidthPx,
  totalBeats,
  height,
  noteClassName = 'piano-note',
  placeholder
}: PianoRollTimelineProps) {
  const beatLines = useMemo(
    () => Array.from({ length: totalBeats + 1 }, (_, index) => index),
    [totalBeats]
  );

  return (
    <div className="piano-roll-timeline" style={{ width: timelineWidthPx, height }}>
      {beatLines.map((beat) => (
        <div
          key={beat}
          className={`beat-line ${beat % 4 === 0 ? 'bar-line' : ''}`}
          style={{ left: `${(beat / totalBeats) * timelineWidthPx}px` }}
        />
      ))}

      {notes.length > 0 ? (
        notes.map((note, index) => {
          const leftPx = (note.startBeats / totalBeats) * timelineWidthPx;
          const widthPx = Math.max((note.durationBeats / totalBeats) * timelineWidthPx, 6);
          const rowIndex = displayRange.maxMidi - note.midi;
          const topPx = rowIndex * PITCH_ROW_HEIGHT_PX + NOTE_INSET_PX;

          return (
            <div
              key={`${note.startBeats}-${note.midi}-${index}`}
              className={noteClassName}
              style={{ left: `${leftPx}px`, width: `${widthPx}px`, top: `${topPx}px`, height: `${NOTE_HEIGHT_PX}px` }}
              title={`${note.noteName} / beat ${note.startBeats} / ${note.durationBeats} beats`}
            >
              {note.noteName}
            </div>
          );
        })
      ) : placeholder ? (
        <div className="piano-roll-placeholder">{placeholder}</div>
      ) : null}
    </div>
  );
}

function PianoRollKeys({
  displayRange,
  height
}: {
  displayRange: DisplayRange;
  height: number;
}) {
  const pitchLabels = useMemo(() => buildPitchLabels(displayRange), [displayRange]);

  return (
    <div className="piano-roll-keys" style={{ width: PITCH_KEY_WIDTH, height }} aria-hidden="true">
      {pitchLabels.map((label, index) => (
        <div
          key={label.midi}
          className={`pitch-key ${label.isC ? 'pitch-key--c' : ''} ${index % 2 === 1 ? 'pitch-key--alt' : ''}`}
        >
          {label.text}
        </div>
      ))}
    </div>
  );
}

export function PianoRoll({
  melody,
  hasChordLayerReady,
  chordNotesForDisplay,
  chordNotesForPlayback,
  chordLayer,
  onRegenerateChords,
  canRegenerateChords = false,
  onChordPatternChange,
  onChordLengthChange,
  onChordFeelChange,
  onToggleChordLayerEnabled,
  hasBassLayerReady,
  bassNotesForDisplay,
  bassNotesForPlayback,
  bassLayer,
  onRegenerateBass,
  canRegenerateBass = false,
  onBassModeChange,
  onToggleBassLayerEnabled
}: PianoRollProps) {
  const isChordLayerEnabled = chordLayer?.enabled ?? false;
  const isBassLayerEnabled = bassLayer?.enabled ?? false;
  const chordLayerVariant = chordLayer?.variant ?? 0;
  const chordPattern = chordLayer?.performance.pattern ?? 'sustained';
  const chordLength = chordLayer?.performance.length ?? 'long';
  const chordFeel = chordLayer?.performance.feel ?? 'straight';
  const bassMode = bassLayer?.mode ?? 'root-pulse';
  const bassLayerVariant = bassLayer?.variant ?? 0;

  const melodyViewportRef = useRef<HTMLDivElement>(null);
  const chordViewportRef = useRef<HTMLDivElement>(null);
  const bassViewportRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);

  const bars = melody?.settings.bars ?? DEFAULT_PREVIEW_BARS;
  const melodyDisplayRange = useMemo(() => getDisplayRange(melody), [melody]);
  const chordDisplayRange = useMemo(
    () => getDisplayRangeForNotes(chordNotesForDisplay ?? [], CHORD_VISIBLE_PITCH_ROWS),
    [chordNotesForDisplay]
  );
  const bassDisplayRange = useMemo(
    () => getBassDisplayRange(bassNotesForDisplay ?? []),
    [bassNotesForDisplay]
  );
  const outputMeta = buildOutputMeta(melody);
  const timelineWidthPx = bars * BAR_WIDTH_PX;
  const totalBeats = bars * 4;
  const melodyNotes = melody?.notes ?? [];
  const chordNotes = hasChordLayerReady && chordNotesForDisplay ? chordNotesForDisplay : [];
  const bassNotes = hasBassLayerReady && bassNotesForDisplay ? bassNotesForDisplay : [];

  const pianoRollStyle = {
    height: PIANO_ROLL_HEIGHT,
    '--pitch-row-height': `${PITCH_ROW_HEIGHT_PX}px`
  } as CSSProperties;

  const chordRollStyle = {
    height: CHORD_ROLL_HEIGHT,
    '--pitch-row-height': `${PITCH_ROW_HEIGHT_PX}px`
  } as CSSProperties;

  const bassRollStyle = {
    height: BASS_ROLL_HEIGHT,
    '--pitch-row-height': `${PITCH_ROW_HEIGHT_PX}px`
  } as CSSProperties;

  const syncViewportScroll = (source: HTMLDivElement) => {
    if (isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    const scrollLeft = source.scrollLeft;

    for (const viewportRef of [melodyViewportRef, chordViewportRef, bassViewportRef]) {
      if (viewportRef.current && viewportRef.current !== source) {
        viewportRef.current.scrollLeft = scrollLeft;
      }
    }

    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  return (
    <section className="panel current-melody-panel melody-panel">
      <div className="current-melody-header">
        <MelodyTransport
          melody={melody}
          chordNotes={chordNotesForPlayback}
          bassNotes={bassNotesForPlayback}
          chordLayer={chordLayer}
          bassLayer={bassLayer}
        />
        <MelodyStatsCompact melody={melody} />
      </div>

      {!melody ? (
        <p className="hint current-melody-empty">Generate a seed to preview playback and export.</p>
      ) : null}

      <div className="piano-roll-stack">
        <div className="piano-roll-lane-wrap piano-roll-lane-wrap--melody">
          <div className="piano-roll-lane-header piano-roll-lane-header--melody">
            <h2 className="piano-roll-lane-label">Current Melody</h2>
            {outputMeta ? (
              <p
                className="output-meta-line piano-roll-lane-meta"
                title={outputMeta.includes('Similarity Guard') ? 'Designed to reduce similarity risk, not to guarantee legal clearance.' : undefined}
              >
                {outputMeta}
              </p>
            ) : null}
          </div>

          <div className="piano-roll-shell piano-roll-shell--melody piano-roll-fixed" style={pianoRollStyle}>
            <PianoRollKeys displayRange={melodyDisplayRange} height={PIANO_ROLL_HEIGHT} />

            <div
              className="piano-roll-viewport"
              ref={melodyViewportRef}
              onScroll={(event) => syncViewportScroll(event.currentTarget)}
            >
              <PianoRollTimeline
                notes={melodyNotes}
                displayRange={melodyDisplayRange}
                timelineWidthPx={timelineWidthPx}
                totalBeats={totalBeats}
                height={PIANO_ROLL_HEIGHT}
                placeholder="Piano roll preview"
              />
            </div>
          </div>
        </div>

        {hasChordLayerReady && chordNotes.length > 0 ? (
          <div
            className={`piano-roll-lane-wrap piano-roll-lane-wrap--chord${isChordLayerEnabled ? '' : ' is-layer-disabled'}`}
          >
            <div className="piano-roll-lane-header piano-roll-lane-header--chord">
              <div className="chord-layer-header-left">
                <h3 className="piano-roll-lane-label">Chord Layer</h3>
                <button
                  type="button"
                  role="switch"
                  className={`layer-switch${isChordLayerEnabled ? ' is-on' : ''}`}
                  onClick={onToggleChordLayerEnabled}
                  aria-label={isChordLayerEnabled ? 'Disable chord layer' : 'Enable chord layer'}
                  aria-checked={isChordLayerEnabled}
                  title={isChordLayerEnabled ? 'Disable chord layer' : 'Enable chord layer'}
                >
                  <span className="layer-switch__track" aria-hidden="true">
                    <span className="layer-switch__thumb" />
                  </span>
                </button>
              </div>
              <div className="chord-layer-performance-controls">
                <label className="chord-layer-performance-control">
                  <span className="chord-layer-performance-label">Pattern</span>
                  <select
                    value={chordPattern}
                    onChange={(event) => onChordPatternChange?.(event.target.value as ChordPattern)}
                    aria-label="Chord pattern"
                  >
                    <option value="sustained">Sustained</option>
                    <option value="half-bar">Half-bar</option>
                    <option value="quarter-pulse">Quarter pulse</option>
                    <option value="syncopated">Syncopated</option>
                  </select>
                </label>
                <label className="chord-layer-performance-control">
                  <span className="chord-layer-performance-label">Length</span>
                  <select
                    value={chordLength}
                    onChange={(event) => onChordLengthChange?.(event.target.value as ChordLength)}
                    aria-label="Chord length"
                  >
                    <option value="long">Long</option>
                    <option value="medium">Medium</option>
                    <option value="short">Short</option>
                    <option value="staccato">Staccato</option>
                  </select>
                </label>
                <label className="chord-layer-performance-control">
                  <span className="chord-layer-performance-label">Feel</span>
                  <select
                    value={chordFeel}
                    onChange={(event) => onChordFeelChange?.(event.target.value as ChordFeel)}
                    aria-label="Chord feel"
                  >
                    <option value="straight">Straight</option>
                    <option value="subtle">Subtle</option>
                    <option value="groovy">Groovy</option>
                    <option value="loose">Loose</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="piano-roll-shell piano-roll-shell--chord piano-roll-fixed" style={chordRollStyle}>
              {canRegenerateChords && onRegenerateChords ? (
                <button
                  type="button"
                  className="icon-circle-button chord-regenerate-icon-button"
                  onClick={onRegenerateChords}
                  aria-label="Regenerate Chords"
                  title="Regenerate Chords"
                >
                  <RegenerateIcon />
                </button>
              ) : null}

              <PianoRollKeys displayRange={chordDisplayRange} height={CHORD_ROLL_HEIGHT} />

              <div
                className="piano-roll-viewport"
                ref={chordViewportRef}
                onScroll={(event) => syncViewportScroll(event.currentTarget)}
              >
                <PianoRollTimeline
                  key={`chord-v${chordLayerVariant}-${chordPattern}-${chordLength}-${chordFeel}`}
                  notes={chordNotes}
                  displayRange={chordDisplayRange}
                  timelineWidthPx={timelineWidthPx}
                  totalBeats={totalBeats}
                  height={CHORD_ROLL_HEIGHT}
                  noteClassName="piano-note piano-note--chord"
                />
              </div>
            </div>
          </div>
        ) : null}

        {hasBassLayerReady && bassNotes.length > 0 ? (
          <div
            className={`piano-roll-lane-wrap piano-roll-lane-wrap--bass${isBassLayerEnabled ? '' : ' is-layer-disabled'}`}
          >
            <div className="piano-roll-lane-header piano-roll-lane-header--bass">
              <div className="bass-layer-header-left">
                <h3 className="piano-roll-lane-label">Bass Layer</h3>
                <button
                  type="button"
                  role="switch"
                  className={`layer-switch${isBassLayerEnabled ? ' is-on' : ''}`}
                  onClick={onToggleBassLayerEnabled}
                  aria-label={isBassLayerEnabled ? 'Disable bass layer' : 'Enable bass layer'}
                  aria-checked={isBassLayerEnabled}
                  title={isBassLayerEnabled ? 'Disable bass layer' : 'Enable bass layer'}
                >
                  <span className="layer-switch__track" aria-hidden="true">
                    <span className="layer-switch__thumb" />
                  </span>
                </button>
              </div>
              <div className="bass-layer-controls">
                <label className="bass-layer-control">
                  <span className="bass-layer-control-label">Mode</span>
                  <select
                    value={bassMode}
                    onChange={(event) => onBassModeChange?.(event.target.value as BassMode)}
                    aria-label="Bass mode"
                  >
                    <option value="root-pulse">Root Pulse</option>
                    <option value="groove">Groove</option>
                    <option value="sparse">Sparse</option>
                  </select>
                </label>
              </div>
            </div>
            <div className="piano-roll-shell piano-roll-shell--bass piano-roll-fixed" style={bassRollStyle}>
              {canRegenerateBass && onRegenerateBass ? (
                <button
                  type="button"
                  className="icon-circle-button bass-regenerate-icon-button"
                  onClick={onRegenerateBass}
                  aria-label="Regenerate Bass"
                  title="Regenerate Bass"
                >
                  <RegenerateIcon />
                </button>
              ) : null}

              <PianoRollKeys displayRange={bassDisplayRange} height={BASS_ROLL_HEIGHT} />

              <div
                className="piano-roll-viewport"
                ref={bassViewportRef}
                onScroll={(event) => syncViewportScroll(event.currentTarget)}
              >
                <PianoRollTimeline
                  key={`bass-v${bassLayerVariant}-${bassMode}`}
                  notes={bassNotes}
                  displayRange={bassDisplayRange}
                  timelineWidthPx={timelineWidthPx}
                  totalBeats={totalBeats}
                  height={BASS_ROLL_HEIGHT}
                  noteClassName="piano-note piano-note--bass"
                />
              </div>
            </div>
          </div>
        ) : null}

        {hasChordLayerReady || hasBassLayerReady ? (
          <p className="hint melody-chord-playback-hint">
            Active layers are included in playback, MIDI, and WAV export.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function getDisplayRange(melody: GeneratedMelody | null): DisplayRange {
  if (!melody || melody.notes.length === 0) {
    const minMidi = 60;
    return { minMidi, maxMidi: minMidi + VISIBLE_PITCH_ROWS - 1, span: VISIBLE_PITCH_ROWS };
  }

  return getDisplayRangeForNotes(melody.notes, VISIBLE_PITCH_ROWS);
}

function getDisplayRangeForNotes(notes: MelodyNote[], visibleRows: number): DisplayRange {
  if (notes.length === 0) {
    const minMidi = 60;
    return { minMidi, maxMidi: minMidi + visibleRows - 1, span: visibleRows };
  }

  const noteMin = Math.min(...notes.map((note) => note.midi));
  const noteMax = Math.max(...notes.map((note) => note.midi));
  const center = (noteMin + noteMax) / 2;
  const minMidi = Math.round(center - (visibleRows - 1) / 2);
  return { minMidi, maxMidi: minMidi + visibleRows - 1, span: visibleRows };
}

function getBassDisplayRange(notes: MelodyNote[]): DisplayRange {
  if (notes.length === 0) {
    const minMidi = BASS_DEFAULT_MIN_MIDI;
    return { minMidi, maxMidi: minMidi + BASS_VISIBLE_PITCH_ROWS - 1, span: BASS_VISIBLE_PITCH_ROWS };
  }

  return getDisplayRangeForNotes(notes, BASS_VISIBLE_PITCH_ROWS);
}

function buildPitchLabels(displayRange: DisplayRange) {
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
