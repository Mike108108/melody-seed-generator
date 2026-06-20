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
import type { GeneratedMelody, LayeredSeed, MelodyFingerprint, MelodyNote, MelodySettings } from './lib/types';
import { makeRandomSeed } from './lib/utils/seededRandom';
import './styles.css';

const MAX_CHORD_REGENERATE_ATTEMPTS = 32;

function chordNotesSignature(notes: MelodyNote[]): string {
  return notes
    .map((note) => `${note.startBeats}:${note.midi}:${note.durationBeats}:${note.velocity}`)
    .join('|');
}

function getChordNotesFromLayeredSeed(layeredSeed: LayeredSeed): MelodyNote[] {
  return layeredSeed.tracks.find((track) => track.role === 'chords')?.notes ?? [];
}

function areChordNotesIdentical(current: MelodyNote[], next: MelodyNote[]): boolean {
  if (current.length !== next.length) {
    return false;
  }

  for (let index = 0; index < current.length; index += 1) {
    const currentNote = current[index];
    const nextNote = next[index];

    if (
      currentNote.midi !== nextNote.midi ||
      currentNote.startBeats !== nextNote.startBeats ||
      currentNote.durationBeats !== nextNote.durationBeats
    ) {
      return false;
    }
  }

  return true;
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
  };

  const handleAddChords = () => {
    if (!melody || !isMelodyLocked) return;
    const initialLayeredSeed = createLayeredSeedWithChordTrack(melody, { variant: 0 });
    const initialSignature = chordNotesSignature(getChordNotesFromLayeredSeed(initialLayeredSeed));
    setChordLayerVariant(0);
    setSeenChordLayerSignatures(initialSignature ? [initialSignature] : []);
    setLayeredSeedWithChords(initialLayeredSeed);
    setIsChordLayerEnabled(true);
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
      const candidateSeed = createLayeredSeedWithChordTrack(melody, { variant: attemptVariant });
      const candidateNotes = getChordNotesFromLayeredSeed(candidateSeed);
      const candidateSignature = chordNotesSignature(candidateNotes);

      if (areChordNotesIdentical(currentChordNotes, candidateNotes)) {
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

    const chosenSignature = chordNotesSignature(getChordNotesFromLayeredSeed(chosenLayeredSeed));
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
            onToggleChordLayerEnabled={handleToggleChordLayerEnabled}
          />
        </div>
      </div>
    </main>
  );
}
