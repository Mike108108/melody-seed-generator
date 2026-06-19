import { useState } from 'react';
import { CreateMelody } from './components/CreateMelody';
import { PianoRoll } from './components/PianoRoll';
import { DEFAULT_SETTINGS, generateMelody } from './lib/melody/generateMelody';
import {
  DEFAULT_INTENT,
  applyIntentToSettings,
  createGenerationSettingsProfile,
  createIntentLabels,
  createIntentPresetProfile,
  type MelodyIntent
} from './lib/melody/intent';
import { createPhraseRolePlan } from './lib/melody/phraseRolePlan';
import { createMelodyOnlyLayeredSeed } from './lib/seed/layeredSeed';
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
    const phraseRolePlan = createPhraseRolePlan(nextIntent, nextSettings);
    const generated = generateMelody(nextSettings, fingerprintHistory.slice(-50), { phraseRolePlan });
    const finalSettings = generated.settings;
    const enrichedMelody: GeneratedMelody = {
      ...generated,
      intent: nextIntent,
      intentLabels: createIntentLabels(nextIntent),
      generationProfile: createGenerationSettingsProfile(finalSettings),
      intentPresetProfile: createIntentPresetProfile(nextIntent),
      phraseRolePlan: createPhraseRolePlan(nextIntent, finalSettings)
    };
    setMelody({
      ...enrichedMelody,
      layeredSeed: createMelodyOnlyLayeredSeed(enrichedMelody)
    });
    setFingerprintHistory((history) => [...history, generated.fingerprint].slice(-100));
  };

  const handleIntentChange = (nextIntent: MelodyIntent) => {
    setIntent(nextIntent);
    setSettings((current) => applyIntentToSettings(current, nextIntent));
  };

  const handleGenerateMelody = () => {
    const nextSettings = { ...settings, seed: makeRandomSeed('suno-idea') };
    setSettings(nextSettings);
    generateFromSettings(nextSettings, intent);
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
          <CreateMelody
            intent={intent}
            settings={settings}
            onIntentChange={handleIntentChange}
            onSettingsChange={setSettings}
            onGenerate={handleGenerateMelody}
          />
        </div>

        <div className="right-column">
          <PianoRoll melody={melody} />
        </div>
      </div>
    </main>
  );
}
