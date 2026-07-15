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
import { InstrumentSelect } from './InstrumentSelect';

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
      <div className="panel-header control-deck-header">
        <div>
          <p className="eyebrow">Control deck</p>
          <h2>Shape the seed</h2>
        </div>
        <div className="control-deck-orbit" aria-hidden="true">
          <span>SEED</span>
        </div>
      </div>

      <fieldset className="create-melody-fields">
        <div className="create-melody-section">
        <h3 className="section-title"><span>01</span> Hook Intent</h3>
        <div className="control-grid compact">
          <label>
            Melodic Language
            <InstrumentSelect
              value={intent.genre}
              options={GENRE_OPTIONS}
              ariaLabel="Melodic Language"
              onChange={(value) => patchIntent('genre', value as MelodyIntent['genre'])}
            />
          </label>

          <label>
            Song Part
            <InstrumentSelect
              value={intent.role}
              options={ROLE_OPTIONS}
              ariaLabel="Song Part"
              onChange={(value) => patchIntent('role', value as MelodyIntent['role'])}
            />
          </label>

          <label>
            Phrase Shape
            <InstrumentSelect
              value={intent.drama}
              options={DRAMA_OPTIONS}
              ariaLabel="Phrase Shape"
              onChange={(value) => patchIntent('drama', value as MelodyIntent['drama'])}
            />
          </label>

          <label>
            Detail
            <InstrumentSelect
              value={intent.complexity}
              options={COMPLEXITY_OPTIONS}
              ariaLabel="Detail"
              onChange={(value) => patchIntent('complexity', value as MelodyIntent['complexity'])}
            />
          </label>

          <label className="control-grid-span">
            Hook Strength
            <InstrumentSelect
              value={intent.hookiness}
              options={HOOKINESS_OPTIONS}
              ariaLabel="Hook Strength"
              onChange={(value) => patchIntent('hookiness', value as MelodyIntent['hookiness'])}
            />
          </label>
        </div>
      </div>

      <div className="create-melody-section">
        <h3 className="section-title"><span>02</span> Melody Settings</h3>
        <div className="control-grid compact">
          <label>
            Key / Tonic
            <InstrumentSelect
              value={settings.key}
              options={KEYS.map((key) => ({ value: key, label: key }))}
              ariaLabel="Key / Tonic"
              onChange={(value) => patchSettings('key', value)}
            />
          </label>

          <label>
            Scale Mode
            <InstrumentSelect
              value={settings.scale}
              options={SCALE_OPTIONS.map((scale) => ({ value: scale, label: scale }))}
              ariaLabel="Scale Mode"
              onChange={(value) => patchSettings('scale', value as ScaleName)}
            />
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
        <span className="generate-button__light" aria-hidden="true" />
        {hasSeed ? 'Generate New Seed' : 'Generate Seed'}
        <span className="generate-button__arrow" aria-hidden="true">↗</span>
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
