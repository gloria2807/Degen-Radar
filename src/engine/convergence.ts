// Convergence engine - detects patterns from normalized signal combinations

import { CONFIG } from '../config/index.js';
import type { PatternEvidence, RiskFlag, Signals, SignalValue } from '../types/index.js';

export function detectPatterns(normalizedSignals: Signals): {
    pattern: string | null;
    evidence: PatternEvidence[];
    riskFlags: RiskFlag[];
} {
    const evidence: PatternEvidence[] = [];
    const riskFlags: RiskFlag[] = [];

    const isAvailable = (signal: SignalValue): boolean =>
        signal.available && signal.value !== null;

    const getMetadataNumber = (
        signal: SignalValue,
        key: string,
    ): number | null => {
        const value = signal.metadata?.[key];

        return typeof value === 'number' ? value : null;
    };

    const getMetadataBoolean = (
        signal: SignalValue,
        key: string,
    ): boolean | null => {
        const value = signal.metadata?.[key];

        return typeof value === 'boolean' ? value : null;
    };

    const momentum = normalizedSignals.momentum.value ?? 0;
    const liquidity = normalizedSignals.liquidity.value ?? 0;
    const holders = normalizedSignals.holders.value ?? 0;
    const walletFlow = normalizedSignals.walletFlow.value ?? 0;
    const attention = normalizedSignals.attention.value ?? 0;

    const momentumOriginal = getMetadataNumber(
        normalizedSignals.momentum,
        'originalValue',
    );

    const liquidityOriginal = getMetadataNumber(
        normalizedSignals.liquidity,
        'liquidityUsd',
    );

    const holderCount = getMetadataNumber(
        normalizedSignals.holders,
        'holderCount',
    );

    const walletFlowRatio = getMetadataNumber(
        normalizedSignals.walletFlow,
        'originalValue',
    );

    const walletFlowPositive = getMetadataBoolean(
        normalizedSignals.walletFlow,
        'isPositive',
    );

    /*
     * QUIET ACCUMULATION
     *
     * Requires:
     * - meaningful holder breadth
     * - positive wallet flow
     * - low market attention
     * - non-extreme momentum
     */
    if (
        isAvailable(normalizedSignals.holders) &&
        isAvailable(normalizedSignals.walletFlow) &&
        isAvailable(normalizedSignals.attention) &&
        isAvailable(normalizedSignals.momentum)
    ) {
        const holderBasePresent =
            holderCount !== null && holderCount >= 100;

        const walletsAccumulating =
            walletFlow >=
                CONFIG.PATTERN_THRESHOLDS.QUIET_ACCUMULATION.walletFlowMin &&
            walletFlowPositive === true;

        const attentionQuiet =
            attention <
            CONFIG.PATTERN_THRESHOLDS.QUIET_ACCUMULATION.attentionMax;

        const momentumQuiet =
            momentum <
            CONFIG.PATTERN_THRESHOLDS.QUIET_ACCUMULATION.momentumMax;

        if (
            holderBasePresent &&
            walletsAccumulating &&
            attentionQuiet &&
            momentumQuiet
        ) {
            evidence.push({
                description:
                    `Tracked wallet activity shows positive net token flow ` +
                    `(${formatNumber(walletFlowRatio)} flow ratio), ` +
                    `while the token has ${formatNumber(holderCount)} current holders, ` +
                    `market attention remains low (${formatNumber(attention)}), ` +
                    `and 24h price momentum remains limited ` +
                    `(${formatNumber(momentumOriginal)}% change).`,
                contributingSignals: [
                    'holders',
                    'walletFlow',
                    'attention',
                    'momentum',
                ],
                signalValues: {
                    holders,
                    walletFlow,
                    attention,
                    momentum,
                },
            });

            return {
                pattern: 'quiet_accumulation',
                evidence,
                riskFlags,
            };
        }
    }

    /*
     * MOMENTUM BREAKOUT
     *
     * Requires:
     * - strong positive price momentum
     * - sufficient liquidity
     * - meaningful holder breadth
     * - elevated market attention
     */
    if (
        isAvailable(normalizedSignals.momentum) &&
        isAvailable(normalizedSignals.liquidity) &&
        isAvailable(normalizedSignals.holders) &&
        isAvailable(normalizedSignals.attention)
    ) {
        const strongPositiveMomentum =
            momentum >=
                CONFIG.PATTERN_THRESHOLDS.MOMENTUM_BREAKOUT.momentumMin &&
            momentumOriginal !== null &&
            momentumOriginal > 0;

        const sufficientLiquidity =
            liquidity >=
            CONFIG.PATTERN_THRESHOLDS.MOMENTUM_BREAKOUT.liquidityMin;

        const establishedHolderBase =
            holders >=
            CONFIG.PATTERN_THRESHOLDS.MOMENTUM_BREAKOUT.holderLevelMin;

        const elevatedAttention =
            attention >=
            CONFIG.PATTERN_THRESHOLDS.MOMENTUM_BREAKOUT.attentionMin;

        if (
            strongPositiveMomentum &&
            sufficientLiquidity &&
            establishedHolderBase &&
            elevatedAttention
        ) {
            evidence.push({
                description:
                    `Strong positive momentum ` +
                    `(${formatNumber(momentumOriginal)}% 24h change), ` +
                    `sufficient liquidity ` +
                    `(${formatNumber(liquidityOriginal)} USD), ` +
                    `established holder breadth ` +
                    `(${formatNumber(holderCount)} holders), ` +
                    `and elevated market attention ` +
                    `(${formatNumber(attention)}).`,
                contributingSignals: [
                    'momentum',
                    'liquidity',
                    'holders',
                    'attention',
                ],
                signalValues: {
                    momentum,
                    liquidity,
                    holders,
                    attention,
                },
            });

            return {
                pattern: 'momentum_breakout',
                evidence,
                riskFlags,
            };
        }
    }

    /*
     * SOCIAL / MARKET-ATTENTION HYPE
     *
     * This is explicitly based on market attention.
     * It does not claim to represent social-media mentions.
     */
    if (isAvailable(normalizedSignals.attention)) {
        const highAttention =
            attention >=
            CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.attentionMin;

        const weakMomentum =
            momentum <
            CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.momentumMax;

        const lowLiquidity =
            liquidity <
            CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.liquidityMax;

        const weakHolderBase =
            !isAvailable(normalizedSignals.holders) ||
            holders <
                CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.holderLevelMax;

        const weakWalletFlow =
            !isAvailable(normalizedSignals.walletFlow) ||
            walletFlow <
                CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.walletFlowMax;

        if (
            highAttention &&
            weakMomentum &&
            lowLiquidity &&
            weakHolderBase &&
            weakWalletFlow
        ) {
            evidence.push({
                description:
                    `Market attention is elevated ` +
                    `(${formatNumber(attention)}) while momentum, ` +
                    `liquidity, holder breadth, and tracked-wallet flow ` +
                    `remain comparatively weak.`,
                contributingSignals: [
                    'attention',
                    'momentum',
                    'liquidity',
                    'holders',
                    'walletFlow',
                ],
                signalValues: {
                    attention,
                    momentum,
                    liquidity,
                    holders,
                    walletFlow,
                },
            });

            return {
                pattern: 'social_only_hype',
                evidence,
                riskFlags,
            };
        }
    }

    /*
     * DISTRIBUTION
     *
     * Requires NEGATIVE wallet flow.
     *
     * A low current wallet balance alone does not prove distribution.
     */
    if (
        isAvailable(normalizedSignals.walletFlow) &&
        isAvailable(normalizedSignals.holders) &&
        isAvailable(normalizedSignals.momentum)
    ) {
        const weakHolderBase =
            holders < CONFIG.PATTERN_THRESHOLDS.DISTRIBUTION.holderLevelMax;

        const walletDistribution =
            walletFlow <
                CONFIG.PATTERN_THRESHOLDS.DISTRIBUTION.walletFlowMax &&
            walletFlowPositive === false;

        const negativeMomentum =
            momentumOriginal !== null &&
            momentumOriginal < 0 &&
            momentum <
                CONFIG.PATTERN_THRESHOLDS.DISTRIBUTION.momentumMax;

        if (
            weakHolderBase &&
            walletDistribution &&
            negativeMomentum
        ) {
            evidence.push({
                description:
                    `Tracked wallets show negative net flow ` +
                    `(${formatNumber(walletFlowRatio)}), holder breadth is low ` +
                    `(${formatNumber(holderCount)} holders), and price momentum ` +
                    `is negative (${formatNumber(momentumOriginal)}% 24h change).`,
                contributingSignals: [
                    'walletFlow',
                    'holders',
                    'momentum',
                ],
                signalValues: {
                    walletFlow,
                    holders,
                    momentum,
                },
            });

            return {
                pattern: 'distribution',
                evidence,
                riskFlags,
            };
        }
    }

    /*
     * LIQUIDITY RISK
     *
     * This is a risk flag rather than necessarily a market pattern.
     */
    if (isAvailable(normalizedSignals.liquidity)) {
        const lowLiquidity =
            liquidity <
            CONFIG.PATTERN_THRESHOLDS.LIQUIDITY_RISK.liquidityMax;

        if (lowLiquidity) {
            riskFlags.push({
                type: 'liquidity_risk',
                severity: 'high',
                description:
                    `Liquidity is low (${formatNumber(
                        liquidityOriginal,
                    )} USD), which may indicate elevated execution risk.`,
                signal: 'liquidity',
            });

            evidence.push({
                description:
                    `Low liquidity detected (${formatNumber(
                        liquidityOriginal,
                    )} USD), which may increase execution risk for larger trades.`,
                contributingSignals: ['liquidity'],
                signalValues: {
                    liquidity,
                },
            });

            return {
                pattern: 'liquidity_risk',
                evidence,
                riskFlags,
            };
        }
    }

    /*
     * No clear convergence.
     */
    const availableSignals = (
        Object.keys(normalizedSignals) as (keyof Signals)[]
    ).filter((key) => isAvailable(normalizedSignals[key]));

    evidence.push({
        description:
            'No strong convergence pattern detected from the available signals.',
        contributingSignals: availableSignals,
        signalValues: {
            momentum,
            liquidity,
            holders,
            walletFlow,
            attention,
        },
    });

    return {
        pattern: null,
        evidence,
        riskFlags,
    };
}

function formatNumber(value: number | null): string {
    if (value === null) {
        return 'unavailable';
    }

    return value.toLocaleString('en-US', {
        maximumFractionDigits: 2,
    });
}