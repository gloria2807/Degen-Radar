import type {
    ResearchSummary,
    Signals,
    Convergence,
} from '../types/index.js';

export function buildResearchSummary(
    pattern: string | null,
    signals: Signals,
    convergence: Convergence,
    radarScore: number,
): ResearchSummary {
    const availableCount = Object.values(signals).filter(
        (signal) => signal.available,
    ).length;

    const totalCount = Object.values(signals).length;

    if (!pattern) {
        return {
            headline: 'No established pattern',
            interpretation:
                'The available signals do not currently converge strongly enough to match one of the predefined market patterns.',
            limitations: [
                `${availableCount} of ${totalCount} signals were available.`,
                'Pattern detection is based on predefined rules and does not predict future price movement.',
            ],
        };
    }

    const patternNames: Record<string, string> = {
        quiet_accumulation: 'Quiet accumulation',
        momentum_breakout: 'Momentum breakout',
        social_only_hype: 'Social-only hype',
        distribution: 'Distribution',
        liquidity_risk: 'Liquidity risk',
    };

    const readablePattern =
        patternNames[pattern] ?? pattern.replace(/_/g, ' ');

    const supportText =
        convergence.supportingSignals.length > 0
            ? convergence.supportingSignals.join(', ')
            : 'none';

    const contradictionText =
        convergence.contradictingSignals.length > 0
            ? convergence.contradictingSignals.join(', ')
            : 'none';

    return {
        headline: readablePattern,
        interpretation:
            `Degen Radar detected ${readablePattern.toLowerCase()} ` +
            `based on the available signal combination. ` +
            `Supporting signals: ${supportText}. ` +
            `Contradicting signals: ${contradictionText}. ` +
            `Radar Score: ${radarScore.toFixed(2)}.`,
        limitations: [
            `${availableCount} of ${totalCount} signals were available.`,
            convergence.unavailableSignals.length > 0
                ? `Unavailable signals: ${convergence.unavailableSignals.join(', ')}.`
                : 'All configured signals were available.',
            'The result describes current signal convergence and does not predict future price movement.',
        ],
    };
}