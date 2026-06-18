import type { MelodyIntent } from '../lib/melody/intent';
import {
  COMPLEXITY_OPTIONS,
  DRAMA_OPTIONS,
  GENRE_OPTIONS,
  HOOKINESS_OPTIONS,
  ROLE_OPTIONS
} from '../lib/melody/intent';

type IntentControlsProps = {
  intent: MelodyIntent;
  onChange: (nextIntent: MelodyIntent) => void;
};

export function IntentControls({ intent, onChange }: IntentControlsProps) {
  const patch = <K extends keyof MelodyIntent>(key: K, value: MelodyIntent[K]) => {
    onChange({ ...intent, [key]: value });
  };

  return (
    <section className="panel intent-panel" aria-label="Hook intent controls">
      <div className="panel-header slim">
        <div>
          <p className="eyebrow">Intent</p>
          <h2>Hook Intent</h2>
        </div>
      </div>

      <div className="control-grid">
        <label>
          Genre
          <select value={intent.genre} onChange={(event) => patch('genre', event.target.value as MelodyIntent['genre'])}>
            {GENRE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Melody Role
          <select value={intent.role} onChange={(event) => patch('role', event.target.value as MelodyIntent['role'])}>
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Drama
          <select value={intent.drama} onChange={(event) => patch('drama', event.target.value as MelodyIntent['drama'])}>
            {DRAMA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Complexity
          <select
            value={intent.complexity}
            onChange={(event) => patch('complexity', event.target.value as MelodyIntent['complexity'])}
          >
            {COMPLEXITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="control-grid-span">
          Hookiness
          <select
            value={intent.hookiness}
            onChange={(event) => patch('hookiness', event.target.value as MelodyIntent['hookiness'])}
          >
            {HOOKINESS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
