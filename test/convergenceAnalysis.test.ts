import { describe, expect, it } from 'vitest';

import { analyzeConvergence } from '../src/engine/convergenceAnalysis.js';

function signal(
    normalizedValue: number,
    available = true,
) {
    return {
        value: normalizedValue,
        normalizedValue,
        available,
        source: 'test',
    };
}

describe('analyzeConvergence', () => {
    it('identifies strong momentum breakout convergence', () => {
        const signals = {
            momentum: signal(90),
            liquidity: signal(70),
            holders: signal(60),
            walletFlow: signal(0, false),
            attention: signal(80),
        };

        const result = analyzeConvergence(
    signals as any,
    'momentum_breakout',
);

console.log(
    'MOMENTUM BREAKOUT CONVERGENCE:',
    JSON.stringify(result, null, 2),
);

expect(result.convergence.status).toBe('strong');

        expect(result.convergence.status).toBe('strong');
        expect(result.convergence.supportingSignals).toContain('momentum');
        expect(result.convergence.supportingSignals).toContain('liquidity');
        expect(result.convergence.supportingSignals).toContain('holders');
        expect(result.convergence.supportingSignals).toContain('attention');
        expect(result.convergence.unavailableSignals).toContain('walletFlow');
    });

    it('returns no established pattern when pattern is null', () => {
        const signals = {
            momentum: signal(52),
            liquidity: signal(23),
            holders: signal(24),
            walletFlow: signal(0, false),
            attention: signal(20),
        };

        const result = analyzeConvergence(
            signals as any,
            null,
        );

        expect(result.convergence.status).toBe('none');
        expect(result.patternAnalysis.name).toBeNull();
        expect(result.patternAnalysis.reason).toContain(
            'do not satisfy',
        );
    });

    it('detects contradiction', () => {
        const signals = {
            momentum: signal(90),
            liquidity: signal(10),
            holders: signal(10),
            walletFlow: signal(10),
            attention: signal(80),
        };

        const result = analyzeConvergence(
            signals as any,
            'momentum_breakout',
        );

        expect(
            result.convergence.contradictingSignals.length,
        ).toBeGreaterThan(0);
    });

    it('tracks unavailable signals', () => {
        const signals = {
            momentum: signal(90),
            liquidity: signal(70),
            holders: signal(60),
            walletFlow: signal(0, false),
            attention: signal(80),
        };

        const result = analyzeConvergence(
            signals as any,
            'momentum_breakout',
        );

        expect(
            result.convergence.unavailableSignals,
        ).toContain('walletFlow');
    });
});