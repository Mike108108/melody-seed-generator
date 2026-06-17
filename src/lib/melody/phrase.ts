import type { MelodyNote, MelodySettings } from '../types';
import type { SeededRandom } from '../utils/seededRandom';
import { getScaleDegree, getScalePitches } from '../music/scales';
import { chooseNextPitch, chooseStartingPitch, makeNote } from '../music/theory';
import { noteToMidi } from '../music/notes';
import { getMotifBars } from './phraseAnalysis';
import { generateRhythmEvents } from './rhythm';

export type MotifContext = {
  scalePitches: number[];
  targetCenter: number;
};

export function createMotif(settings: MelodySettings, rng: SeededRandom): { motif: MelodyNote[]; motifBars: number; context: MotifContext } {
  const motifBars = getMotifBars(settings.bars);
  const scalePitches = getScalePitches(settings.key, settings.scale, settings.octave, settings.range);
  const root = noteToMidi(settings.key, settings.octave);
  const targetCenter = root + Math.min(settings.range, 12) / 2;

  const rhythm = generateRhythmEvents({
    bars: motifBars,
    density: settings.density,
    restChance: settings.restChance,
    rng,
    saferMode: settings.commercialSaferMode
  });

  const playableEvents = rhythm.filter((event) => !event.isRest);
  const motif: MelodyNote[] = [];

  let currentPitch = chooseStartingPitch(scalePitches, settings.key, settings.scale, targetCenter, rng);
  let previousInterval = 0;

  playableEvents.forEach((event, index) => {
    const isFinalEvent = index === playableEvents.length - 1;
    const shouldForceStable = isFinalEvent || (settings.commercialSaferMode && event.startBeats % 4 === 0 && rng.chance(0.35));
    const nextPitch =
      index === 0
        ? currentPitch
        : chooseNextPitch({
            currentPitch,
            previousInterval,
            candidates: scalePitches,
            settings,
            rng,
            targetCenter,
            forceStable: shouldForceStable
          });

    previousInterval = nextPitch - currentPitch;
    currentPitch = nextPitch;

    const degree = getScaleDegree(nextPitch, settings.key, settings.scale);
    const velocity = 0.58 + rng.next() * 0.28;
    motif.push(makeNote(nextPitch, event.startBeats, event.durationBeats, velocity, degree));
  });

  return { motif, motifBars, context: { scalePitches, targetCenter } };
}
