import type { GeneratedMelody } from '../lib/types';

const ISSUES_TOOLTIP =
  'Generation quality notes, such as repeated motifs, cliché patterns, or elevated similarity risk.';

type MelodyStatsProps = {
  melody: GeneratedMelody | null;
};

export function MelodyStatsCompact({ melody }: MelodyStatsProps) {
  if (!melody) {
    return (
      <div className="melody-stats-compact melody-stats-compact--empty" aria-label="Melody output stats">
        <MiniStat label="Quality" value="—" status="neutral" />
        <MiniStat label="Risk" value="—" status="neutral" />
        <MiniStat label="Issues" value="—" status="neutral" title={ISSUES_TOOLTIP} muted />
      </div>
    );
  }

  const issueCount = melody.warnings.length;
  const issuesTitle =
    issueCount > 0 ? `${ISSUES_TOOLTIP}\n\n${melody.warnings.join('\n')}` : ISSUES_TOOLTIP;

  return (
    <div className="melody-stats-compact" aria-label="Melody output stats">
      <MiniStat label="Quality" value={melody.qualityScore} status={scoreStatus(melody.qualityScore, true)} />
      <MiniStat label="Risk" value={melody.similarityRiskScore} status={scoreStatus(melody.similarityRiskScore, false)} />
      <MiniStat
        label="Issues"
        value={issueCount}
        status={issueStatus(issueCount)}
        title={issuesTitle}
        muted={issueCount === 0}
      />
    </div>
  );
}

function MiniStat({
  label,
  value,
  status,
  title,
  muted
}: {
  label: string;
  value: number | string;
  status: 'good' | 'mid' | 'bad' | 'neutral';
  title?: string;
  muted?: boolean;
}) {
  return (
    <div
      className={`mini-stat mini-stat--${status}${muted ? ' mini-stat--muted' : ''}`}
      title={title}
      aria-label={title ? `${label}: ${value}. ${title.replace(/\n+/g, ' ')}` : undefined}
    >
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

function issueStatus(count: number): 'neutral' | 'mid' | 'bad' {
  if (count === 0) return 'neutral';
  if (count <= 2) return 'mid';
  return 'bad';
}
