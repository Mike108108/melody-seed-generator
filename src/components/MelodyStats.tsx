import type { GeneratedMelody } from '../lib/types';

type MelodyStatsProps = {
  melody: GeneratedMelody | null;
};

export function MelodyStatsCompact({ melody }: MelodyStatsProps) {
  if (!melody) {
    return (
      <div className="melody-stats-compact melody-stats-compact--empty" aria-label="Melody output stats">
        <MiniStat label="Quality" value="—" status="neutral" />
        <MiniStat label="Risk" value="—" status="neutral" />
        <MiniStat label="Warnings" value="—" status="neutral" />
      </div>
    );
  }

  const warningCount = melody.warnings.length;

  return (
    <div className="melody-stats-compact" aria-label="Melody output stats">
      <MiniStat label="Quality" value={melody.qualityScore} status={scoreStatus(melody.qualityScore, true)} />
      <MiniStat label="Risk" value={melody.similarityRiskScore} status={scoreStatus(melody.similarityRiskScore, false)} />
      <MiniStat label="Warnings" value={warningCount} status={warningStatus(warningCount)} title={warningCount > 0 ? melody.warnings.join(' · ') : undefined} />
    </div>
  );
}

function MiniStat({
  label,
  value,
  status,
  title
}: {
  label: string;
  value: number | string;
  status: 'good' | 'mid' | 'bad' | 'neutral';
  title?: string;
}) {
  return (
    <div className={`mini-stat mini-stat--${status}`} title={title}>
      <span className="mini-stat-label">{label}</span>
      <strong className="mini-stat-value">{value}</strong>
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

function warningStatus(count: number): 'good' | 'mid' | 'bad' {
  if (count === 0) return 'good';
  if (count <= 2) return 'mid';
  return 'bad';
}
