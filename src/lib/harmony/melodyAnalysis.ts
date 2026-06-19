import type { GeneratedMelody, MelodyNote } from '../types';
import { BEATS_PER_BAR, getPhraseBeats } from '../melody/phraseAnalysis';
import { getDirectiveForPhrase } from '../melody/phraseRolePlan';

export type StrongBeatNote = {
  pitch: number;
  pitchClass: number;
  start: number;
  duration: number;
  barIndex: number;
  beatInBar: number;
  beatStrength: number;
};

export type PitchClassWeight = {
  pitchClass: number;
  weight: number;
};

export type BarAnalysis = {
  barIndex: number;
  startBeat: number;
  endBeat: number;
  notes: MelodyNote[];
  strongNotes: StrongBeatNote[];
  pitchClassWeights: PitchClassWeight[];
  endingPitch?: number;
  endingPitchClass?: number;
};

export type PhraseEndingAnalysis = {
  phraseIndex: number;
  barIndex: number;
  pitch?: number;
  pitchClass?: number;
  stable: boolean;
};

export type MelodyAnalysis = {
  beatsPerBar: 4;
  bars: BarAnalysis[];
  phraseEndings: PhraseEndingAnalysis[];
  globalPitchClassWeights: PitchClassWeight[];
};

function pitchClassOf(pitch: number): number {
  return ((pitch % 12) + 12) % 12;
}

function beatInBarFor(startBeats: number, barIndex: number): number {
  const positionInBar = startBeats - barIndex * BEATS_PER_BAR;
  return Math.floor(positionInBar) + 1;
}

function beatStrengthMultiplier(beatInBar: number): number {
  if (beatInBar === 1) return 2.0;
  if (beatInBar === 3) return 1.5;
  return 1.0;
}

function noteWeight(note: MelodyNote, barIndex: number): number {
  const beatInBar = beatInBarFor(note.startBeats, barIndex);
  return note.durationBeats * beatStrengthMultiplier(beatInBar);
}

function isStrongBeat(beatInBar: number): boolean {
  return beatInBar === 1 || beatInBar === 3;
}

function toStrongBeatNote(note: MelodyNote, barIndex: number): StrongBeatNote {
  const beatInBar = beatInBarFor(note.startBeats, barIndex);
  const beatStrength = beatStrengthMultiplier(beatInBar);

  return {
    pitch: note.midi,
    pitchClass: pitchClassOf(note.midi),
    start: note.startBeats,
    duration: note.durationBeats,
    barIndex,
    beatInBar,
    beatStrength
  };
}

function accumulatePitchClassWeights(notes: MelodyNote[], barIndex: number): PitchClassWeight[] {
  const totals = new Map<number, number>();

  for (const note of notes) {
    const pitchClass = pitchClassOf(note.midi);
    const weight = noteWeight(note, barIndex);
    totals.set(pitchClass, (totals.get(pitchClass) ?? 0) + weight);
  }

  return [...totals.entries()]
    .map(([pitchClass, weight]) => ({ pitchClass, weight }))
    .sort((a, b) => b.weight - a.weight || a.pitchClass - b.pitchClass);
}

function findBarEndingNote(notes: MelodyNote[]): MelodyNote | undefined {
  if (notes.length === 0) return undefined;

  return notes.reduce((latest, note) => {
    const latestEnd = latest.startBeats + latest.durationBeats;
    const noteEnd = note.startBeats + note.durationBeats;

    if (noteEnd > latestEnd) return note;
    if (noteEnd < latestEnd) return latest;

    return note.startBeats >= latest.startBeats ? note : latest;
  });
}

function analyzeBar(barIndex: number, notes: MelodyNote[]): BarAnalysis {
  const startBeat = barIndex * BEATS_PER_BAR;
  const endBeat = startBeat + BEATS_PER_BAR;
  const barNotes = notes
    .filter((note) => note.startBeats >= startBeat && note.startBeats < endBeat)
    .sort((a, b) => a.startBeats - b.startBeats || a.midi - b.midi);

  const strongNotes = barNotes
    .filter((note) => isStrongBeat(beatInBarFor(note.startBeats, barIndex)))
    .map((note) => toStrongBeatNote(note, barIndex));

  const endingNote = findBarEndingNote(barNotes);

  return {
    barIndex,
    startBeat,
    endBeat,
    notes: barNotes,
    strongNotes,
    pitchClassWeights: accumulatePitchClassWeights(barNotes, barIndex),
    endingPitch: endingNote?.midi,
    endingPitchClass: endingNote !== undefined ? pitchClassOf(endingNote.midi) : undefined
  };
}

function analyzePhraseEndings(melody: GeneratedMelody): PhraseEndingAnalysis[] {
  const plan = melody.phraseRolePlan;
  if (!plan) return [];

  const phraseBeats = getPhraseBeats(melody.settings.bars);
  const endings: PhraseEndingAnalysis[] = [];

  for (let phraseIndex = 0; phraseIndex < plan.phraseCount; phraseIndex += 1) {
    const phraseStart = phraseIndex * phraseBeats;
    const phraseEnd = phraseStart + phraseBeats;
    const phraseNotes = melody.notes
      .filter((note) => note.startBeats >= phraseStart && note.startBeats < phraseEnd)
      .sort((a, b) => a.startBeats - b.startBeats || a.midi - b.midi);

    const endingNote = findBarEndingNote(phraseNotes);
    const directive = getDirectiveForPhrase(plan, phraseIndex);
    const barIndex =
      endingNote !== undefined
        ? Math.floor(endingNote.startBeats / BEATS_PER_BAR)
        : Math.max(0, Math.floor((phraseEnd - 0.001) / BEATS_PER_BAR));

    endings.push({
      phraseIndex,
      barIndex,
      pitch: endingNote?.midi,
      pitchClass: endingNote !== undefined ? pitchClassOf(endingNote.midi) : undefined,
      stable: directive.stableEnding
    });
  }

  return endings;
}

function analyzeGlobalPitchClassWeights(notes: MelodyNote[]): PitchClassWeight[] {
  const totals = new Map<number, number>();

  for (const note of notes) {
    const barIndex = Math.floor(note.startBeats / BEATS_PER_BAR);
    const pitchClass = pitchClassOf(note.midi);
    const weight = noteWeight(note, barIndex);
    totals.set(pitchClass, (totals.get(pitchClass) ?? 0) + weight);
  }

  return [...totals.entries()]
    .map(([pitchClass, weight]) => ({ pitchClass, weight }))
    .sort((a, b) => b.weight - a.weight || a.pitchClass - b.pitchClass);
}

export function analyzeMelodyForHarmony(melody: GeneratedMelody): MelodyAnalysis {
  const notes = melody.notes;

  if (notes.length === 0) {
    return {
      beatsPerBar: 4,
      bars: [],
      phraseEndings: [],
      globalPitchClassWeights: []
    };
  }

  const barCount = Math.max(
    melody.settings.bars,
    Math.ceil(Math.max(...notes.map((note) => note.startBeats + note.durationBeats)) / BEATS_PER_BAR)
  );

  const bars = Array.from({ length: barCount }, (_, barIndex) => analyzeBar(barIndex, notes));

  return {
    beatsPerBar: 4,
    bars,
    phraseEndings: analyzePhraseEndings(melody),
    globalPitchClassWeights: analyzeGlobalPitchClassWeights(notes)
  };
}
