import seedrandom from 'seedrandom';
export class SeededRandom {
    rng;
    seed;
    constructor(seed) {
        this.seed = seed ?? Date.now();
        this.rng = seedrandom(String(this.seed));
    }
    setSeed(seed) {
        this.seed = seed;
        this.rng = seedrandom(String(seed));
    }
    getSeed() {
        return this.seed;
    }
    random() {
        return typeof this.rng === "function" ? this.rng() : Math.random();
    }
    randInt(min, max) {
        return Math.floor(this.random() * (max - min)) + min;
    }
    randBool() {
        return this.random() >= 0.5;
    }
    randFloat(min, max) {
        return this.random() * (max - min) + min;
    }
    shuffle(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            const temp = shuffled[i];
            shuffled[i] = shuffled[j];
            shuffled[j] = temp;
        }
        return shuffled;
    }
    choice(array) {
        if (array.length === 0) {
            return undefined;
        }
        return array[this.randInt(0, array.length)];
    }
    sample(array, count) {
        if (count >= array.length) {
            return this.shuffle(array);
        }
        const shuffled = this.shuffle(array);
        return shuffled.slice(0, count);
    }
}
export function createSeededRandom(seed) {
    return new SeededRandom(seed);
}
let globalSeededRandom = null;
export function initGlobalSeededRandom(seed) {
    globalSeededRandom = new SeededRandom(seed);
}
export function getGlobalSeededRandom() {
    if (!globalSeededRandom) {
        globalSeededRandom = new SeededRandom();
    }
    return globalSeededRandom;
}
