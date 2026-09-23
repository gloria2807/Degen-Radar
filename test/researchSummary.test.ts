import { describe, expect, it } from 'vitest';

import { buildResearchSummary } from '../src/engine/researchSummary.js';
import type { Convergence } from '../src/types/index.js';

describe('buildResearchSummary', () => {
    it('explains when no pattern is established', () => {
        const signals = {
            momentum: { available: true },
            liquidity: { available: true },
            holders: { available: true },
            walletFlow: { available: false },
            attention: { available: true },
        };

        const convergence: Convergence = {
            status: 'none',
            supportingSignals: [],
            contradictingSignals: [],
            unavailableSignals: ['walletFlow'],
            reason:
                'The available signals do not satisfy the conditions for any predefined pattern.',
        };

        const result = buildResearchSummary(
            null,
            signals as any,
            convergence,
            31.87,
        );

        expect(result.headline).toBe('No established pattern');
        expect(result.limitations.length).toBeGreaterThan(0);
    });

    it('creates a readable pattern summary', () => {
        const signals = {
            momentum: { available: true },
            liquidity: { available: true },
            holders: { available: true },
            walletFlow: { available: false },
            attention: { available: true },
        };

        const convergence: Convergence = {
            status: 'strong',
            supportingSignals: [
                'momentum',
                'liquidity',
                'holders',
                'attention',
            ],
            contradictingSignals: [],
            unavailableSignals: ['walletFlow'],
            reason:
                'Four available signals support the detected pattern.',
        };

        const result = buildResearchSummary(
            'momentum_breakout',
            signals as any,
            convergence,
            81.2,
        );

        expect(result.headline).toBe('Momentum breakout');
        expect(result.interpretation).toContain(
            'momentum breakout',
        );
    });
});