import { useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { IntentControls } from './components/IntentControls';
import { MelodyStats } from './components/MelodyStats';
import { PianoRoll } from './components/PianoRoll';
import { SeedBox } from './components/SeedBox';
import { Transport } from './components/Transport';
import { DEFAULT_SETTINGS, generateMelody } from './lib/melody/generateMelody';
import {
  DEFAULT_INTENT,
  applyIntentToSettings,
  createGenerationProfile,
  type MelodyIntent
} from './lib/melody/intent';
import type { GeneratedMelody, MelodyFingerprint, MelodySettings } from './lib/types';
import { makeRandomSeed } from './lib/utils/seededRandom';
import './styles.css';

export default function App() {
  const [intent, setIntent] = useState<MelodyIntent>(DEFAULT_INTENT);
  const [settings, setSettings] = useState<MelodySettings>(() =>
    applyIntentToSettings(
      {
        ...DEFAULT_SETTINGS,
        seed: makeRandomSeed('suno-idea')
      },
      DEFAULT_INTENT
    )
  );
  const [melody, setMelody] = useState<GeneratedMelody | null>(null);
  const [fingerprintHistory, setFingerprintHistory] = useState<MelodyFingerprint[]>([]);

  const provenanceSummary = useMemo(() => {
    if (!melody) return 'No melody generated yet.';
    const intentLabel = melody.generationProfile?.summary;
    const base = `${melody.settings.key} ${melody.settings.scale}, ${melody.settings.bpm} BPM, ${melody.settings.bars} bars`;
    return intentLabel ? `${intentLabel} · ${base}` : base;
  }, [melody]);

  const generateFromSettings = (nextSettings: MelodySettings, nextIntent: MelodyIntent) => {
    const profile = createGenerationProfile(nextIntent);
    const generated = generateMelody(nextSettings, fingerprintHistory.slice(-50));
    setMelody({
      ...generated,
      intent: nextIntent,
      generationProfile: profile
    });
    setFingerprintHistory((history) => [...history, generated.fingerprint].slice(-100));
  };

  const handleIntentChange = (nextIntent: MelodyIntent) => {
    setIntent(nextIntent);
    setSettings((current) => applyIntentToSettings(current, nextIntent));
  };

  const handleGenerateNew = () => {
    const nextSettings = applyIntentToSettings({ ...settings, seed: makeRandomSeed('suno-idea') }, intent);
    setSettings(nextSettings);
    generateFromSettings(nextSettings, intent);
  };

  const handleRegenerateCurrent = () => {
    const nextSettings = applyIntentToSettings(settings, intent);
    setSettings(nextSettings);
    generateFromSettings(nextSettings, intent);
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Hook-oriented MIDI melody seeds</p>
          <h1>Melody Seed Generator</h1>
          <p className="hero-copy">
            Generate short monophonic MIDI lead melodies for Suno and Udio workflows. Hit-informed, hook-oriented seeds
            designed for catchy structured melody ideas. No samples, no audio loops.
          </p>
        </div>
        <div className="hero-card">
          <span>Current melody</span>
          <strong>{provenanceSummary}</strong>
          <small>Designed to reduce similarity risk, not to guarantee legal clearance.</small>
        </div>
      </header>

      <div className="layout-grid">
        <div className="left-column">
          <SeedBox settings={settings} onChange={setSettings} onRegenerate={handleRegenerateCurrent} />
          <IntentControls intent={intent} onChange={handleIntentChange} onGenerate={handleGenerateNew} />
          <Controls settings={settings} onChange={setSettings} />
          <Transport melody={melody} />
        </div>

        <div className="right-column">
          <PianoRoll melody={melody} />
          <MelodyStats melody={melody} />
        </div>
      </div>
    </main>
  );
}
