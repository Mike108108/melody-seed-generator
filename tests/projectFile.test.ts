import { describe, expect, it } from 'vitest';
import { generateMelody, DEFAULT_SETTINGS } from '../src/lib/melody/generateMelody';
import { DEFAULT_INTENT } from '../src/lib/melody/intent';
import { createPhraseRolePlan } from '../src/lib/melody/phraseRolePlan';
import {
  createProjectFile,
  parseProjectFileText,
  ProjectFileError,
  serializeProjectFile
} from '../src/lib/project/projectFile';
import { createDefaultLayersForMelody } from '../src/lib/seed/activeLayeredSeed';

function validProjectText(): string {
  const melody = generateMelody({ ...DEFAULT_SETTINGS, seed: 'project-validation-test' });
  return serializeProjectFile(
    createProjectFile({
      melody,
      chordLayer: null,
      bassLayer: null,
      createdAt: '2026-07-30T00:00:00.000Z',
      updatedAt: '2026-07-30T00:00:00.000Z'
    })
  );
}

describe('project file validation', () => {
  it('opens a valid project', () => {
    const project = parseProjectFileText(validProjectText());
    expect(project.melody.settings.seed).toBe('project-validation-test');
  });

  it('opens a complete project with intent, phrase plan, chords, and bass', () => {
    const settings = { ...DEFAULT_SETTINGS, seed: 'complete-project-test' };
    const phraseRolePlan = createPhraseRolePlan(DEFAULT_INTENT, settings);
    const melody = {
      ...generateMelody(settings, [], { phraseRolePlan }),
      intent: DEFAULT_INTENT,
      phraseRolePlan
    };
    const layers = createDefaultLayersForMelody(melody);
    const text = serializeProjectFile(
      createProjectFile({ melody, ...layers, createdAt: '2026-07-30T00:00:00.000Z' })
    );

    const project = parseProjectFileText(text);
    expect(project.chordLayer).not.toBeNull();
    expect(project.bassLayer).not.toBeNull();
  });

  it.each([
    ['unbounded bar count', (value: any) => (value.melody.settings.bars = 1_000_000_000)],
    ['zero tempo', (value: any) => (value.melody.settings.bpm = 0)],
    ['unknown scale', (value: any) => (value.melody.settings.scale = 'invalid')],
    ['unknown intent', (value: any) => (value.melody.intent = { genre: 'invalid' })],
    ['non-numeric MIDI note', (value: any) => (value.melody.notes[0].midi = '60')],
    ['note beyond the project timeline', (value: any) => (value.melody.notes[0].startBeats = 999)]
  ])('rejects %s', (_label, mutate) => {
    const value = JSON.parse(validProjectText());
    mutate(value);

    expect(() => parseProjectFileText(JSON.stringify(value))).toThrow(ProjectFileError);
  });
});
