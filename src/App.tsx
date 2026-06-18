import { useState } from 'react';
import { Controls } from './components/Controls';
import { IntentControls } from './components/IntentControls';
import { PianoRoll } from './components/PianoRoll';
import { SeedBox } from './components/SeedBox';
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

  const handleRegenerateCurrent = () => {
    generateFromSettings(settings, intent);
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <p className="eyebrow">Hook-oriented MIDI melody seeds</p>
        <h1>Melody Seed Generator</h1>
        <p className="hero-copy">
          Generate short monophonic MIDI lead melodies for Suno and Udio workflows. Hook-oriented seeds with no samples
          or audio loops.
        </p>
      </header>

      <div className="layout-grid">
        <div className="left-column">
          <SeedBox settings={settings} onChange={setSettings} onRegenerate={handleRegenerateCurrent} />
          <IntentControls intent={intent} onChange={handleIntentChange} />
          <Controls settings={settings} onChange={setSettings} onGenerate={handleRegenerateCurrent} />
        </div>

        <div className="right-column">
          <PianoRoll melody={melody} />
        </div>
      </div>
    </main>
  );
}
