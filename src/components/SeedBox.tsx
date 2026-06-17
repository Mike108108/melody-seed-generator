import type { MelodySettings } from '../lib/types';
import { makeRandomSeed } from '../lib/utils/seededRandom';

type SeedBoxProps = {
  settings: MelodySettings;
  onChange: (nextSettings: MelodySettings) => void;
  onRegenerate: () => void;
};

export function SeedBox({ settings, onChange, onRegenerate }: SeedBoxProps) {
  const setSeed = (seed: string) => onChange({ ...settings, seed });

  return (
    <section className="panel seed-panel" aria-label="Seed controls">
      <div>
        <p className="eyebrow">Reproducible generation</p>
        <h2>Seed</h2>
      </div>
      <div className="seed-row">
        <input value={settings.seed} onChange={(event) => setSeed(event.target.value)} aria-label="Seed" />
        <button type="button" onClick={() => setSeed(makeRandomSeed('suno-idea'))}>
          Random Seed
        </button>
        <button type="button" onClick={onRegenerate}>
          Regenerate Current Seed
        </button>
      </div>
      <p className="hint">Same seed + same settings = same melody. Save the seed with the provenance JSON.</p>
    </section>
  );
}
