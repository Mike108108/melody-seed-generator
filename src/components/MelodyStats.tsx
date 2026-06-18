import type { GeneratedMelody } from '../lib/types';

type MelodyStatsProps = {
  melody: GeneratedMelody | null;
};

export function MelodyStatsCompact({ melody }: MelodyStatsProps) {
  if (!melody) {
    return (
      <div className="melody-stats-compact melody-stats-compact--empty" aria-label="Melody quality scores">
        <MiniStat label="Quality" value="—" status="neutral" suffix="/ 100" />
        <MiniStat label="Similarity risk" value="—" status="neutral" suffix="/ 100" />
      </div>
    );
  }

  return (
    <div className="melody-stats-compact" aria-label="Melody quality scores">
      <MiniStat
        label="Quality score"
        value={melody.qualityScore}
        status={scoreStatus(melody.qualityScore, true)}
        suffix="/ 100"
      />
      <MiniStat
        label="Similarity risk"
        value={melody.similarityRiskScore}
        status={scoreStatus(melody.similarityRiskScore, false)}
        suffix="/ 100"
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  status,
  suffix
}: {
  label: string;
  value: number | string;
  status: 'good' | 'mid' | 'bad' | 'neutral';
  suffix?: string;
}) {
  return (
    <div className={`mini-stat mini-stat--${status}`}>
      <span className="mini-stat-label">{label}</span>
      <strong className="mini-stat-value">
        {value}
        {suffix ? <small>{suffix}</small> : null}
      </strong>
    </div>
  );
}

function scoreStatus(value: number, goodHigh: boolean): 'good' | 'mid' | 'bad' {
  if (goodHigh) {
    if (value >= 70) return 'good';
    if (value >= 45) return 'mid';
    return 'bad';
  }
  if (value <= 35) return 'good';
  if (value <= 60) return 'mid';
  return 'bad';
}
