import { useState } from 'react';
import type { GeneratedMelody } from '../lib/types';
import { downloadMidi, downloadProvenance } from '../lib/midi/exportMidi';
import { playMelody, stopPlayback } from '../lib/audio/playback';

export type DownloadFormat = 'midi' | 'provenance' | 'wav' | 'mp3';

type MelodyTransportProps = {
  melody: GeneratedMelody | null;
};

const DOWNLOAD_OPTIONS: { value: DownloadFormat; label: string; disabled?: boolean }[] = [
  { value: 'midi', label: 'MIDI' },
  { value: 'provenance', label: 'Provenance JSON' },
  { value: 'wav', label: 'WAV (coming soon)', disabled: true },
  { value: 'mp3', label: 'MP3 (coming soon)', disabled: true }
];

export function MelodyTransport({ melody }: MelodyTransportProps) {
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('midi');
  const disabled = melody === null;

  const handleDownload = () => {
    if (!melody) return;

    if (downloadFormat === 'midi') {
      downloadMidi(melody);
      return;
    }

    if (downloadFormat === 'provenance') {
      downloadProvenance(melody);
    }
  };

  return (
    <div className="melody-transport" aria-label="Melody playback and export">
      <div className="melody-transport-controls">
        <button
          type="button"
          className="icon-button"
          disabled={disabled}
          onClick={() => melody && void playMelody(melody)}
          aria-label="Play melody"
          title="Play melody"
        >
          ▶
        </button>
        <button
          type="button"
          className="icon-button"
          disabled={disabled}
          onClick={stopPlayback}
          aria-label="Stop playback"
          title="Stop playback"
        >
          ■
        </button>
        <button
          type="button"
          className="icon-button"
          disabled={disabled || downloadFormat === 'wav' || downloadFormat === 'mp3'}
          onClick={handleDownload}
          aria-label="Download melody"
          title="Download melody"
        >
          ⬇
        </button>
        <label className="download-format-label">
          <span className="sr-only">Download format</span>
          <select
            className="download-format-select"
            value={downloadFormat}
            disabled={disabled}
            onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)}
            aria-label="Download format"
            title="Download format"
          >
            {DOWNLOAD_OPTIONS.map((option) => (
              <option key={option.value} value={option.value} disabled={option.disabled}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="hint melody-transport-hint">Preview with Tone.js, then download MIDI for local rendering.</p>
    </div>
  );
}
