"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededRandom = void 0;
exports.createSeededRandom = createSeededRandom;
exports.initGlobalSeededRandom = initGlobalSeededRandom;
exports.getGlobalSeededRandom = getGlobalSeededRandom;
const seedrandom_1 = __importDefault(require("seedrandom"));
class SeededRandom {
    constructor(seed) {
        this.seed = seed !== null && seed !== void 0 ? seed : Date.now();
        this.rng = (0, seedrandom_1.default)(String(this.seed));
    }
    setSeed(seed) {
        this.seed = seed;
        this.rng = (0, seedrandom_1.default)(String(seed));
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
exports.SeededRandom = SeededRandom;
function createSeededRandom(seed) {
    return new SeededRandom(seed);
}
let globalSeededRandom = null;
function initGlobalSeededRandom(seed) {
    globalSeededRandom = new SeededRandom(seed);
}
function getGlobalSeededRandom() {
    if (!globalSeededRandom) {
        globalSeededRandom = new SeededRandom();
    }
    return globalSeededRandom;
}
//# sourceMappingURL=random.js.map