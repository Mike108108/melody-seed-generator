import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import type { GeneratedMelody, LayeredSeed, MelodyNote } from '../lib/types';
import { midiToNoteName } from '../lib/music/notes';
import { MelodyStatsCompact } from './MelodyStats';
import { MelodyTransport } from './MelodyTransport';
import { SeedIdChip } from './SeedIdChip';

export const BAR_WIDTH_PX = 200;
export const PITCH_ROW_HEIGHT_PX = 18;
export const VISIBLE_PITCH_ROWS = 15;
export const PIANO_ROLL_HEIGHT = VISIBLE_PITCH_ROWS * PITCH_ROW_HEIGHT_PX;
export const CHORD_VISIBLE_PITCH_ROWS = 8;
export const CHORD_ROLL_HEIGHT = CHORD_VISIBLE_PITCH_ROWS * PITCH_ROW_HEIGHT_PX;
export const PITCH_KEY_WIDTH = 52;
const NOTE_INSET_PX = 2;
const NOTE_HEIGHT_PX = PITCH_ROW_HEIGHT_PX - NOTE_INSET_PX * 2;
const DEFAULT_PREVIEW_BARS = 8;

type IconProps = {
  className?: string;
};

function LockedIcon({ className = 'icon-circle-button__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.75 7.25V5a3.25 3.25 0 0 1 6.5 0v2.25"
      />
      <rect
        x="3.25"
        y="7.25"
        width="9.5"
        height="6.75"
        rx="1.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function UnlockedIcon({ className = 'icon-circle-button__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.75 7.25V5a3.25 3.25 0 0 1 6.5 0"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        d="M11.25 5v2"
      />
      <rect
        x="3.25"
        y="7.25"
        width="9.5"
        height="6.75"
        rx="1.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AddLayerIcon({ className = 'icon-circle-button__icon' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        d="M8 3.75v8.5M3.75 8h8.5"
      />
    </svg>
  );
}

type DisplayRange = { minMidi: number; maxMidi: number; span: number };

