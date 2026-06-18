import type { MelodySettings } from '../lib/types';
import { makeRandomSeed } from '../lib/utils/seededRandom';

type SeedBoxProps = {
  settings: MelodySettings;
  onChange: (nextSettings: MelodySettings) => void;
  onRegenerate: () => void;
};

export function SeedBox({ settings, onChange, onRegenerate }: SeedBoxProps) {
  const setSeed = (seed: string) => onChange({ ...settings, seed });

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(settings.seed);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <section className="panel seed-panel" aria-label="Seed controls">
      <div className="panel-header slim">
        <div>
          <p className="eyebrow">Reproducible</p>
          <h2>Seed</h2>
        </div>
      </div>
      <p className="hint seed-hint">Same seed + same settings = same melody.</p>
      <div className="seed-row">
        <input value={settings.seed} onChange={(event) => setSeed(event.target.value)} aria-label="Seed" />
        <button type="button" className="seed-action icon-button" onClick={() => void copySeed()} aria-label="Copy seed" title="Copy seed">
          ⧉
        </button>
        <button type="button" className="seed-action" onClick={() => setSeed(makeRandomSeed('suno-idea'))}>
          Random Seed
        </button>
        <button type="button" className="seed-action" onClick={onRegenerate}>
          Regenerate
        </button>
      </div>
    </section>
  );
}
