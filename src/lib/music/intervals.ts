export function intervalBetween(a: number, b: number): number {
  return b - a;
}

export function contourSymbol(interval: number): 'U' | 'D' | 'S' {
  if (interval > 1) return 'U';
  if (interval < -1) return 'D';
  return 'S';
}

export function melodicRange(pitches: number[]): number {
  if (pitches.length === 0) return 0;
  return Math.max(...pitches) - Math.min(...pitches);
}

export function averageAbsoluteInterval(pitches: number[]): number {
  if (pitches.length < 2) return 0;
  const intervals = pitches.slice(1).map((pitch, index) => Math.abs(pitch - pitches[index]));
  return intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
}
