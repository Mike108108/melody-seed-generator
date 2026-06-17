import { useMemo, useState } from 'react';
import { Controls } from './components/Controls';
import { MelodyStats } from './components/MelodyStats';
import { PianoRoll } from './components/PianoRoll';
import { SeedBox } from './components/SeedBox';
import { Transport } from './components/Transport';
import type { GeneratedMelody, MelodyFingerprint, MelodySettings } from './lib/types';
import { DEFAULT_SETTINGS, generateMelody } from './lib/melody/generateMelody';
import { makeRandomSeed } from './lib/utils/seededRandom';
import './styles.css';

export default function App() {
  const [settings, setSettings] = useState<MelodySettings>({
    ...DEFAULT_SETTINGS,
    seed: makeRandomSeed('suno-idea')
  });
  const [melody, setMelody] = useState<GeneratedMelody | null>(null);
  const [fingerprintHistory, setFingerprintHistory] = useState<MelodyFingerprint[]>([]);

  const provenanceSummary = useMemo(() => {
    if (!melody) return 'No melody generated yet.';
    return `${melody.settings.key} ${melody.settings.scale}, ${melody.settings.bpm} BPM, ${melody.settings.bars} bars`;
  }, [melody]);

  const generateFromSettings = (nextSettings: MelodySettings) => {
    const generated = generateMelody(nextSettings, fingerprintHistory.slice(-50));
    setMelody(generated);
    setFingerprintHistory((history) => [...history, generated.fingerprint].slice(-100));
  };

  const handleGenerateNew = () => {
    const nextSettings = { ...settings, seed: makeRandomSeed('suno-idea') };
    setSettings(nextSettings);
    generateFromSettings(nextSettings);
  };

  const handleRegenerateCurrent = () => {
    generateFromSettings(settings);
  };

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Procedural MIDI melody seeds</p>
          <h1>Melody Seed Generator</h1>
          <p className="hero-copy">
            Generate short monophonic MIDI lead melodies for Suno cover/upload workflows. No samples, no audio loops, no copyrighted training data.
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
          <Controls settings={settings} onChange={setSettings} onGenerate={handleGenerateNew} />
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