type PianoRollProps = {
  melody: GeneratedMelody | null;
  isMelodyLocked: boolean;
  hasChordLayerReady: boolean;
  chordNotesForPlayback: MelodyNote[] | null;
  layeredSeedWithChords: LayeredSeed | null;
  onLockMelody: () => void;
  onUnlockMelody: () => void;
  onAddChords: () => void;
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
  isMelodyLocked,
  hasChordLayerReady,
  chordNotesForPlayback,
  layeredSeedWithChords,
  onLockMelody,
  onUnlockMelody,
  onAddChords
}: PianoRollProps) {
  const [isAddLayerMenuOpen, setIsAddLayerMenuOpen] = useState(false);
  const addLayerMenuRef = useRef<HTMLDivElement>(null);
  const melodyViewportRef = useRef<HTMLDivElement>(null);
  const chordViewportRef = useRef<HTMLDivElement>(null);
  const isSyncingScrollRef = useRef(false);

  const bars = melody?.settings.bars ?? DEFAULT_PREVIEW_BARS;
  const melodyDisplayRange = useMemo(() => getDisplayRange(melody), [melody]);
  const chordDisplayRange = useMemo(
    () => getDisplayRangeForNotes(chordNotesForPlayback ?? [], CHORD_VISIBLE_PITCH_ROWS),
    [chordNotesForPlayback]
  );
  const outputMeta = buildOutputMeta(melody);
  const timelineWidthPx = bars * BAR_WIDTH_PX;
  const totalBeats = bars * 4;
  const melodyNotes = melody?.notes ?? [];
  const chordNotes = hasChordLayerReady && chordNotesForPlayback ? chordNotesForPlayback : [];

  const pianoRollStyle = {
    height: PIANO_ROLL_HEIGHT,
    '--pitch-row-height': `${PITCH_ROW_HEIGHT_PX}px`
  } as CSSProperties;

  const chordRollStyle = {
    height: CHORD_ROLL_HEIGHT,
    '--pitch-row-height': `${PITCH_ROW_HEIGHT_PX}px`
  } as CSSProperties;

  useEffect(() => {
    setIsAddLayerMenuOpen(false);
  }, [isMelodyLocked, hasChordLayerReady]);

  useEffect(() => {
    if (!isAddLayerMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (!addLayerMenuRef.current?.contains(event.target as Node)) {
        setIsAddLayerMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAddLayerMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAddLayerMenuOpen]);

  const handleLockToggle = () => {
    if (isMelodyLocked) {
      onUnlockMelody();
    } else {
      onLockMelody();
    }
  };

  const handleAddChordsFromMenu = () => {
    if (!isMelodyLocked || hasChordLayerReady) return;
    onAddChords();
    setIsAddLayerMenuOpen(false);
  };

  const syncViewportScroll = (source: HTMLDivElement, target: HTMLDivElement | null) => {
    if (!target || isSyncingScrollRef.current) return;
    isSyncingScrollRef.current = true;
    target.scrollLeft = source.scrollLeft;
    requestAnimationFrame(() => {
      isSyncingScrollRef.current = false;
    });
  };

  const addChordsDisabled = !isMelodyLocked || hasChordLayerReady;
  const addChordsHint = !isMelodyLocked
    ? 'Lock melody to add layers'
    : hasChordLayerReady
      ? 'Chords already added'
      : null;

  return (
    <section className="panel current-melody-panel melody-panel">
      <div className="current-melody-header">
        <div className="current-melody-title">
          <div className="current-melody-title-row">
            <h2>Current Melody</h2>
            {melody ? <SeedIdChip seed={melody.settings.seed} /> : null}
          </div>
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

      <MelodyTransport
        melody={melody}
        chordNotes={chordNotesForPlayback}
        layeredSeedWithChords={layeredSeedWithChords}
      />

      <div className="piano-roll-stack">
        <div className="piano-roll-lane-wrap piano-roll-lane-wrap--melody">
          {melody ? (
            <button
              type="button"
              className={`icon-circle-button melody-lock-icon-button${isMelodyLocked ? ' is-locked' : ''}`}
              onClick={handleLockToggle}
              aria-label={isMelodyLocked ? 'Unlock melody' : 'Lock melody'}
              title={isMelodyLocked ? 'Unlock melody' : 'Lock melody'}
            >
              {isMelodyLocked ? <LockedIcon /> : <UnlockedIcon />}
            </button>
          ) : null}

          <div className="piano-roll-shell piano-roll-fixed" style={pianoRollStyle}>
            <PianoRollKeys displayRange={melodyDisplayRange} height={PIANO_ROLL_HEIGHT} />

            <div
              className="piano-roll-viewport"
              ref={melodyViewportRef}
              onScroll={(event) => syncViewportScroll(event.currentTarget, chordViewportRef.current)}
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
          <div className="piano-roll-lane-wrap piano-roll-lane-wrap--chord">
            <div className="piano-roll-lane-label">Chord Layer</div>
            <div className="piano-roll-shell piano-roll-shell--chord piano-roll-fixed" style={chordRollStyle}>
              <PianoRollKeys displayRange={chordDisplayRange} height={CHORD_ROLL_HEIGHT} />

              <div
                className="piano-roll-viewport"
                ref={chordViewportRef}
                onScroll={(event) => syncViewportScroll(event.currentTarget, melodyViewportRef.current)}
              >
                <PianoRollTimeline
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

        {hasChordLayerReady ? (
          <p className="hint melody-chord-playback-hint">
            Playback includes chords · MIDI + Chords available · WAV remains melody-only
          </p>
        ) : null}

        {melody ? (
          <div className="piano-roll-stack-footer">
            <div className="add-layer-footer-action" ref={addLayerMenuRef}>
              <button
                type="button"
                className="icon-circle-button add-layer-trigger"
                onClick={() => setIsAddLayerMenuOpen((open) => !open)}
                aria-label="Add layer"
                title="Add layer"
                aria-expanded={isAddLayerMenuOpen}
                aria-haspopup="menu"
              >
                <AddLayerIcon />
              </button>
              {isAddLayerMenuOpen ? (
                <div className="add-layer-menu" role="menu">
                  <button
                    type="button"
                    className="add-layer-menu-item"
                    role="menuitem"
                    disabled={addChordsDisabled}
                    onClick={handleAddChordsFromMenu}
                  >
                    <span className="add-layer-menu-item-label">Add Chords</span>
                    {addChordsHint ? (
                      <span className="add-layer-menu-item-hint">{addChordsHint}</span>
                    ) : null}
                  </button>
                </div>
              ) : null}
            </div>
          </div>
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
