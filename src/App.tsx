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
import {
  createBassLayerState,
  getBassNotesFromBassLayer,
  hasBassLayerNotes,
  rebuildBassLayerMode,
  regenerateBassLayer,
  type BassLayerState,
  type BassMode
} from './lib/seed/bassLayerState';
import {
  createChordLayerState,
  getChordLayerSignature,
  getChordNotesFromLayeredSeed,
  hasChordLayerNotes,
  rebuildChordLayerPerformance,
  regenerateChordLayer,
  type ChordLayerState
} from './lib/seed/chordLayerState';
import { createMelodyOnlyLayeredSeed } from './lib/seed/layeredSeed';
import type { ChordFeel, ChordLength, ChordPattern } from './lib/harmony/chordPerformance';
import type { GeneratedMelody, MelodyFingerprint, MelodyNote, MelodySettings } from './lib/types';
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
  const [isMelodyLocked, setIsMelodyLocked] = useState(false);
  const [chordLayer, setChordLayer] = useState<ChordLayerState | null>(null);
  const [bassLayer, setBassLayer] = useState<BassLayerState | null>(null);

  const hasChordLayerReady = chordLayer !== null && hasChordLayerNotes(chordLayer.layeredSeed);
  const hasBassLayerReady = bassLayer !== null && hasBassLayerNotes(bassLayer);

  const chordNotesForDisplay: MelodyNote[] | null = hasChordLayerReady
    ? getChordNotesFromLayeredSeed(chordLayer.layeredSeed)
    : null;

  const chordNotesForPlayback: MelodyNote[] | null =
    hasChordLayerReady && chordLayer.enabled ? chordNotesForDisplay : null;

  const bassNotesForDisplay: MelodyNote[] | null = hasBassLayerReady
    ? getBassNotesFromBassLayer(bassLayer)
    : null;

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
    setChordLayer(null);
    setBassLayer(null);
    setFingerprintHistory((history) => [...history, generated.fingerprint].slice(-100));
  };

  const handleIntentChange = (nextIntent: MelodyIntent) => {
    setIntent(nextIntent);
    setSettings((current) => applyIntentToSettings(current, nextIntent));
  };

  const handleGenerateMelody = () => {
    if (isMelodyLocked) return;

    const nextSettings = { ...settings, seed: makeRandomSeed('suno-idea') };
    setSettings(nextSettings);
    generateFromSettings(nextSettings, intent);
  };

  const handleLockMelody = () => {
    if (!melody) return;
    setIsMelodyLocked(true);
  };

  const handleUnlockMelody = () => {
    setIsMelodyLocked(false);
    setChordLayer(null);
    setBassLayer(null);
  };

  const handleAddChords = () => {
    if (!melody || !isMelodyLocked) return;
    setChordLayer(createChordLayerState(melody));
  };

  const applyChordLayerUpdate = (nextChordLayer: ChordLayerState) => {
    const previousSignature = chordLayer ? getChordLayerSignature(chordLayer.layeredSeed) : null;
    const nextSignature = getChordLayerSignature(nextChordLayer.layeredSeed);

    setChordLayer(nextChordLayer);

    if (previousSignature !== nextSignature) {
      setBassLayer(null);
    }
  };

  const handleChordPatternChange = (nextPattern: ChordPattern) => {
    if (!melody || !chordLayer) return;
    applyChordLayerUpdate(
      rebuildChordLayerPerformance(chordLayer, melody, {
        ...chordLayer.performance,
        pattern: nextPattern
      })
    );
  };

  const handleChordLengthChange = (nextLength: ChordLength) => {
    if (!melody || !chordLayer) return;
    applyChordLayerUpdate(
      rebuildChordLayerPerformance(chordLayer, melody, {
        ...chordLayer.performance,
        length: nextLength
      })
    );
  };

  const handleChordFeelChange = (nextFeel: ChordFeel) => {
    if (!melody || !chordLayer) return;
    applyChordLayerUpdate(
      rebuildChordLayerPerformance(chordLayer, melody, {
        ...chordLayer.performance,
        feel: nextFeel
      })
    );
  };

  const handleRegenerateChords = () => {
    if (!melody || !isMelodyLocked || !chordLayer) return;

    const nextChordLayer = regenerateChordLayer(chordLayer, melody);
    if (nextChordLayer) {
      setChordLayer(nextChordLayer);
      setBassLayer(null);
    }
  };

  const handleAddBass = () => {
    if (!melody || !isMelodyLocked || !chordLayer || bassLayer) return;
    const nextBassLayer = createBassLayerState(melody, chordLayer);
    if (nextBassLayer) {
      setBassLayer(nextBassLayer);
    }
  };

  const handleBassModeChange = (nextMode: BassMode) => {
    if (!melody || !chordLayer || !bassLayer) return;
    const nextBassLayer = rebuildBassLayerMode(bassLayer, melody, chordLayer, nextMode);
    if (nextBassLayer) {
      setBassLayer(nextBassLayer);
    }
  };

  const handleRegenerateBass = () => {
    if (!melody || !isMelodyLocked || !chordLayer || !bassLayer) return;
    const nextBassLayer = regenerateBassLayer(bassLayer, melody, chordLayer);
    if (nextBassLayer) {
      setBassLayer(nextBassLayer);
    }
  };

  const handleToggleBassLayerEnabled = () => {
    setBassLayer((current) => (current ? { ...current, enabled: !current.enabled } : current));
  };

  const handleToggleChordLayerEnabled = () => {
    setChordLayer((current) => (current ? { ...current, enabled: !current.enabled } : current));
  };

  const canRegenerateChords = melody !== null && isMelodyLocked && hasChordLayerReady;
  const canRegenerateBass = melody !== null && isMelodyLocked && hasBassLayerReady && hasChordLayerReady;

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
            isMelodyLocked={isMelodyLocked}
            onIntentChange={handleIntentChange}
            onSettingsChange={setSettings}
            onGenerate={handleGenerateMelody}
          />
        </div>

        <div className="right-column">
          <PianoRoll
            melody={melody}
            isMelodyLocked={isMelodyLocked}
            hasChordLayerReady={hasChordLayerReady}
            chordNotesForDisplay={chordNotesForDisplay}
            chordNotesForPlayback={chordNotesForPlayback}
            chordLayer={chordLayer}
            onLockMelody={handleLockMelody}
            onUnlockMelody={handleUnlockMelody}
            onAddChords={handleAddChords}
            onRegenerateChords={handleRegenerateChords}
            canRegenerateChords={canRegenerateChords}
            onChordPatternChange={handleChordPatternChange}
            onChordLengthChange={handleChordLengthChange}
            onChordFeelChange={handleChordFeelChange}
            onToggleChordLayerEnabled={handleToggleChordLayerEnabled}
            hasBassLayerReady={hasBassLayerReady}
            bassNotesForDisplay={bassNotesForDisplay}
            bassLayer={bassLayer}
            onAddBass={handleAddBass}
            onRegenerateBass={handleRegenerateBass}
            canRegenerateBass={canRegenerateBass}
            onBassModeChange={handleBassModeChange}
            onToggleBassLayerEnabled={handleToggleBassLayerEnabled}
          />
        </div>
      </div>
    </main>
  );
}
