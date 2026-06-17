export class SeededRandom {
  private state: number;

  constructor(seed: string) {
    this.state = xmur3(seed)();
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  chance(probability: number): boolean {
    return this.next() < clamp01(probability);
  }

  pick<T>(items: readonly T[]): T {
    return items[Math.floor(this.next() * items.length)];
  }

  pickWeighted<T>(items: readonly { value: T; weight: number }[]): T {
    const total = items.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
    if (total <= 0) return items[0].value;

    let roll = this.next() * total;
    for (const item of items) {
      roll -= Math.max(0, item.weight);
      if (roll <= 0) return item.value;
    }
    return items[items.length - 1].value;
  }
}

export function makeRandomSeed(prefix = 'seed'): string {
  const time = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${time}-${random}`;
}

function xmur3(str: string): () => number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }

  return function hash() {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
