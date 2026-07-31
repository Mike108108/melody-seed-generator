import type { BassLayerState } from '../seed/bassLayerState';
import type { ChordLayerState } from '../seed/chordLayerState';
import { createFingerprint } from '../melody/fingerprint';
import type { MelodyIntent } from '../melody/intent';
import { KEYS, midiToNoteName } from '../music/notes';
import { SCALE_OPTIONS } from '../music/scales';
import type { GeneratedMelody, GeneratedTrack, LayeredSeed, MelodyNote, MelodySettings } from '../types';
import { APP_VERSION } from '../version';
import { downloadBlob } from '../utils/download';

export const PROJECT_FILE_SCHEMA = 'melody-seed-project';
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_GENERATOR_VERSION = APP_VERSION;

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
const TRACK_ROLES = new Set(['melody', 'chords', 'bass', 'support', 'drone']);
const INTENT_GENRES = new Set(['pop-hook', 'dark-trap', 'edm-lead', 'afro-house', 'cinematic', 'hyperpop']);
const INTENT_ROLES = new Set(['chorus-hook', 'verse-motif', 'drop-lead', 'pre-chorus-lift']);
const INTENT_DRAMAS = new Set(['question-answer', 'build-release', 'call-response', 'loopable-hook']);
const INTENT_COMPLEXITIES = new Set(['simple', 'balanced', 'twisty']);
const INTENT_HOOKINESS = new Set(['safe', 'catchy', 'bold']);
const PHRASE_ROLES = new Set(['A', 'A_PRIME', 'B_CONTRAST', 'A_RETURN']);
const CONTOUR_GOALS = new Set(['neutral', 'rising', 'falling', 'peak', 'stable']);
const KEYS_SET = new Set<string>(KEYS);
const SCALES_SET = new Set<string>(SCALE_OPTIONS);
const MAX_PROJECT_FILE_BYTES = 5 * 1024 * 1024;
const MAX_NOTES_PER_TRACK = 16_384;
const MAX_TEXT_LENGTH = 4_096;

const invalidProject = () =>
  new ProjectFileError('This project file contains invalid or unsafe seed data.');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBoundedNumber(value: unknown, min: number, max: number): value is number {
  return isFiniteNumber(value) && value >= min && value <= max;
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && isBoundedNumber(value, min, max);
}

function isBoundedString(value: unknown, maxLength = MAX_TEXT_LENGTH): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maxLength;
}

function isStringArray(value: unknown, maxLength = MAX_NOTES_PER_TRACK): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= maxLength &&
    value.every((item) => typeof item === 'string' && item.length <= MAX_TEXT_LENGTH)
  );
}

function isNumberArray(value: unknown, maxLength = MAX_NOTES_PER_TRACK): value is number[] {
  return Array.isArray(value) && value.length <= maxLength && value.every(isFiniteNumber);
}

function validateSettings(value: unknown): MelodySettings {
  if (!isRecord(value)) throw invalidProject();

  if (
    !isBoundedString(value.seed, 256) ||
    typeof value.key !== 'string' ||
    !KEYS_SET.has(value.key) ||
    typeof value.scale !== 'string' ||
    !SCALES_SET.has(value.scale) ||
    !isBoundedInteger(value.bpm, 60, 190) ||
    !isBoundedInteger(value.bars, 2, 16) ||
    !isBoundedInteger(value.octave, 2, 6) ||
    !isBoundedInteger(value.range, 7, 36) ||
    !isBoundedNumber(value.density, 0, 1) ||
    !isBoundedNumber(value.restChance, 0, 1) ||
    !isBoundedNumber(value.variation, 0, 1) ||
    !isBoundedNumber(value.randomness, 0, 1) ||
    typeof value.commercialSaferMode !== 'boolean'
  ) {
    throw invalidProject();
  }

  return value as MelodySettings;
}

function validateNotes(value: unknown, totalBeats: number): MelodyNote[] {
  if (!Array.isArray(value) || value.length > MAX_NOTES_PER_TRACK) throw invalidProject();

  for (const note of value) {
    if (
      !isRecord(note) ||
      !isBoundedInteger(note.midi, 0, 127) ||
      !isBoundedString(note.noteName, 16) ||
      note.noteName !== midiToNoteName(note.midi) ||
      !isBoundedNumber(note.startBeats, 0, totalBeats) ||
      !isBoundedNumber(note.durationBeats, 0.01, totalBeats) ||
      note.startBeats + note.durationBeats > totalBeats + 0.001 ||
      !isBoundedNumber(note.velocity, 0, 1) ||
      !isBoundedInteger(note.degree, 0, 12)
    ) {
      throw invalidProject();
    }
  }

  return value as MelodyNote[];
}

function validateTrack(value: unknown, totalBeats: number): GeneratedTrack {
  if (
    !isRecord(value) ||
    !isBoundedString(value.id, 256) ||
    typeof value.role !== 'string' ||
    !TRACK_ROLES.has(value.role) ||
    !isBoundedString(value.name, 256) ||
    !isBoundedInteger(value.channel, 0, 15)
  ) {
    throw invalidProject();
  }

  validateNotes(value.notes, totalBeats);
  return value as GeneratedTrack;
}

function validateLayeredSeed(value: unknown, totalBeats: number): LayeredSeed {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    !isBoundedString(value.id, 256) ||
    !isBoundedString(value.primaryTrackId, 256) ||
    !Array.isArray(value.tracks) ||
    value.tracks.length > 16
  ) {
    throw invalidProject();
  }

  value.tracks.forEach((track) => validateTrack(track, totalBeats));
  return value as LayeredSeed;
}

