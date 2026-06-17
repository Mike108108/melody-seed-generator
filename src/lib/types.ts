export type ScaleName =
  | 'major'
  | 'minor'
  | 'dorian'
  | 'phrygian'
  | 'lydian'
  | 'mixolydian'
  | 'minor-pentatonic'
  | 'major-pentatonic';

export type MelodyNote = {
  midi: number;
  noteName: string;
  startBeats: number;
  durationBeats: number;
  velocity: number;
  degree: number;
};

export type MelodySettings = {
  seed: string;
  bpm: number;
  key: string;
  scale: ScaleName;
  bars: number;
  octave: number;
  range: number;
  density: number;
  restChance: number;
  variation: number;
  randomness: number;
  commercialSaferMode: boolean;
};

export type MelodyFingerprint = {
  absolutePitches: number[];
  pitchClasses: number[];
  intervals: number[];
  rhythm: string[];
  contour: string[];
  pitchNgrams: string[];
  intervalNgrams: string[];
  hash: string;
};

export type MelodyScore = {
  qualityScore: number;
  similarityRiskScore: number;
  warnings: string[];
};

export type GeneratedMelody = {
  notes: MelodyNote[];
  settings: MelodySettings;
  fingerprint: MelodyFingerprint;
  qualityScore: number;
  similarityRiskScore: number;
  warnings: string[];
};

export type ProvenanceJson = {
  createdBy: string;
  generatorVersion: string;
  createdAt: string;
  seed: string;
  key: string;
  scale: ScaleName;
  bpm: number;
  bars: number;
  mode: 'commercial-safer' | 'standard';
  usesSamples: false;
  usesAudioLoops: false;
  usesTrainingData: false;
  copyrightGuarantee: false;
  riskDisclosure: string;
  melodyHash: string;
  absolutePitchFingerprint: number[];
  pitchClassFingerprint: number[];
  intervalFingerprint: number[];
  rhythmFingerprint: string[];
  contourFingerprint: string[];
  qualityScore: number;
  similarityRiskScore: number;
};
