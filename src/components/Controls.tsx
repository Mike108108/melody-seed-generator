import type { MelodySettings, ScaleName } from '../lib/types';
import { KEYS } from '../lib/music/notes';
import { SCALE_OPTIONS } from '../lib/music/scales';

type ControlsProps = {
  settings: MelodySettings;
  onChange: (nextSettings: MelodySettings) => void;
};

export function Controls({ settings, onChange }: ControlsProps) {
  const patch = <K extends keyof MelodySettings>(key: K, value: MelodySettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <section className="panel controls-panel" aria-label="Advanced melody controls">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Advanced controls</p>
          <h2>Technical Settings</h2>
        </div>
      </div>

      <div className="control-grid">
        <label>
          BPM
          <input
            type="number"
            min={60}
            max={190}
            value={settings.bpm}
            onChange={(event) => patch('bpm', Number(event.target.value))}
          />
        </label>

        <label>
          Key
          <select value={settings.key} onChange={(event) => patch('key', event.target.value)}>
            {KEYS.map((key) => (
              <option key={key} value={key}>
                {key}
              </option>
            ))}
          </select>
        </label>

        <label>
          Scale / Mode
          <select value={settings.scale} onChange={(event) => patch('scale', event.target.value as ScaleName)}>
            {SCALE_OPTIONS.map((scale) => (
              <option key={scale} value={scale}>
                {scale}
              </option>
            ))}
          </select>
        </label>

        <label>
          Bars
          <input
            type="number"
            min={2}
            max={16}
            step={1}
            value={settings.bars}
            onChange={(event) => patch('bars', Number(event.target.value))}
          />
        </label>

        <label>
          Octave
          <input
            type="number"
            min={2}
            max={6}
            step={1}
            value={settings.octave}
            onChange={(event) => patch('octave', Number(event.target.value))}
          />
        </label>

        <label>
          Range, semitones
          <input
            type="number"
            min={7}
            max={36}
            step={1}
            value={settings.range}
            onChange={(event) => patch('range', Number(event.target.value))}
          />
        </label>

        <Slider
          label="Note density"
          value={settings.density}
          onChange={(value) => patch('density', value)}
        />
        <Slider
          label="Rest chance"
          value={settings.restChance}
          onChange={(value) => patch('restChance', value)}
        />
        <Slider
          label="Variation amount"
          value={settings.variation}
          onChange={(value) => patch('variation', value)}
        />
        <Slider
          label="Randomness"
          value={settings.randomness}
          onChange={(value) => patch('randomness', value)}
        />
      </div>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={settings.commercialSaferMode}
          onChange={(event) => patch('commercialSaferMode', event.target.checked)}
        />
        <span>
          <strong>Commercial Safer Mode</strong>
          <small>Stricter motif length, cliche checks, local similarity scoring, provenance metadata.</small>
        </span>
      </label>
    </section>
  );
}

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="slider-label">
        {label}
        <strong>{value.toFixed(2)}</strong>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}
