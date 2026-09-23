import type {
    Convergence,
    PatternAnalysis,
    SignalValue,
    Signals,
} from '../types/index.js';

type SignalName = keyof Signals;

const SIGNAL_NAMES: SignalName[] = [
    'momentum',
    'liquidity',
    'holders',
    'walletFlow',
    'attention',
];

function isAvailable(signal: SignalValue): boolean {
    return signal.available && signal.value !== null;
}

function getAvailableSignalNames(signals: Signals): SignalName[] {
    return SIGNAL_NAMES.filter((name) => isAvailable(signals[name]));
}

function getUnavailableSignalNames(signals: Signals): SignalName[] {
    return SIGNAL_NAMES.filter((name) => !isAvailable(signals[name]));
}

function getMetadataNumber(
    signal: SignalValue,
    key: string,
): number | null {
    const value = signal.metadata?.[key];

    return typeof value === 'number' ? value : null;
}

function getMetadataBoolean(
    signal: SignalValue,
    key: string,
): boolean | null {
    const value = signal.metadata?.[key];

    return typeof value === 'boolean' ? value : null;
}

/**
 * Determines which signals support or contradict the pattern
 * that has already been detected by the existing convergence engine.
 *
 * This function does NOT detect a new pattern.
 * detectPatterns() remains the single source of truth for pattern detection.
 */
function analyzePatternEvidence(
    pattern: string | null,
    signals: Signals,
): {
    supportingSignals: SignalName[];
    contradictingSignals: SignalName[];
} {
    const supportingSignals: SignalName[] = [];
    const contradictingSignals: SignalName[] = [];

    if (!pattern) {
        return {
            supportingSignals,
            contradictingSignals,
        };
    }

    const momentum = signals.momentum.value ?? 0;
    const liquidity = signals.liquidity.value ?? 0;
    const holders = signals.holders.value ?? 0;
    const walletFlow = signals.walletFlow.value ?? 0;
    const attention = signals.attention.value ?? 0;

    const momentumOriginal = getMetadataNumber(
        signals.momentum,
        'originalValue',
    );

    const holderCount = getMetadataNumber(
        signals.holders,
        'holderCount',
    );

    const walletFlowPositive = getMetadataBoolean(
        signals.walletFlow,
        'isPositive',
    );

    switch (pattern) {
        case 'quiet_accumulation': {
            /*
             * The existing detector requires:
             * - holder count >= 100
             * - positive wallet flow
             * - wallet flow >= configured threshold
             * - attention < threshold
             * - momentum < threshold
             */

            if (isAvailable(signals.holders)) {
                if (holderCount !== null && holderCount >= 100) {
                    supportingSignals.push('holders');
                } else {
                    contradictingSignals.push('holders');
                }
            }

            if (isAvailable(signals.walletFlow)) {
                if (walletFlowPositive === true && walletFlow >= 60) {
                    supportingSignals.push('walletFlow');
                } else {
                    contradictingSignals.push('walletFlow');
                }
            }

            if (isAvailable(signals.attention)) {
                if (attention < 40) {
                    supportingSignals.push('attention');
                } else {
                    contradictingSignals.push('attention');
                }
            }

            if (isAvailable(signals.momentum)) {
                if (momentum < 30) {
                    supportingSignals.push('momentum');
                } else {
                    contradictingSignals.push('momentum');
                }
            }

            break;
        }

        case 'momentum_breakout': {
    /*
     * Existing detector:
     * - strong positive momentum
     * - sufficient liquidity
     * - sufficient holder breadth
     * - sufficient market attention
     * - wallet flow is optional
     */

    if (isAvailable(signals.momentum)) {
        if (momentum >= 70) {
            supportingSignals.push('momentum');
        } else {
            contradictingSignals.push('momentum');
        }
    }

    if (isAvailable(signals.liquidity)) {
        if (liquidity >= 50) {
            supportingSignals.push('liquidity');
        } else {
            contradictingSignals.push('liquidity');
        }
    }

    if (isAvailable(signals.holders)) {
        if (holders >= 40) {
            supportingSignals.push('holders');
        } else {
            contradictingSignals.push('holders');
        }
    }

    if (isAvailable(signals.attention)) {
        if (attention >= 50) {
            supportingSignals.push('attention');
        } else {
            contradictingSignals.push('attention');
        }
    }

    if (isAvailable(signals.walletFlow)) {
        if (walletFlow >= 50) {
            supportingSignals.push('walletFlow');
        } else {
            contradictingSignals.push('walletFlow');
        }
    }

    break;
}

        case 'social_only_hype': {
            /*
             * Existing detector:
             * - high attention
             * - weak momentum
             * - low liquidity
             * - weak holders
             * - weak/unavailable wallet flow
             */

            if (isAvailable(signals.attention)) {
                if (attention >= 70) {
                    supportingSignals.push('attention');
                } else {
                    contradictingSignals.push('attention');
                }
            }

            if (isAvailable(signals.momentum)) {
                if (momentum < 30) {
                    supportingSignals.push('momentum');
                } else {
                    contradictingSignals.push('momentum');
                }
            }

            if (isAvailable(signals.liquidity)) {
                if (liquidity < 30) {
                    supportingSignals.push('liquidity');
                } else {
                    contradictingSignals.push('liquidity');
                }
            }

            if (isAvailable(signals.holders)) {
                if (holders < 30) {
                    supportingSignals.push('holders');
                } else {
                    contradictingSignals.push('holders');
                }
            }

            if (isAvailable(signals.walletFlow)) {
                if (walletFlow < 30) {
                    supportingSignals.push('walletFlow');
                } else {
                    contradictingSignals.push('walletFlow');
                }
            }

            break;
        }

        case 'distribution': {
            /*
             * Existing detector:
             * - weak holder breadth
             * - negative wallet flow
             * - negative momentum
             */

            if (isAvailable(signals.holders)) {
                if (holders < 30) {
                    supportingSignals.push('holders');
                } else {
                    contradictingSignals.push('holders');
                }
            }

            if (isAvailable(signals.walletFlow)) {
                if (walletFlow < 30 && walletFlowPositive === false) {
                    supportingSignals.push('walletFlow');
                } else {
                    contradictingSignals.push('walletFlow');
                }
            }

            if (isAvailable(signals.momentum)) {
                if (
                    momentumOriginal !== null &&
                    momentumOriginal < 0 &&
                    momentum < 30
                ) {
                    supportingSignals.push('momentum');
                } else {
                    contradictingSignals.push('momentum');
                }
            }

            break;
        }

        case 'liquidity_risk': {
            /*
             * Liquidity risk is primarily a risk condition,
             * rather than a multi-signal market pattern.
             */

            if (isAvailable(signals.liquidity)) {
                if (liquidity < 20) {
                    supportingSignals.push('liquidity');
                } else {
                    contradictingSignals.push('liquidity');
                }
            }

            break;
        }

        default:
            break;
    }

    return {
        supportingSignals,
        contradictingSignals,
    };
}

