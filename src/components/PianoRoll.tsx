import type { GeneratedMelody } from '../lib/types';

export function PianoRoll({ melody }: { melody: GeneratedMelody | null }) {
  if (!melody || melody.notes.length === 0) {
    return (
      <section className="panel piano-panel">
        <p className="eyebrow">Piano roll</p>
        <div className="empty-state">Generate a melody to see the piano roll.</div>
      </section>
    );
  }

  const minMidi = Math.min(...melody.notes.map((note) => note.midi)) - 1;
  const maxMidi = Math.max(...melody.notes.map((note) => note.midi)) + 1;
  const totalBeats = melody.settings.bars * 4;
  const pitchSpan = Math.max(1, maxMidi - minMidi + 1);
  const beatLines = Array.from({ length: totalBeats + 1 }, (_, index) => index);

  return (
    <section className="panel piano-panel">
      <div className="panel-header slim">
        <div>
          <p className="eyebrow">Piano roll</p>
          <h2>{melody.settings.bars} bars / monophonic lead</h2>
        </div>
      </div>

      <div className="piano-roll" style={{ height: Math.max(220, pitchSpan * 22) }}>
        {beatLines.map((beat) => (
          <div
            key={beat}
            className={`beat-line ${beat % 4 === 0 ? 'bar-line' : ''}`}
            style={{ left: `${(beat / totalBeats) * 100}%` }}
          />
        ))}

        {melody.notes.map((note, index) => {
          const left = (note.startBeats / totalBeats) * 100;
          const width = (note.durationBeats / totalBeats) * 100;
          const top = ((maxMidi - note.midi) / pitchSpan) * 100;

          return (
            <div
              key={`${note.startBeats}-${note.midi}-${index}`}
              className="piano-note"
              style={{ left: `${left}%`, width: `${Math.max(width, 1.2)}%`, top: `${top}%` }}
              title={`${note.noteName} / beat ${note.startBeats} / ${note.durationBeats} beats`}
            >
              {note.noteName}
            </div>
          );
        })}
      </div>
    </section>
  );
}
