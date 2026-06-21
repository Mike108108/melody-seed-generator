import { useState } from 'react';
import { CreateMelody } from './components/CreateMelody';
import { PianoRoll } from './components/PianoRoll';
import { ProjectControls } from './components/ProjectControls';
import { SiteHeader } from './components/SiteHeader';
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
  getBassNotesFromBassLayer,
  hasBassLayerNotes,
  rebuildBassLayerFromChords,
  rebuildBassLayerMode,
  regenerateBassLayer,
  type BassLayerState,
  type BassMode
} from './lib/seed/bassLayerState';
import {
  getChordNotesFromLayeredSeed,
  hasChordLayerNotes,
  rebuildChordLayerPerformance,
  regenerateChordLayer,
  type ChordLayerState
} from './lib/seed/chordLayerState';
import {
  createProjectFile,
  downloadProjectFile,
  parseProjectFileText,
  ProjectFileError
} from './lib/project/projectFile';
import { createDefaultLayersForMelody } from './lib/seed/activeLayeredSeed';
import { createMelodyOnlyLayeredSeed } from './lib/seed/layeredSeed';
import type { ChordFeel, ChordLength, ChordPattern } from './lib/harmony/chordPerformance';
import type { GeneratedMelody, MelodyFingerprint, MelodyNote, MelodySettings } from './lib/types';
import { makeRandomSeed } from './lib/utils/seededRandom';
import './styles.css';

type ProjectStatus = {
  type: 'success' | 'error';
  message: string;
} | null;

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
  const [chordLayer, setChordLayer] = useState<ChordLayerState | null>(null);
  const [bassLayer, setBassLayer] = useState<BassLayerState | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>(null);
  const [projectCreatedAt, setProjectCreatedAt] = useState<string | null>(null);

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

  const bassNotesForPlayback: MelodyNote[] | null =
    hasBassLayerReady && bassLayer.enabled ? bassNotesForDisplay : null;

  const handleGenerateSeed = () => {
    const nextSettings = { ...settings, seed: makeRandomSeed('suno-idea') };
    setSettings(nextSettings);

    const phraseRolePlan = createPhraseRolePlan(intent, nextSettings);
    const generated = generateMelody(nextSettings, fingerprintHistory.slice(-50), { phraseRolePlan });
    const finalSettings = generated.settings;
    const enrichedMelody: GeneratedMelody = {
      ...generated,
      intent,
      intentLabels: createIntentLabels(intent),
      generationProfile: createGenerationSettingsProfile(finalSettings),
      intentPresetProfile: createIntentPresetProfile(intent),
      phraseRolePlan: createPhraseRolePlan(intent, finalSettings)
    };
    const { chordLayer: nextChordLayer, bassLayer: nextBassLayer } =
      createDefaultLayersForMelody(enrichedMelody);

    setMelody({
      ...enrichedMelody,
      layeredSeed: createMelodyOnlyLayeredSeed(enrichedMelody)
    });
    setChordLayer(nextChordLayer);
    setBassLayer(nextBassLayer);
    setFingerprintHistory((history) => [...history, generated.fingerprint].slice(-100));
    setProjectCreatedAt(new Date().toISOString());
    setProjectStatus(null);
  };

  const handleIntentChange = (nextIntent: MelodyIntent) => {
    setIntent(nextIntent);
    setSettings((current) => applyIntentToSettings(current, nextIntent));
  };

  const syncBassLayerWithChords = (
    nextChordLayer: ChordLayerState,
    currentBassLayer: BassLayerState | null
  ): BassLayerState | null => {
    if (!melody || !currentBassLayer) {
      return currentBassLayer;
    }

    return rebuildBassLayerFromChords(currentBassLayer, melody, nextChordLayer);
  };

  const applyChordLayerUpdate = (nextChordLayer: ChordLayerState) => {
    setChordLayer(nextChordLayer);
    setBassLayer((currentBassLayer) => syncBassLayerWithChords(nextChordLayer, currentBassLayer));
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
    if (!melody || !chordLayer) return;

    const nextChordLayer = regenerateChordLayer(chordLayer, melody);
    if (nextChordLayer) {
      setChordLayer(nextChordLayer);
      setBassLayer((currentBassLayer) => syncBassLayerWithChords(nextChordLayer, currentBassLayer));
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
    if (!melody || !chordLayer || !bassLayer) return;
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

  const canRegenerateChords = melody !== null && hasChordLayerReady;
  const canRegenerateBass = melody !== null && hasBassLayerReady && hasChordLayerReady;

  const handleDownloadProject = () => {
    if (!melody) return;

    const now = new Date().toISOString();
    const project = createProjectFile({
      melody,
      chordLayer,
      bassLayer,
      createdAt: projectCreatedAt ?? now,
      updatedAt: now
    });

    downloadProjectFile(project);
    setProjectCreatedAt(project.createdAt);
    setProjectStatus({ type: 'success', message: 'Project file downloaded.' });
  };

  const handleOpenProjectFile = async (file: File) => {
    try {
      const text = await file.text();
      const project = parseProjectFileText(text);

      setIntent(project.melody.intent ?? DEFAULT_INTENT);
      setSettings(project.melody.settings);
      setMelody(project.melody);
      setChordLayer(project.chordLayer);
      setBassLayer(project.bassLayer);
      setProjectCreatedAt(project.createdAt);
      setProjectStatus({ type: 'success', message: 'Project opened.' });

      setFingerprintHistory((history) => {
        const nextFingerprint = project.melody.fingerprint;
        const alreadyExists = history.some((item) => item.hash === nextFingerprint.hash);
        return alreadyExists ? history : [...history, nextFingerprint].slice(-100);
      });
    } catch (error) {
      const message =
        error instanceof ProjectFileError
          ? error.message
          : 'Could not open this project file.';

      setProjectStatus({ type: 'error', message });
    }
  };

  return (
    <>
      <SiteHeader />

      <main className="app-shell">
        <div className="layout-grid" id="generator">
          <div className="left-column">
            <ProjectControls status={projectStatus} onOpenProjectFile={handleOpenProjectFile} />

            <CreateMelody
              intent={intent}
              settings={settings}
              hasSeed={melody !== null}
              onIntentChange={handleIntentChange}
              onSettingsChange={setSettings}
              onGenerate={handleGenerateSeed}
            />
          </div>

          <div className="right-column">
            <PianoRoll
              melody={melody}
              hasChordLayerReady={hasChordLayerReady}
              chordNotesForDisplay={chordNotesForDisplay}
              chordNotesForPlayback={chordNotesForPlayback}
              chordLayer={chordLayer}
              onRegenerateChords={handleRegenerateChords}
              canRegenerateChords={canRegenerateChords}
              onChordPatternChange={handleChordPatternChange}
              onChordLengthChange={handleChordLengthChange}
              onChordFeelChange={handleChordFeelChange}
              onToggleChordLayerEnabled={handleToggleChordLayerEnabled}
              hasBassLayerReady={hasBassLayerReady}
              bassNotesForDisplay={bassNotesForDisplay}
              bassNotesForPlayback={bassNotesForPlayback}
              bassLayer={bassLayer}
              onRegenerateBass={handleRegenerateBass}
              canRegenerateBass={canRegenerateBass}
              onBassModeChange={handleBassModeChange}
              onToggleBassLayerEnabled={handleToggleBassLayerEnabled}
              onDownloadProject={handleDownloadProject}
            />
          </div>
        </div>
      </main>
    </>
  );
}
