import type { GeneratedMelody, ScaleName } from '../types';
import { noteToPitchClass, pitchClassName } from '../music/notes';
import { SCALE_INTERVALS } from '../music/scales';
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

function buildScaleTriads(key: string, scale: ScaleName): TriadTemplate[] {
  const tonicPitchClass = noteToPitchClass(key);
  const scaleIntervals = SCALE_INTERVALS[scale];
  const scalePitchClasses = new Set(
    scaleIntervals.map((interval) => normalizePitchClass(tonicPitchClass + interval))
  );
  const qualities: ChordQuality[] = ['major', 'minor', 'diminished'];
  const triads: TriadTemplate[] = [];

  scaleIntervals.forEach((interval, index) => {
    const rootPitchClass = normalizePitchClass(tonicPitchClass + interval);
    const quality = qualities.find((candidateQuality) =>
      buildTriadTones(rootPitchClass, candidateQuality).every((tone) =>
        scalePitchClasses.has(tone.pitchClass)
      )
    );

    if (quality) {
      triads.push({
        degree: index + 1,
        rootPitchClass,
        quality,
        symbol: formatChordSymbol(rootPitchClass, quality),
        tones: buildTriadTones(rootPitchClass, quality)
      });
    }
  });

  return triads;
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
  const triadTemplates = buildScaleTriads(melody.settings.key, melody.settings.scale);

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
