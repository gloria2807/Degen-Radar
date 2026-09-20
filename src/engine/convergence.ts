// Convergence engine - detects patterns based on signal combinations

import { CONFIG } from '../config/index.js';
import type {
  PatternEvidence,
  RiskFlag,
  SignalValue,
  Signals,
} from '../types/index.js';

/**
 * Detects convergence patterns from normalized signals
 *
 * Signal Interpretations (after normalization to 0-100 scale):
 * - momentum: 24h price change percentage (absolute value, so high = big move either direction)
 * - liquidity: current liquidity level in USD (higher = more liquid)
 * - holders: current holder count (higher = more holders)
 * - walletFlow: current token balance held by tracked wallets (higher = more held)
 * - attention: social mention volume in last 24h (higher = more social activity)
 */
export function detectPatterns(normalizedSignals: Signals): {
  pattern: string | null;
  evidence: PatternEvidence[];
  riskFlags: RiskFlag[]
} {
  const evidence: PatternEvidence[] = [];
const riskFlags: RiskFlag[] = [];

const getMetadataNumber = (
  signal: SignalValue,
  key: string
): number => {
  const value = signal.metadata?.[key];
  return typeof value === 'number' ? value : 0;
};

  // Helper to check if signal is available and has value
  const isAvailable = (signal: SignalValue): boolean =>
    signal.available && signal.value !== null;

  // Extract values for easier access (all are 0-100 normalized values)
  const mom = normalizedSignals.momentum.value ?? 0; // 24h price change % (absolute)
  const liq = normalizedSignals.liquidity.value ?? 0; // liquidity level
  const hold = normalizedSignals.holders.value ?? 0; // holder count level
  const wf = normalizedSignals.walletFlow.value ?? 0; // wallet holdings level
  const att = normalizedSignals.attention.value ?? 0; // attention level (24h post count)

  // Get original values for evidence
  const momOrig = getMetadataNumber(
  normalizedSignals.momentum,
  'originalValue'
);

const liqOrig = getMetadataNumber(
  normalizedSignals.liquidity,
  'liquidityUsd'
);

const wfOrig = getMetadataNumber(
  normalizedSignals.walletFlow,
  'originalValue'
);

const holdOrig = getMetadataNumber(
  normalizedSignals.holders,
  'holderCount'
);

const attOrig = getMetadataNumber(
  normalizedSignals.attention,
  'totalPosts'
);

  // Check for Quiet Accumulation pattern
  // Adapted interpretation:
  // * holder level is high (established holder base)
  // * tracked wallets hold significant amount of tokens
  // * attention volume is still relatively low
  // * price momentum has not yet become extreme (not pumping yet)
  if (isAvailable(normalizedSignals.holders) &&
      isAvailable(normalizedSignals.walletFlow) &&
      isAvailable(normalizedSignals.attention) &&
      isAvailable(normalizedSignals.momentum)) {

    const holderLevelHigh =
      hold >= CONFIG.PATTERN_THRESHOLDS.QUIET_ACCUMULATION.holderLevelMin; // e.g., holder count high

    const walletBalanceSignificant =
      wf >= CONFIG.PATTERN_THRESHOLDS.QUIET_ACCUMULATION.walletBalanceMin; // e.g., significant holdings

    const attentionLevelLow =
      att < CONFIG.PATTERN_THRESHOLDS.QUIET_ACCUMULATION.attentionMax; // e.g., low social activity

    const momentumNotExtreme =
      mom < CONFIG.PATTERN_THRESHOLDS.QUIET_ACCUMULATION.momentumMax; // e.g., not extreme 24h move

    if (holderLevelHigh && walletBalanceSignificant && attentionLevelLow && momentumNotExtreme) {
      evidence.push({
        description: `Holder level is high (${holdOrig.toFixed(0)} holders), tracked wallets hold significant token amount (${wfOrig.toFixed(2)} tokens), attention is low (${attOrig.toFixed(0)} posts/24h), and momentum is not extreme (${momOrig.toFixed(2)}% 24h change)`,
        contributingSignals: ['holders', 'walletFlow', 'attention', 'momentum'],
        signalValues: {
          holders: hold,
          walletFlow: wf,
          attention: att,
          momentum: mom
        }
      });
      return {
        pattern: 'quiet_accumulation',
        evidence,
        riskFlags
      };
    }
  }

  // Check for Momentum Breakout pattern
  // Adapted interpretation:
  // * momentum is strongly positive (note: we use absolute value, so we need to check sign separately)
  // * liquidity is sufficient
  // * holder level is substantial (established base can support growth)
  // * attention level is elevated (current social buzz)
  if (isAvailable(normalizedSignals.momentum) &&
      isAvailable(normalizedSignals.liquidity) &&
      isAvailable(normalizedSignals.holders) &&
      isAvailable(normalizedSignals.attention)) {

    const strongPositiveMomentum =
      momOrig >= CONFIG.PATTERN_THRESHOLDS.MOMENTUM_BREAKOUT.momentumMin && // e.g., strong positive 24h change
      momOrig > 0; // Positive momentum (not absolute value)

    const sufficientLiquidity =
      liqOrig >= CONFIG.PATTERN_THRESHOLDS.MOMENTUM_BREAKOUT.liquidityMin; // e.g., sufficient liquidity USD

    const holderLevelSubstantial =
      holdOrig >= CONFIG.PATTERN_THRESHOLDS.MOMENTUM_BREAKOUT.holderLevelMin; // e.g., substantial holder base

    const attentionLevelElevated =
      attOrig >= CONFIG.PATTERN_THRESHOLDS.MOMENTUM_BREAKOUT.attentionMin; // e.g., elevated social activity

    if (strongPositiveMomentum && sufficientLiquidity && holderLevelSubstantial && attentionLevelElevated) {
      evidence.push({
        description: `Strong positive momentum (${momOrig.toFixed(2)}% 24h change), sufficient liquidity (${liqOrig.toFixed(0)} USD), substantial holder base (${holdOrig.toFixed(0)} holders), and elevated social activity (${attOrig.toFixed(0)} posts/24h)`,
        contributingSignals: ['momentum', 'liquidity', 'holders', 'attention'],
        signalValues: {
          momentum: mom,
          liquidity: liq,
          holders: hold,
          attention: att
        }
      });
      return {
        pattern: 'momentum_breakout',
        evidence,
        riskFlags
      };
    }
  }

  // Check for Social-Only Hype pattern
  // Adapted interpretation:
  // * attention level is high
  // * but holder level, wallet balance, liquidity level or positive momentum do not provide comparable confirmation
  if (isAvailable(normalizedSignals.attention)) {
    const highAttentionLevel =
      att >= CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.attentionMin; // e.g., high social activity

    const weakOrNegativeMomentum =
      momOrig < CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.momentumMax || // e.g., not strong positive momentum
      momOrig <= 0; // Zero or negative momentum

    const lowLiquidityLevel =
      liqOrig < CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.liquidityMax; // e.g., low liquidity

    const lowHolderLevel =
  holdOrig < CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.holderLevelMax;

    const lowWalletBalance =
  wfOrig < CONFIG.PATTERN_THRESHOLDS.SOCIAL_ONLY_HYPE.walletBalanceMax;
    if (highAttentionLevel && weakOrNegativeMomentum && lowLiquidityLevel && lowHolderLevel && lowWalletBalance) {
      evidence.push({
        description: `High social media attention (${attOrig.toFixed(0)} posts/24h) without corresponding momentum (${momOrig.toFixed(2)}% 24h change), liquidity (${liqOrig.toFixed(0)} USD), holder base (${holdOrig.toFixed(0)} holders), or wallet holdings (${wfOrig.toFixed(2)} tokens)`,
        contributingSignals: ['attention'],
        signalValues: {
          attention: att
        }
      });
      return {
        pattern: 'social_only_hype',
        evidence,
        riskFlags
      };
    }
  }

  // Check for Distribution pattern
  // Adapted interpretation (since we can't measure flow/change directly):
  // * holder level is low (declining interest)
  // * wallet balance is low or decreasing relative to expectation (but we only have current level)
  // * momentum is negative/weakening
  // * liquidity may be deteriorating
  if (isAvailable(normalizedSignals.walletFlow) &&
      isAvailable(normalizedSignals.holders) &&
      isAvailable(normalizedSignals.momentum)) {

    const holderLevelLow =
      holdOrig < CONFIG.PATTERN_THRESHOLDS.DISTRIBUTION.holderLevelMax; // e.g., holder count declining

    const walletBalanceLow =
      wfOrig < CONFIG.PATTERN_THRESHOLDS.DISTRIBUTION.walletBalanceMax; // e.g., low wallet holdings

    const momentumWeakening =
      momOrig < CONFIG.PATTERN_THRESHOLDS.DISTRIBUTION.momentumMax && // e.g., momentum weakening
      momOrig < 0; // Negative momentum

    if (holderLevelLow && walletBalanceLow && momentumWeakening) {
      evidence.push({
        description: `Low holder count (${holdOrig.toFixed(0)} holders), low tracked wallet holdings (${wfOrig.toFixed(2)} tokens), and negative momentum (${momOrig.toFixed(2)}% 24h change)`,
        contributingSignals: ['walletFlow', 'holders', 'momentum'],
        signalValues: {
          walletFlow: wf,
          holders: hold,
          momentum: mom
        }
      });
      return {
        pattern: 'distribution',
        evidence,
        riskFlags
      };
    }
  }

  // Check for Liquidity Risk pattern
  // Adapted interpretation:
  // * liquidity is low (may indicate elevated execution risk)
  if (isAvailable(normalizedSignals.liquidity)) {
    const lowLiquidity =
      liqOrig < CONFIG.PATTERN_THRESHOLDS.LIQUIDITY_RISK.liquidityMax; // e.g., low liquidity USD

    // We would need volatility data for a complete check
    // For now, just flag based on low liquidity
    if (lowLiquidity) {
      riskFlags.push({
        type: 'liquidity_risk',
        severity: 'high',
        description: `Liquidity is low (${liqOrig.toFixed(0)} USD), which may indicate elevated execution risk`,
        signal: 'liquidity'
      });

      evidence.push({
        description: `Low liquidity detected (${liqOrig.toFixed(0)} USD) which may pose execution risks for larger trades`,
        contributingSignals: ['liquidity'],
        signalValues: {
          liquidity: liq
        }
      });
      return {
        pattern: 'liquidity_risk',
        evidence,
        riskFlags
      };
    }
  }

  // No clear pattern detected
  return {
    pattern: null,
    evidence: evidence.length > 0 ? evidence : [{
      description: 'No strong convergence pattern detected from available signals',
      contributingSignals: Object.keys(normalizedSignals).filter(k =>
        normalizedSignals[k as keyof Signals].available) as (keyof Signals)[],
      signalValues: {}
    }],
    riskFlags
  };
}