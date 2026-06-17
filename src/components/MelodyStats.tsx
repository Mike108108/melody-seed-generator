import type { GeneratedMelody } from '../lib/types';

export function MelodyStats({ melody }: { melody: GeneratedMelody | null }) {
  if (!melody) {
    return (
      <section className="panel stats-panel">
        <p className="eyebrow">Stats</p>
        <div className="empty-state">No melody yet.</div>
      </section>
    );
  }

  const range = Math.max(...melody.notes.map((note) => note.midi)) - Math.min(...melody.notes.map((note) => note.midi));
  const uniquePitches = new Set(melody.notes.map((note) => note.midi)).size;

  return (
    <section className="panel stats-panel">
      <div>
        <p className="eyebrow">Quality / Risk</p>
        <h2>Melody Stats</h2>
      </div>

      <div className="score-grid">
        <Score label="Quality score" value={melody.qualityScore} goodHigh />
        <Score label="Similarity risk" value={melody.similarityRiskScore} goodHigh={false} />
      </div>

      <dl className="stats-list">
        <div>
          <dt>Seed</dt>
          <dd>{melody.settings.seed}</dd>
        </div>
        <div>
          <dt>Fingerprint</dt>
          <dd>{melody.fingerprint.hash}</dd>
        </div>
        <div>
          <dt>Notes</dt>
          <dd>{melody.notes.length}</dd>
        </div>
        <div>
          <dt>Unique pitches</dt>
          <dd>{uniquePitches}</dd>
        </div>
        <div>
          <dt>Range</dt>
          <dd>{range} semitones</dd>
        </div>
      </dl>

      {melody.warnings.length > 0 ? (
        <div className="warnings">
          <strong>Warnings</strong>
          <ul>
            {melody.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="hint success">No local cliche warnings for this melody.</p>
      )}
    </section>
  );
}

function Score({ label, value, goodHigh }: { label: string; value: number; goodHigh: boolean }) {
  const status = goodHigh ? (value >= 70 ? 'good' : value >= 45 ? 'mid' : 'bad') : value <= 35 ? 'good' : value <= 60 ? 'mid' : 'bad';

  return (
    <div className={`score-card ${status}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
