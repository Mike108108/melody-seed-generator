import { useEffect, useMemo, useState } from 'react';
import type { GeneratedMelody, LayeredSeed, MelodyNote } from '../lib/types';
import { downloadWav } from '../lib/audio/exportWav';
import { downloadLayeredMidi, downloadMidi, downloadProvenance } from '../lib/midi/exportMidi';
import { playMelody, stopPlayback } from '../lib/audio/playback';

export type DownloadFormat = 'midi' | 'layered-midi' | 'provenance' | 'wav' | 'mp3';

type MelodyTransportProps = {
  melody: GeneratedMelody | null;
  chordNotes?: MelodyNote[] | null;
  layeredSeedWithChords?: LayeredSeed | null;
};

const BASE_DOWNLOAD_OPTIONS: { value: DownloadFormat; label: string; disabled?: boolean }[] = [
  { value: 'midi', label: 'MIDI' },
  { value: 'wav', label: 'WAV' },
  { value: 'provenance', label: 'JSON' },
  { value: 'mp3', label: 'MP3', disabled: true }
];

const LAYERED_MIDI_OPTION = { value: 'layered-midi' as const, label: 'MIDI + Chords' };

function hasPreparedChordTrack(layeredSeed: LayeredSeed | null | undefined): layeredSeed is LayeredSeed {
  return (
    layeredSeed?.tracks.some((track) => track.role === 'chords' && track.notes.length > 0) ?? false
  );
}

export function MelodyTransport({
  melody,
  chordNotes = null,
  layeredSeedWithChords = null
}: MelodyTransportProps) {
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('midi');
  const [exporting, setExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const disabled = melody === null;
  const layeredMidiAvailable = hasPreparedChordTrack(layeredSeedWithChords);

  const downloadOptions = useMemo(() => {
    if (!layeredMidiAvailable) {
      return BASE_DOWNLOAD_OPTIONS;
    }

    return [BASE_DOWNLOAD_OPTIONS[0], LAYERED_MIDI_OPTION, ...BASE_DOWNLOAD_OPTIONS.slice(1)];
  }, [layeredMidiAvailable]);

  useEffect(() => {
    stopPlayback();
    setIsPlaying(false);
  }, [melody, chordNotes]);

  useEffect(() => {
    if (!layeredMidiAvailable && downloadFormat === 'layered-midi') {
      setDownloadFormat('midi');
    }
  }, [layeredMidiAvailable, downloadFormat]);

  useEffect(() => {
    return () => {
      stopPlayback();
    };
  }, []);

  const selectedOption = downloadOptions.find((option) => option.value === downloadFormat) ?? downloadOptions[0];

  const handlePlay = async () => {
    if (!melody) return;
    setIsPlaying(true);
    try {
      await playMelody(melody, chordNotes);
    } finally {
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    stopPlayback();
    setIsPlaying(false);
  };

  const handleDownload = async () => {
    if (!melody || exporting) return;

    if (downloadFormat === 'midi') {
      downloadMidi(melody);
      return;
    }

    if (downloadFormat === 'layered-midi') {
      if (hasPreparedChordTrack(layeredSeedWithChords)) {
        downloadLayeredMidi(melody, layeredSeedWithChords);
      }
      return;
    }

    if (downloadFormat === 'provenance') {
      downloadProvenance(melody);
      return;
    }

    if (downloadFormat === 'wav') {
      setExporting(true);
      try {
        await downloadWav(melody);
      } finally {
        setExporting(false);
      }
    }
  };

  return (
    <div className="melody-transport" aria-label="Melody playback and export">
      <div className="melody-transport-controls">
        <div className="segmented-control playback-control" role="group" aria-label="Playback">
          <button
            type="button"
            className={isPlaying ? '' : 'is-active'}
            disabled={disabled}
            onClick={() => void handlePlay()}
            aria-label="Play melody"
            title="Play melody"
          >
            ▶ Play
          </button>
          <button
            type="button"
            className={isPlaying ? 'is-active' : ''}
            disabled={disabled}
            onClick={handleStop}
            aria-label="Stop playback"
            title="Stop playback"
          >
            ■ Stop
          </button>
        </div>

        <div className="download-control">
          <button
            type="button"
            className="download-control-action"
            disabled={disabled || exporting || downloadFormat === 'mp3'}
            onClick={() => void handleDownload()}
            aria-label={exporting ? 'Rendering WAV audio' : `Download ${selectedOption.label}`}
            title={exporting ? 'Rendering WAV audio…' : `Download ${selectedOption.label}`}
          >
            <span className="download-control-icon" aria-hidden="true">
              ⬇
            </span>
            <span>{exporting ? 'Rendering…' : selectedOption.label}</span>
          </button>
          <label className="download-control-picker">
            <span className="sr-only">Download format</span>
            <select
              value={downloadFormat}
              disabled={disabled}
              onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)}
              aria-label="Download format"
              title="Download format"
            >
              {downloadOptions.map((option) => (
                <option key={option.value} value={option.value} disabled={option.disabled}>
                  {option.disabled ? `${option.label} (soon)` : option.label}
                </option>
              ))}
            </select>
            <span className="download-control-caret" aria-hidden="true">
              ▾
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