function validateFingerprint(value: unknown): void {
  if (
    !isRecord(value) ||
    !isNumberArray(value.absolutePitches) ||
    !isNumberArray(value.pitchClasses) ||
    !isNumberArray(value.intervals) ||
    !isStringArray(value.rhythm) ||
    !isStringArray(value.contour) ||
    !isStringArray(value.pitchNgrams) ||
    !isStringArray(value.intervalNgrams) ||
    !isBoundedString(value.hash, 128)
  ) {
    throw invalidProject();
  }
}

function validateIntent(value: unknown): MelodyIntent {
  if (
    !isRecord(value) ||
    typeof value.genre !== 'string' ||
    !INTENT_GENRES.has(value.genre) ||
    typeof value.role !== 'string' ||
    !INTENT_ROLES.has(value.role) ||
    typeof value.drama !== 'string' ||
    !INTENT_DRAMAS.has(value.drama) ||
    typeof value.complexity !== 'string' ||
    !INTENT_COMPLEXITIES.has(value.complexity) ||
    typeof value.hookiness !== 'string' ||
    !INTENT_HOOKINESS.has(value.hookiness)
  ) {
    throw invalidProject();
  }

  return value as MelodyIntent;
}

function validatePhraseRolePlan(value: unknown): void {
  if (
    !isRecord(value) ||
    typeof value.drama !== 'string' ||
    !INTENT_DRAMAS.has(value.drama) ||
    !isBoundedInteger(value.phraseCount, 1, 8) ||
    !Array.isArray(value.directives) ||
    value.directives.length !== value.phraseCount
  ) {
    throw invalidProject();
  }

  for (const directive of value.directives) {
    if (
      !isRecord(directive) ||
      typeof directive.role !== 'string' ||
      !PHRASE_ROLES.has(directive.role) ||
      !isBoundedString(directive.label, 128) ||
      typeof directive.contourGoal !== 'string' ||
      !CONTOUR_GOALS.has(directive.contourGoal) ||
      !isBoundedNumber(directive.energyBias, -1, 1) ||
      !isBoundedNumber(directive.variationMultiplier, 0, 3) ||
      !isBoundedNumber(directive.restMultiplier, 0, 3) ||
      typeof directive.stableEnding !== 'boolean' ||
      typeof directive.unresolvedEnding !== 'boolean' ||
      !isBoundedNumber(directive.contrastAmount, 0, 1) ||
      !isBoundedNumber(directive.hookReturnStrength, 0, 1)
    ) {
      throw invalidProject();
    }
  }
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

  const settings = validateSettings(value.settings);
  const notes = validateNotes(value.notes, settings.bars * 4);
  validateFingerprint(value.fingerprint);

  if ((value.fingerprint as Record<string, unknown>).hash !== createFingerprint(notes).hash) {
    throw invalidProject();
  }

  if (value.layeredSeed !== undefined) {
    validateLayeredSeed(value.layeredSeed, settings.bars * 4);
  }

  if (value.intent !== undefined) {
    validateIntent(value.intent);
  }

  if (value.phraseRolePlan !== undefined) {
    validatePhraseRolePlan(value.phraseRolePlan);
  }

  if (
    !isBoundedNumber(value.qualityScore, 0, 100) ||
    !isBoundedNumber(value.similarityRiskScore, 0, 100) ||
    !isStringArray(value.warnings, 256)
  ) {
    throw invalidProject();
  }

  return value as GeneratedMelody;
}

function validateChordLayer(value: unknown, totalBeats: number): ChordLayerState {
  if (!isRecord(value)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.enabled !== 'boolean') {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isBoundedInteger(value.variant, 0, 1_000_000)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isStringArray(value.seenHarmonicSignatures, 1_024)) {
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

  const layeredSeed = validateLayeredSeed(value.layeredSeed, totalBeats);

  const hasChordTrack = layeredSeed.tracks.some((track) => track.role === 'chords');

  if (!hasChordTrack) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  return value as ChordLayerState;
}

function validateBassLayer(value: unknown, totalBeats: number): BassLayerState {
  if (!isRecord(value)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.enabled !== 'boolean') {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (typeof value.mode !== 'string' || !BASS_MODES.has(value.mode)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isBoundedInteger(value.variant, 0, 1_000_000)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  if (!isBoundedString(value.sourceChordSignature, 256_000)) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  const track = validateTrack(value.track, totalBeats);

  if (track.role !== 'bass') {
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

  if (
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.createdAt)) ||
    !Number.isFinite(Date.parse(value.updatedAt))
  ) {
    throw new ProjectFileError('This project file is missing required seed data.');
  }

  const melody = validateMelody(value.melody);
  const totalBeats = melody.settings.bars * 4;

  let chordLayer: ChordLayerState | null = null;
  if (value.chordLayer !== null && value.chordLayer !== undefined) {
    chordLayer = validateChordLayer(value.chordLayer, totalBeats);
  }

  let bassLayer: BassLayerState | null = null;
  if (value.bassLayer !== null && value.bassLayer !== undefined) {
    bassLayer = validateBassLayer(value.bassLayer, totalBeats);
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
    appVersion: APP_VERSION,
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

  if (new Blob([text]).size > MAX_PROJECT_FILE_BYTES) {
    throw new ProjectFileError('This project file is too large to open safely.');
  }

  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ProjectFileError('Could not open this file. It is not valid JSON.');
  }

  return validateProjectFile(parsed);
}

export function downloadProjectFile(project: MelodySeedProjectFile): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `melody-seed-project-${timestamp}.melody-seed.json`;
  downloadBlob(new Blob([serializeProjectFile(project)], { type: 'application/json' }), filename);
}
