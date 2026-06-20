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
import { createLayeredSeedWithChordTrack } from './lib/seed/layeredChordSeed';
import { createMelodyOnlyLayeredSeed } from './lib/seed/layeredSeed';
import {
  chordHarmonicSignature,
  DEFAULT_CHORD_FEEL,
  DEFAULT_CHORD_LENGTH,
  DEFAULT_CHORD_PATTERN,
  type ChordFeel,
  type ChordLength,
  type ChordPattern
} from './lib/harmony/chordPerformance';
import type { ChordTrackOptions } from './lib/harmony/chordLayer';
import type { GeneratedMelody, LayeredSeed, MelodyFingerprint, MelodyNote, MelodySettings } from './lib/types';
import { makeRandomSeed } from './lib/utils/seededRandom';
import './styles.css';

const MAX_CHORD_REGENERATE_ATTEMPTS = 64;

function getChordNotesFromLayeredSeed(layeredSeed: LayeredSeed): MelodyNote[] {
  return layeredSeed.tracks.find((track) => track.role === 'chords')?.notes ?? [];
}

function buildChordLayeredSeed(
  melody: GeneratedMelody,
  variant: number,
  pattern: ChordPattern,
  length: ChordLength,
  feel: ChordFeel
): LayeredSeed {
  const options: ChordTrackOptions = {
    variant,
    performance: { pattern, length, feel }
  };
  return createLayeredSeedWithChordTrack(melody, options);
}

