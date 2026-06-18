type SeedIdChipProps = {
  seed: string;
};

export function SeedIdChip({ seed }: SeedIdChipProps) {
  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(seed);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="seed-id-chip" aria-label="Seed ID">
      <span className="seed-id-label">Seed ID</span>
      <code className="seed-id-value" title={seed}>
        {seed}
      </code>
      <button
        type="button"
        className="seed-id-copy"
        onClick={() => void copySeed()}
        aria-label="Copy seed ID"
        title="Copy seed ID"
      >
        ⧉
      </button>
    </div>
  );
}
