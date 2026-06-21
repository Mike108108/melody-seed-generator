import type { BassLayerState } from '../seed/bassLayerState';
import type { ChordLayerState } from '../seed/chordLayerState';
import type { GeneratedMelody } from '../types';

export const PROJECT_FILE_SCHEMA = 'melody-seed-project';
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_GENERATOR_VERSION = '0.2.0';

export type MelodySeedProjectFileV1 = {
  schema: typeof PROJECT_FILE_SCHEMA;
  version: typeof PROJECT_FILE_VERSION;
  appVersion?: string;
  generatorVersion?: string;
  createdAt: string;
  updatedAt: string;
  melody: GeneratedMelody;
  chordLayer: ChordLayerState | null;
  bassLayer: BassLayerState | null;
};

export type MelodySeedProjectFile = MelodySeedProjectFileV1;

export class ProjectFileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectFileError';
  }
}

const CHORD_PATTERNS = new Set(['sustained', 'half-bar', 'quarter-pulse', 'syncopated']);
const CHORD_LENGTHS = new Set(['long', 'medium', 'short', 'staccato']);
const CHORD_FEELS = new Set(['straight', 'subtle', 'groovy', 'loose']);
const BASS_MODES = new Set(['root-pulse', 'groove', 'sparse']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProvenanceJson(value: Record<string, unknown>): boolean {
  if (value.schema === PROJECT_FILE_SCHEMA) {
    return false;
  }

  return (
    value.createdBy === 'Melody Seed Generator' ||
    typeof value.melodyHash === 'string' ||
    Array.isArray(value.absolutePitchFingerprint) ||
    Array.isArray(value.pitchClassFingerprint) ||
    Array.isArray(value.intervalFingerprint)
  );
}

function validateMelody(value: unknown): GeneratedMelody {
  if (!isRecord(value)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!Array.isArray(value.notes)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isRecord(value.settings)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isRecord(value.fingerprint)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.qualityScore !== 'number' || Number.isNaN(value.qualityScore)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.similarityRiskScore !== 'number' || Number.isNaN(value.similarityRiskScore)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!Array.isArray(value.warnings)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  return value as GeneratedMelody;
}

function validateChordLayer(value: unknown): ChordLayerState {
  if (!isRecord(value)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.enabled !== 'boolean') {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.variant !== 'number' || Number.isNaN(value.variant)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!Array.isArray(value.seenHarmonicSignatures)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isRecord(value.performance)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  const { pattern, length, feel } = value.performance;

  if (typeof pattern !== 'string' || !CHORD_PATTERNS.has(pattern)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof length !== 'string' || !CHORD_LENGTHS.has(length)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof feel !== 'string' || !CHORD_FEELS.has(feel)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isRecord(value.layeredSeed) || !Array.isArray(value.layeredSeed.tracks)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  const hasChordTrack = value.layeredSeed.tracks.some(
    (track) => isRecord(track) && track.role === 'chords'
  );

  if (!hasChordTrack) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  return value as ChordLayerState;
}

function validateBassLayer(value: unknown): BassLayerState {
  if (!isRecord(value)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.enabled !== 'boolean') {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.mode !== 'string' || !BASS_MODES.has(value.mode)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.variant !== 'number' || Number.isNaN(value.variant)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.sourceChordSignature !== 'string') {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isRecord(value.track)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (value.track.role !== 'bass') {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!Array.isArray(value.track.notes)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  return value as BassLayerState;
}

function validateProjectFile(value: unknown): MelodySeedProjectFile {
  if (!isRecord(value)) {
    throw new ProjectFileError('This is not a Melody Seed project file.');
  }

  if (isProvenanceJson(value)) {
    throw new ProjectFileError(
      'This looks like a provenance JSON report. It documents a seed, but it cannot reopen a project. Please open a .melody-seed.json project file instead.'
    );
  }

  if (value.schema !== PROJECT_FILE_SCHEMA) {
    throw new ProjectFileError('This is not a Melody Seed project file.');
  }

  if (value.version !== PROJECT_FILE_VERSION) {
    throw new ProjectFileError('This project file version is not supported yet.');
  }

  if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  const melody = validateMelody(value.melody);

  let chordLayer: ChordLayerState | null = null;
  if (value.chordLayer !== null && value.chordLayer !== undefined) {
    chordLayer = validateChordLayer(value.chordLayer);
  }

  let bassLayer: BassLayerState | null = null;
  if (value.bassLayer !== null && value.bassLayer !== undefined) {
    bassLayer = validateBassLayer(value.bassLayer);
  }

  return {
    schema: PROJECT_FILE_SCHEMA,
    version: PROJECT_FILE_VERSION,
    appVersion: typeof value.appVersion === 'string' ? value.appVersion : undefined,
    generatorVersion: typeof value.generatorVersion === 'string' ? value.generatorVersion : undefined,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    melody,
    chordLayer,
    bassLayer
  };
}

export function createProjectFile(args: {
  melody: GeneratedMelody;
  chordLayer: ChordLayerState | null;
  bassLayer: BassLayerState | null;
  createdAt?: string;
  updatedAt?: string;
}): MelodySeedProjectFile {
  const now = new Date().toISOString();

  return {
    schema: PROJECT_FILE_SCHEMA,
    version: PROJECT_FILE_VERSION,
    generatorVersion: PROJECT_FILE_GENERATOR_VERSION,
    createdAt: args.createdAt ?? now,
    updatedAt: args.updatedAt ?? now,
    melody: args.melody,
    chordLayer: args.chordLayer,
    bassLayer: args.bassLayer
  };
}

export function serializeProjectFile(project: MelodySeedProjectFile): string {
  return JSON.stringify(project, null, 2);
}

export function parseProjectFileText(text: string): MelodySeedProjectFile {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ProjectFileError('Could not open this file. It is not valid JSON.');
  }

  return validateProjectFile(parsed);
}

function downloadBlob(data: BlobPart, filename: string, type: string): void {
  const blob = new Blob([data], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function downloadProjectFile(project: MelodySeedProjectFile): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `melody-seed-project-${timestamp}.melody-seed.json`;
  downloadBlob(serializeProjectFile(project), filename, 'application/json');
}
