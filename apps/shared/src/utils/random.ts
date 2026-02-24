import seedrandom from 'seedrandom';

export class SeededRandom {
  private rng: ReturnType<typeof seedrandom>;
  private seed: string | number;

  constructor(seed?: string | number) {
    this.seed = seed ?? Date.now();
    this.rng = seedrandom(String(this.seed));
  }

  setSeed(seed: string | number): void {
    this.seed = seed;
    this.rng = seedrandom(String(seed));
  }

  getSeed(): string | number {
    return this.seed;
  }

  random(): number {
    return typeof this.rng === "function" ? (this.rng as () => number)() : Math.random();
  }

  randInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min)) + min;
  }

  randBool(): boolean {
    return this.random() >= 0.5;
  }

  randFloat(min: number, max: number): number {
    return this.random() * (max - min) + min;
  }

  shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.random() * (i + 1));
      const temp = shuffled[i];
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp!;
    }
    return shuffled;
  }

  choice<T>(array: T[]): T | undefined {
    if (array.length === 0) {
      return undefined;
    }
    return array[this.randInt(0, array.length)];
  }

  sample<T>(array: T[], count: number): T[] {
    if (count >= array.length) {
      return this.shuffle(array);
    }
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, count);
  }
}

export function createSeededRandom(seed?: string | number): SeededRandom {
  return new SeededRandom(seed);
}

let globalSeededRandom: SeededRandom | null = null;

export function initGlobalSeededRandom(seed?: string | number): void {
  globalSeededRandom = new SeededRandom(seed);
}

export function getGlobalSeededRandom(): SeededRandom {
  if (!globalSeededRandom) {
    globalSeededRandom = new SeededRandom();
  }
  return globalSeededRandom;
}

