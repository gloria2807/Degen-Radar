import { describe, expect, it } from 'vitest';
import { normalizeSignals } from '../src/normalization/index.js';
import type { Signals } from '../src/types/index.js';

function createSignals(overrides: Partial<Signals> = {}): Signals {
    const base: Signals = {
        momentum: {
            value: 4.64,
            timestamp: Date.now(),
            source: 'test',
            available: true,
        },
        liquidity: {
            value: 48699.05,
            timestamp: Date.now(),
            source: 'test',
            available: true,
        },
        holders: {
            value: 521,
            timestamp: Date.now(),
            source: 'test',
            available: true,
        },
        walletFlow: {
            value: 1,
            timestamp: Date.now(),
            source: 'test',
            available: true,
        },
        attention: {
            value: 15.17,
            timestamp: Date.now(),
            source: 'test',
            available: true,
        },
    };

    return {
        ...base,
        ...overrides,
    };
}

describe('normalizeSignals', () => {
    it('normalizes low momentum to 0', () => {
        const signals = createSignals({
            momentum: {
                value: 4.64,
                timestamp: Date.now(),
                source: 'test',
                available: true,
            },
        });

        const result = normalizeSignals(signals);

        expect(result.momentum.value).toBe(0);
    });

    it('normalizes extreme momentum to 100', () => {
        const signals = createSignals({
            momentum: {
                value: 1355,
                timestamp: Date.now(),
                source: 'test',
                available: true,
            },
        });

        const result = normalizeSignals(signals);

        expect(result.momentum.value).toBe(100);
    });

    it('normalizes low liquidity correctly', () => {
        const signals = createSignals({
            liquidity: {
                value: 13050.29,
                timestamp: Date.now(),
                source: 'test',
                available: true,
            },
        });

        const result = normalizeSignals(signals);

        expect(result.liquidity.value).toBeCloseTo(1.6946, 3);
    });

    it('preserves zero wallet flow as non-positive', () => {
        const signals = createSignals({
            walletFlow: {
                value: 0,
                timestamp: Date.now(),
                source: 'test',
                available: true,
            },
        });

        const result = normalizeSignals(signals);

        expect(result.walletFlow.value).toBe(0);
        expect(result.walletFlow.metadata?.isPositive).toBe(false);
    });
});