function areChordHarmoniesIdentical(current: MelodyNote[], next: MelodyNote[]): boolean {
  return chordHarmonicSignature(current) === chordHarmonicSignature(next);
}

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
  const [layeredSeedWithChords, setLayeredSeedWithChords] = useState<LayeredSeed | null>(null);
  const [isChordLayerEnabled, setIsChordLayerEnabled] = useState(false);
  const [chordLayerVariant, setChordLayerVariant] = useState(0);
  const [seenChordLayerSignatures, setSeenChordLayerSignatures] = useState<string[]>([]);
  const [chordPattern, setChordPattern] = useState<ChordPattern>(DEFAULT_CHORD_PATTERN);
  const [chordLength, setChordLength] = useState<ChordLength>(DEFAULT_CHORD_LENGTH);
  const [chordFeel, setChordFeel] = useState<ChordFeel>(DEFAULT_CHORD_FEEL);

  const hasChordLayerReady =
    layeredSeedWithChords?.tracks.some((track) => track.role === 'chords' && track.notes.length > 0) ??
    false;

  const chordNotesForDisplay: MelodyNote[] | null = hasChordLayerReady
    ? (layeredSeedWithChords?.tracks.find((track) => track.role === 'chords')?.notes ?? null)
    : null;

  const chordNotesForPlayback: MelodyNote[] | null =
    hasChordLayerReady && isChordLayerEnabled ? chordNotesForDisplay : null;

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
    setLayeredSeedWithChords(null);
    setIsChordLayerEnabled(false);
    setChordLayerVariant(0);
    setSeenChordLayerSignatures([]);
    setChordPattern(DEFAULT_CHORD_PATTERN);
    setChordLength(DEFAULT_CHORD_LENGTH);
    setChordFeel(DEFAULT_CHORD_FEEL);
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
    setLayeredSeedWithChords(null);
    setIsChordLayerEnabled(false);
    setChordLayerVariant(0);
    setSeenChordLayerSignatures([]);
    setChordPattern(DEFAULT_CHORD_PATTERN);
    setChordLength(DEFAULT_CHORD_LENGTH);
    setChordFeel(DEFAULT_CHORD_FEEL);
  };

  const handleAddChords = () => {
    if (!melody || !isMelodyLocked) return;
    const initialLayeredSeed = buildChordLayeredSeed(melody, 0, chordPattern, chordLength, chordFeel);
    const initialSignature = chordHarmonicSignature(getChordNotesFromLayeredSeed(initialLayeredSeed));
    setChordLayerVariant(0);
    setSeenChordLayerSignatures(initialSignature ? [initialSignature] : []);
    setLayeredSeedWithChords(initialLayeredSeed);
    setIsChordLayerEnabled(true);
  };

  const rebuildChordPerformance = (
    nextPattern: ChordPattern,
    nextLength: ChordLength,
    nextFeel: ChordFeel
  ) => {
    if (!melody || !hasChordLayerReady) return;
    setChordPattern(nextPattern);
    setChordLength(nextLength);
    setChordFeel(nextFeel);
    setLayeredSeedWithChords(
      buildChordLayeredSeed(melody, chordLayerVariant, nextPattern, nextLength, nextFeel)
    );
  };

  const handleChordPatternChange = (nextPattern: ChordPattern) => {
    rebuildChordPerformance(nextPattern, chordLength, chordFeel);
  };

  const handleChordLengthChange = (nextLength: ChordLength) => {
    rebuildChordPerformance(chordPattern, nextLength, chordFeel);
  };

  const handleChordFeelChange = (nextFeel: ChordFeel) => {
    rebuildChordPerformance(chordPattern, chordLength, nextFeel);
  };

  const handleRegenerateChords = () => {
    if (!melody || !isMelodyLocked || !hasChordLayerReady || !layeredSeedWithChords) return;

    const currentChordNotes = getChordNotesFromLayeredSeed(layeredSeedWithChords);
    const seenSignatures = new Set(seenChordLayerSignatures);
    let attemptVariant = chordLayerVariant + 1;
    let chosenLayeredSeed: LayeredSeed | null = null;
    let chosenVariant = chordLayerVariant;
    let firstDifferentSeed: LayeredSeed | null = null;
    let firstDifferentVariant = attemptVariant;

    for (let attempt = 0; attempt < MAX_CHORD_REGENERATE_ATTEMPTS; attempt += 1) {
      const candidateSeed = buildChordLayeredSeed(
        melody,
        attemptVariant,
        chordPattern,
        chordLength,
        chordFeel
      );
      const candidateNotes = getChordNotesFromLayeredSeed(candidateSeed);
      const candidateSignature = chordHarmonicSignature(candidateNotes);

      if (areChordHarmoniesIdentical(currentChordNotes, candidateNotes)) {
        attemptVariant += 1;
        continue;
      }

      if (!firstDifferentSeed) {
        firstDifferentSeed = candidateSeed;
        firstDifferentVariant = attemptVariant;
      }

      if (!seenSignatures.has(candidateSignature)) {
        chosenLayeredSeed = candidateSeed;
        chosenVariant = attemptVariant;
        break;
      }

      attemptVariant += 1;
    }

    if (!chosenLayeredSeed && firstDifferentSeed) {
      chosenLayeredSeed = firstDifferentSeed;
      chosenVariant = firstDifferentVariant;
    }

    if (!chosenLayeredSeed) {
      return;
    }

    const chosenSignature = chordHarmonicSignature(getChordNotesFromLayeredSeed(chosenLayeredSeed));
    setSeenChordLayerSignatures((previous) =>
      previous.includes(chosenSignature) ? previous : [...previous, chosenSignature]
    );
    setChordLayerVariant(chosenVariant);
    setLayeredSeedWithChords(chosenLayeredSeed);
    setIsChordLayerEnabled(true);
  };

  const handleToggleChordLayerEnabled = () => {
    setIsChordLayerEnabled((enabled) => !enabled);
  };

  const canRegenerateChords = melody !== null && isMelodyLocked && hasChordLayerReady;

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
            isChordLayerEnabled={isChordLayerEnabled}
            layeredSeedWithChords={layeredSeedWithChords}
            onLockMelody={handleLockMelody}
            onUnlockMelody={handleUnlockMelody}
            onAddChords={handleAddChords}
            onRegenerateChords={handleRegenerateChords}
            canRegenerateChords={canRegenerateChords}
            chordLayerVariant={chordLayerVariant}
            chordPattern={chordPattern}
            chordLength={chordLength}
            chordFeel={chordFeel}
            onChordPatternChange={handleChordPatternChange}
            onChordLengthChange={handleChordLengthChange}
            onChordFeelChange={handleChordFeelChange}
            onToggleChordLayerEnabled={handleToggleChordLayerEnabled}
          />
        </div>
      </div>
    </main>
  );
}
