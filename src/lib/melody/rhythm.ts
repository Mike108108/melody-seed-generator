import type { SeededRandom } from '../utils/seededRandom';

export type RhythmEvent = {
  startBeats: number;
  durationBeats: number;
  isRest: boolean;
};

const BAR_BEATS = 4;

const RHYTHM_TEMPLATES: number[][] = [
  [1, 1, 1, 1],
  [0.5, 0.5, 1, 1, 1],
  [1, 0.5, 0.5, 1, 1],
  [1.5, 0.5, 1, 1],
  [0.5, 1.5, 1, 1],
  [0.5, 0.5, 0.5, 0.5, 1, 1],
  [0.75, 0.25, 1, 1, 1],
  [1, 0.75, 0.25, 1, 1],
  [0.5, 0.5, 1.5, 0.5, 1],
  [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1]
];

export function generateRhythmEvents(params: {
  bars: number;
  density: number;
  restChance: number;
  rng: SeededRandom;
  saferMode: boolean;
}): RhythmEvent[] {
  const { bars, density, restChance, rng, saferMode } = params;
  const events: RhythmEvent[] = [];
  const targetNotesPerBar = 3 + density * 5;

  for (let bar = 0; bar < bars; bar += 1) {
    const template = chooseTemplate(targetNotesPerBar, rng, saferMode);
    let cursor = bar * BAR_BEATS;

    template.forEach((duration, index) => {
      const isEdge = bar === 0 && index === 0;
      const isFinal = bar === bars - 1 && index === template.length - 1;
      const restPenalty = saferMode && (isEdge || isFinal) ? 0 : 1;
      const isRest = rng.chance(restChance * restPenalty);

      events.push({
        startBeats: roundToGrid(cursor),
        durationBeats: duration,
        isRest
      });

      cursor += duration;
    });
  }

  if (events.every((event) => event.isRest) && events.length > 0) {
    events[0].isRest = false;
  }

  return events.filter((event) => event.durationBeats > 0);
}

function chooseTemplate(targetNotesPerBar: number, rng: SeededRandom, saferMode: boolean): number[] {
  const weighted = RHYTHM_TEMPLATES.map((template) => {
    const densityScore = 1 / (1 + Math.abs(template.length - targetNotesPerBar));
    const rhythmicInterest = new Set(template).size;
    const saferBonus = saferMode && template.length >= 4 && rhythmicInterest >= 2 ? 1.25 : 1;
    const tooPlainPenalty = saferMode && template.every((duration) => duration === 1) ? 0.65 : 1;

    return {
      value: template,
      weight: densityScore * saferBonus * tooPlainPenalty
    };
  });

  return rng.pickWeighted(weighted);
}

function roundToGrid(value: number): number {
  return Math.round(value * 4) / 4;
}
