import { describe, expect, it } from 'vitest';
import { detectPatterns } from '../src/engine/convergence.js';
import type { Signals } from '../src/types/index.js';

function createSignals(
    values: Partial<Record<keyof Signals, number>>,
    metadata: Partial<Record<keyof Signals, Record<string, unknown>>> = {},
): Signals {
    const timestamp = Date.now();

    const createSignal = (key: keyof Signals): Signals[typeof key] => ({
        value: values[key] ?? 0,
        timestamp,
        source: 'test',
        available: true,
        metadata: metadata[key],
    });

    return {
        momentum: createSignal('momentum'),
        liquidity: createSignal('liquidity'),
        holders: createSignal('holders'),
        walletFlow: createSignal('walletFlow'),
        attention: createSignal('attention'),
    };
}

describe('detectPatterns', () => {
    it('detects quiet accumulation', () => {
        const signals = createSignals(
            {
                momentum: 0,
                liquidity: 20,
                holders: 23,
                walletFlow: 100,
                attention: 15,
            },
            {
                momentum: {
                    originalValue: 4.64,
                    isPositive: true,
                },
                holders: {
                    originalValue: 521,
                    holderCount: 521,
                },
                walletFlow: {
                    originalValue: 1,
                    isPositive: true,
                    flowRatio: 1,
                },
            },
        );

        const result = detectPatterns(signals);

        expect(result.pattern).toBe('quiet_accumulation');
    });

    it('detects momentum breakout', () => {
        const signals = createSignals(
            {
                momentum: 100,
                liquidity: 50.69,
                holders: 63.7,
                walletFlow: 0,
                attention: 95,
            },
            {
                momentum: {
                    originalValue: 1355,
                    isPositive: true,
                },
                holders: {
                    originalValue: 3467,
                    holderCount: 3467,
                },
                walletFlow: {
                    originalValue: 0,
                    isPositive: false,
                },
            },
        );

        const result = detectPatterns(signals);

        expect(result.pattern).toBe('momentum_breakout');
    });

    it('detects liquidity risk', () => {
        const signals = createSignals({
            momentum: 0,
            liquidity: 1.69,
            holders: 35.6,
            walletFlow: 0,
            attention: 41.97,
        });

        const result = detectPatterns(signals);

        expect(result.pattern).toBe('liquidity_risk');
        expect(result.riskFlags[0]?.severity).toBe('high');
    });
});
