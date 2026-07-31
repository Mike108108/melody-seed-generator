import { useState } from 'react';
import { createActiveLayeredSeed, hasActiveLayeredTracks } from '../lib/seed/activeLayeredSeed';
import type { BassLayerState } from '../lib/seed/bassLayerState';
import type { ChordLayerState } from '../lib/seed/chordLayerState';
import type { GeneratedMelody, MelodyNote } from '../lib/types';
import { downloadWav } from '../lib/audio/exportWav';
import { downloadLayeredMidi, downloadMidi } from '../lib/midi/exportMidi';
import { DOWNLOAD_OPTIONS, type DownloadFormat } from '../lib/ui/controlOptions';
import { InstrumentSelect } from './InstrumentSelect';

type MelodyTransportProps = {
  melody: GeneratedMelody | null;
  chordNotes?: MelodyNote[] | null;
  bassNotes?: MelodyNote[] | null;
  chordLayer?: ChordLayerState | null;
  bassLayer?: BassLayerState | null;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  onDownloadProject?: () => void | Promise<void>;
};

export function MelodyTransport({
  melody,
  chordNotes = null,
  bassNotes = null,
  chordLayer = null,
  bassLayer = null,
  isPlaying,
  onPlay,
  onStop,
  onDownloadProject
}: MelodyTransportProps) {
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('midi');
  const [exporting, setExporting] = useState(false);
  const disabled = melody === null;

  const selectedOption = DOWNLOAD_OPTIONS.find((option) => option.value === downloadFormat) ?? DOWNLOAD_OPTIONS[0];
  const hasActiveLayers = hasActiveLayeredTracks(chordLayer, bassLayer);

  const handleDownload = async () => {
    if (!melody || exporting) return;

    if (downloadFormat === 'midi') {
      if (hasActiveLayers) {
        downloadLayeredMidi(melody, createActiveLayeredSeed(melody, chordLayer, bassLayer));
      } else {
        downloadMidi(melody);
      }
      return;
    }

    if (downloadFormat === 'project') {
      await onDownloadProject?.();
      return;
    }

    if (downloadFormat === 'wav') {
      setExporting(true);
      try {
        await downloadWav(melody, chordNotes, bassNotes);
      } finally {
        setExporting(false);
      }
    }
  };

  return (
    <div className="melody-transport" aria-label="Воспроизведение и экспорт мелодии">
      <div className="melody-transport-controls">
        <div className="segmented-control playback-control" role="group" aria-label="Воспроизведение">
          <button
            type="button"
            className={isPlaying ? '' : 'is-active'}
            disabled={disabled}
            onClick={onPlay}
            aria-label="Воспроизвести мелодию"
            title="Воспроизвести мелодию"
          >
            ▶ Play
          </button>
          <button
            type="button"
            className={isPlaying ? 'is-active' : ''}
            disabled={disabled}
            onClick={onStop}
            aria-label="Остановить воспроизведение"
            title="Остановить воспроизведение"
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
            aria-label={exporting ? 'Создаётся WAV' : `Скачать ${selectedOption.label}`}
            title={exporting ? 'Создаётся WAV…' : `Скачать ${selectedOption.label}`}
          >
            <span className="download-control-icon" aria-hidden="true">
              ⬇
            </span>
            <span>{exporting ? 'Rendering…' : selectedOption.label}</span>
          </button>
          <div className="download-control-picker">
            <InstrumentSelect
              value={downloadFormat}
              disabled={disabled}
              options={DOWNLOAD_OPTIONS.map((option) => ({
                ...option,
                label: option.disabled ? `${option.label} (soon)` : option.label
              }))}
              ariaLabel="Формат скачивания"
              mode="caret"
              onChange={(value) => setDownloadFormat(value as DownloadFormat)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