function getConvergenceStrength(
    supportingCount: number,
    contradictingCount: number,
): Convergence['status'] {
    const totalEvaluated = supportingCount + contradictingCount;

    if (totalEvaluated === 0) {
        return 'none';
    }

    const supportRatio = supportingCount / totalEvaluated;

    if (supportRatio >= 0.8 && supportingCount >= 3) {
        return 'strong';
    }

    if (supportRatio >= 0.6 && supportingCount >= 2) {
        return 'moderate';
    }

    if (supportingCount > contradictingCount) {
        return 'weak';
    }

    return 'none';
}

export function analyzeConvergence(
    signals: Signals,
    pattern: string | null,
): {
    convergence: Convergence;
    patternAnalysis: PatternAnalysis;
} {
    const unavailableSignals =
        getUnavailableSignalNames(signals);

    const availableSignals =
        getAvailableSignalNames(signals);

    const {
        supportingSignals,
        contradictingSignals,
    } = analyzePatternEvidence(pattern, signals);

    const strength = pattern
        ? getConvergenceStrength(
              supportingSignals.length,
              contradictingSignals.length,
          )
        : 'none';

    let reason: string;

    if (!pattern) {
        reason =
            'The available signals do not satisfy the conditions for any predefined pattern.';
    } else if (strength === 'strong') {
        reason =
            `${supportingSignals.length} available signals support the detected pattern with limited contradiction.`;
    } else if (strength === 'moderate') {
        reason =
            `${supportingSignals.length} available signals support the detected pattern, with some uncertainty or contradiction.`;
    } else if (strength === 'weak') {
        reason =
            'The detected pattern has more supporting than contradicting evidence, but the convergence is limited.';
    } else {
        reason =
            'The detected pattern has insufficient supporting evidence relative to contradicting signals.';
    }

    const convergence: Convergence = {
        status: strength,
        supportingSignals,
        contradictingSignals,
        unavailableSignals,
        reason,
    };

    const patternAnalysis: PatternAnalysis = {
        name: pattern,
        reason,
        confidence: strength,
        supportingSignals,
        contradictingSignals,
    };

    /*
     * availableSignals is intentionally calculated here so that
     * the convergence layer has an explicit view of the data
     * it was able to evaluate.
     *
     * The variable is currently not included in the output because
     * unavailableSignals already communicates the missing data.
     */
    void availableSignals;

    return {
        convergence,
        patternAnalysis,
    };
}