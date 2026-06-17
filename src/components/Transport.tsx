import type { GeneratedMelody } from '../lib/types';
import { downloadMidi, downloadProvenance } from '../lib/midi/exportMidi';
import { playMelody, stopPlayback } from '../lib/audio/playback';

type TransportProps = {
  melody: GeneratedMelody | null;
};

export function Transport({ melody }: TransportProps) {
  const disabled = melody === null;

  return (
    <section className="panel transport-panel" aria-label="Transport and export">
      <div>
        <p className="eyebrow">Preview / Export</p>
        <h2>Transport</h2>
      </div>
      <div className="transport-actions">
        <button type="button" disabled={disabled} onClick={() => melody && void playMelody(melody)}>
          Play
        </button>
        <button type="button" disabled={disabled} onClick={stopPlayback}>
          Stop
        </button>
        <button type="button" disabled={disabled} onClick={() => melody && downloadMidi(melody)}>
          Download MIDI
        </button>
        <button type="button" disabled={disabled} onClick={() => melody && downloadProvenance(melody)}>
          Download Provenance JSON
        </button>
      </div>
      <p className="hint">Render the MIDI locally with a simple piano, pluck, or sine lead before uploading to Suno.</p>
    </section>
  );
}
