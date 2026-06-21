import { useState } from 'react';
import type { MelodyIntent } from '../lib/melody/intent';
import {
  COMPLEXITY_OPTIONS,
  DRAMA_OPTIONS,
  GENRE_OPTIONS,
  HOOKINESS_OPTIONS,
  ROLE_OPTIONS
} from '../lib/melody/intent';
import { KEYS } from '../lib/music/notes';
import { SCALE_OPTIONS } from '../lib/music/scales';
import type { MelodySettings, ScaleName } from '../lib/types';

type CreateMelodyProps = {
  intent: MelodyIntent;
  settings: MelodySettings;
  hasSeed: boolean;
  onIntentChange: (nextIntent: MelodyIntent) => void;
  onSettingsChange: (nextSettings: MelodySettings) => void;
  onGenerate: () => void;
};

export function CreateMelody({
  intent,
  settings,
  hasSeed,
  onIntentChange,
  onSettingsChange,
  onGenerate
}: CreateMelodyProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const patchIntent = <K extends keyof MelodyIntent>(key: K, value: MelodyIntent[K]) => {
    onIntentChange({ ...intent, [key]: value });
  };

  const patchSettings = <K extends keyof MelodySettings>(key: K, value: MelodySettings[K]) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  return (
    <section className="panel create-melody-panel" aria-label="Generate seed">
      <div className="panel-header slim">
        <h2>Seed Settings</h2>
      </div>

      <fieldset className="create-melody-fields">
        <div className="create-melody-section">
        <h3 className="section-title">Hook Intent</h3>
        <div className="control-grid compact">
          <label>
            Melodic Language
            <select
              value={intent.genre}
              onChange={(event) => patchIntent('genre', event.target.value as MelodyIntent['genre'])}
            >
              {GENRE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Song Part
            <select
              value={intent.role}
              onChange={(event) => patchIntent('role', event.target.value as MelodyIntent['role'])}
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Phrase Shape
            <select
              value={intent.drama}
              onChange={(event) => patchIntent('drama', event.target.value as MelodyIntent['drama'])}
            >
              {DRAMA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Detail
            <select
              value={intent.complexity}
              onChange={(event) => patchIntent('complexity', event.target.value as MelodyIntent['complexity'])}
            >
              {COMPLEXITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="control-grid-span">
            Hook Strength
            <select
              value={intent.hookiness}
              onChange={(event) => patchIntent('hookiness', event.target.value as MelodyIntent['hookiness'])}
            >
              {HOOKINESS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="create-melody-section">
        <h3 className="section-title">Melody Settings</h3>
        <div className="control-grid compact">
          <label>
            Key / Tonic
            <select value={settings.key} onChange={(event) => patchSettings('key', event.target.value)}>
              {KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
          </label>

          <label>
            Scale Mode
            <select
              value={settings.scale}
              onChange={(event) => patchSettings('scale', event.target.value as ScaleName)}
            >
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
              onChange={(event) => patchSettings('bars', Number(event.target.value))}
            />
          </label>

          <label>
            Tempo
            <input
              type="number"
              min={60}
              max={190}
              value={settings.bpm}
              onChange={(event) => patchSettings('bpm', Number(event.target.value))}
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
              onChange={(event) => patchSettings('octave', Number(event.target.value))}
            />
          </label>

          <label>
            Pitch Range
            <input
              type="number"
              min={7}
              max={36}
              step={1}
              value={settings.range}
              onChange={(event) => patchSettings('range', Number(event.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="advanced-tuning">
        <button
          type="button"
          className="advanced-tuning-toggle"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((open) => !open)}
        >
          <span>Advanced tuning</span>
          <span className="advanced-tuning-caret" aria-hidden="true">
            {advancedOpen ? '▴' : '▾'}
          </span>
        </button>

        {advancedOpen ? (
          <div className="control-grid compact advanced-tuning-body">
            <Slider label="Note density" value={settings.density} onChange={(value) => patchSettings('density', value)} />
            <Slider
              label="Rest chance"
              value={settings.restChance}
              onChange={(value) => patchSettings('restChance', value)}
            />
            <Slider
              label="Variation amount"
              value={settings.variation}
              onChange={(value) => patchSettings('variation', value)}
            />
            <Slider
              label="Randomness"
              value={settings.randomness}
              onChange={(value) => patchSettings('randomness', value)}
            />
          </div>
        ) : null}
      </div>
      </fieldset>

      <button className="primary generate-button" onClick={onGenerate} type="button">
        {hasSeed ? 'Generate New Seed' : 'Generate Seed'}
      </button>
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
