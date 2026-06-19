import type { GeneratedMelody, ScaleName } from '../types';
import { noteToPitchClass, pitchClassName } from '../music/notes';
import { analyzeMelodyForHarmony, type BarAnalysis } from './melodyAnalysis';

export type ChordQuality = 'major' | 'minor' | 'diminished';

export type ChordToneRole = 'root' | 'third' | 'fifth';

export type ChordTone = {
  pitchClass: number;
  role: ChordToneRole;
};

export type ChordCandidate = {
  barIndex: number;
  rootPitchClass: number;
  quality: ChordQuality;
  degree: number;
  symbol: string;
  tones: ChordTone[];
  matchedStrongPitchClasses: number[];
  matchedPitchClasses: number[];
  score: number;
  supportScore: number;
  tensionPenalty: number;
};

export type BarChordCandidates = {
  barIndex: number;
  candidates: ChordCandidate[];
};

export type ChordCandidateAnalysis = {
  bars: BarChordCandidates[];
};

type TriadTemplate = {
  degree: number;
  rootPitchClass: number;
  quality: ChordQuality;
  symbol: string;
  tones: ChordTone[];
};

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const NATURAL_MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

const MAJOR_TRIAD_QUALITIES: ChordQuality[] = [
  'major',
  'minor',
  'minor',
  'major',
  'major',
  'minor',
  'diminished'
];

const NATURAL_MINOR_TRIAD_QUALITIES: ChordQuality[] = [
  'minor',
  'diminished',
  'major',
  'minor',
  'minor',
  'major',
  'major'
];

const TRIAD_INTERVALS: Record<ChordQuality, [number, number]> = {
  major: [4, 7],
  minor: [3, 7],
  diminished: [3, 6]
};

const STRONG_BEAT_MATCH_WEIGHT = 5;
const WEIGHTED_PITCH_CLASS_MATCH = 1;
const NON_CHORD_TENSION_FACTOR = 0.35;

function normalizePitchClass(pitchClass: number): number {
  return ((pitchClass % 12) + 12) % 12;
}

function isNaturalMinorFamily(scale: ScaleName): boolean {
  return (
    scale === 'minor' ||
    scale === 'dorian' ||
    scale === 'phrygian' ||
    scale === 'minor-pentatonic'
  );
}

function buildTriadTones(rootPitchClass: number, quality: ChordQuality): ChordTone[] {
  const root = normalizePitchClass(rootPitchClass);
  const [thirdInterval, fifthInterval] = TRIAD_INTERVALS[quality];

  return [
    { pitchClass: root, role: 'root' },
    { pitchClass: normalizePitchClass(root + thirdInterval), role: 'third' },
    { pitchClass: normalizePitchClass(root + fifthInterval), role: 'fifth' }
  ];
}

function formatChordSymbol(rootPitchClass: number, quality: ChordQuality): string {
  const rootName = pitchClassName(rootPitchClass);

  if (quality === 'minor') return `${rootName}m`;
  if (quality === 'diminished') return `${rootName}dim`;
  return rootName;
}

function buildDiatonicTriads(key: string, scale: ScaleName): TriadTemplate[] {
  const tonicPitchClass = noteToPitchClass(key);
  const scaleIntervals = isNaturalMinorFamily(scale)
    ? NATURAL_MINOR_SCALE_INTERVALS
    : MAJOR_SCALE_INTERVALS;
  const qualities = isNaturalMinorFamily(scale)
    ? NATURAL_MINOR_TRIAD_QUALITIES
    : MAJOR_TRIAD_QUALITIES;

  return scaleIntervals.map((interval, index) => {
    const rootPitchClass = normalizePitchClass(tonicPitchClass + interval);
    const quality = qualities[index];
    const tones = buildTriadTones(rootPitchClass, quality);

    return {
      degree: index + 1,
      rootPitchClass,
      quality,
      symbol: formatChordSymbol(rootPitchClass, quality),
      tones
    };
  });
}

function roundScore(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function uniqueSorted(values: number[]): number[] {
  return [...new Set(values)].sort((a, b) => a - b);
}

function scoreCandidate(bar: BarAnalysis, template: TriadTemplate): ChordCandidate {
  const chordTonePitchClasses = new Set(template.tones.map((tone) => tone.pitchClass));

  let supportScore = 0;
  const matchedStrongPitchClasses: number[] = [];
  const matchedPitchClasses: number[] = [];

  for (const strongNote of bar.strongNotes) {
    if (chordTonePitchClasses.has(strongNote.pitchClass)) {
      supportScore += strongNote.beatStrength * STRONG_BEAT_MATCH_WEIGHT;
      matchedStrongPitchClasses.push(strongNote.pitchClass);
    }
  }

  for (const entry of bar.pitchClassWeights) {
    if (chordTonePitchClasses.has(entry.pitchClass)) {
      supportScore += entry.weight * WEIGHTED_PITCH_CLASS_MATCH;
      matchedPitchClasses.push(entry.pitchClass);
    }
  }

  let tensionPenalty = 0;

  for (const entry of bar.pitchClassWeights) {
    if (!chordTonePitchClasses.has(entry.pitchClass)) {
      tensionPenalty += entry.weight * NON_CHORD_TENSION_FACTOR;
    }
  }

  const roundedSupport = roundScore(supportScore);
  const roundedPenalty = roundScore(tensionPenalty);

  return {
    barIndex: bar.barIndex,
    rootPitchClass: template.rootPitchClass,
    quality: template.quality,
    degree: template.degree,
    symbol: template.symbol,
    tones: template.tones,
    matchedStrongPitchClasses: uniqueSorted(matchedStrongPitchClasses),
    matchedPitchClasses: uniqueSorted(matchedPitchClasses),
    supportScore: roundedSupport,
    tensionPenalty: roundedPenalty,
    score: roundScore(roundedSupport - roundedPenalty)
  };
}

export function createChordCandidatesForMelody(melody: GeneratedMelody): ChordCandidateAnalysis {
  if (melody.notes.length === 0) {
    return { bars: [] };
  }

  const analysis = analyzeMelodyForHarmony(melody);
  const triadTemplates = buildDiatonicTriads(melody.settings.key, melody.settings.scale);

  const bars = analysis.bars.map((bar) => {
    const candidates = triadTemplates
      .map((template) => scoreCandidate(bar, template))
      .sort((a, b) => b.score - a.score || a.degree - b.degree);

    return {
      barIndex: bar.barIndex,
      candidates
    };
  });

  return { bars };
}
