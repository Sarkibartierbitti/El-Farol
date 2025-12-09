export declare class SeededRandom {
    private rng;
    private seed;
    constructor(seed?: string | number);
    setSeed(seed: string | number): void;
    getSeed(): string | number;
    random(): number;
    randInt(min: number, max: number): number;
    randBool(): boolean;
    randFloat(min: number, max: number): number;
    shuffle<T>(array: T[]): T[];
    choice<T>(array: T[]): T | undefined;
    sample<T>(array: T[], count: number): T[];
}
export declare function createSeededRandom(seed?: string | number): SeededRandom;
export declare function initGlobalSeededRandom(seed?: string | number): void;
export declare function getGlobalSeededRandom(): SeededRandom;
//# sourceMappingURL=random.d.ts.map