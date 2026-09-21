import { describe, expect, it } from 'vitest';
import { calculateRadarScore } from '../src/engine/scoring.js';
import type { Signals } from '../src/types/index.js';

function createSignals(values: Partial<Record<keyof Signals, number | null>>): Signals {
    const timestamp = Date.now();

    return {
        momentum: {
            value: values.momentum ?? 0,
            timestamp,
            source: 'test',
            available: values.momentum !== null,
        },
        liquidity: {
            value: values.liquidity ?? 0,
            timestamp,
            source: 'test',
            available: values.liquidity !== null,
        },
        holders: {
            value: values.holders ?? 0,
            timestamp,
            source: 'test',
            available: values.holders !== null,
        },
        walletFlow: {
            value: values.walletFlow ?? 0,
            timestamp,
            source: 'test',
            available: values.walletFlow !== null,
        },
        attention: {
            value: values.attention ?? 0,
            timestamp,
            source: 'test',
            available: values.attention !== null,
        },
    };
}

describe('calculateRadarScore', () => {
    it('returns 100 when all available signals are 100', () => {
        const signals = createSignals({
            momentum: 100,
            liquidity: 100,
            holders: 100,
            walletFlow: 100,
            attention: 100,
        });

        expect(calculateRadarScore(signals)).toBe(100);
    });

    it('returns 0 when all available signals are 0', () => {
        const signals = createSignals({
            momentum: 0,
            liquidity: 0,
            holders: 0,
            walletFlow: 0,
            attention: 0,
        });

        expect(calculateRadarScore(signals)).toBe(0);
    });

    it('calculates a weighted score', () => {
        const signals = createSignals({
            momentum: 100,
            liquidity: 50,
            holders: 50,
            walletFlow: 0,
            attention: 100,
        });

        const score = calculateRadarScore(signals);

        expect(score).toBeCloseTo(60, 5);
    });
});
