// Radar Score calculation - combines normalized signals into a single score

import { CONFIG } from '../config/index.js';
import type { Signals } from '../types/index.js';

/**
 * Calculates Radar Score from normalized signals
 */
export function calculateRadarScore(normalizedSignals: Signals): number {
  const weights = CONFIG.SCORE_WEIGHTS;
  let score = 0;
  let totalWeight = 0;

  // Add weighted score for each available signal
  if (normalizedSignals.momentum.available && normalizedSignals.momentum.value !== null) {
    score += normalizedSignals.momentum.value * weights.momentum;
    totalWeight += weights.momentum;
  }

  if (normalizedSignals.liquidity.available && normalizedSignals.liquidity.value !== null) {
    score += normalizedSignals.liquidity.value * weights.liquidity;
    totalWeight += weights.liquidity;
  }

  if (normalizedSignals.holders.available && normalizedSignals.holders.value !== null) {
    score += normalizedSignals.holders.value * weights.holders;
    totalWeight += weights.holders;
  }

  if (normalizedSignals.walletFlow.available && normalizedSignals.walletFlow.value !== null) {
    score += normalizedSignals.walletFlow.value * weights.walletFlow;
    totalWeight += weights.walletFlow;
  }

  if (normalizedSignals.attention.available && normalizedSignals.attention.value !== null) {
    score += normalizedSignals.attention.value * weights.attention;
    totalWeight += weights.attention;
  }

  // If no signals available, return 0
  if (totalWeight === 0) return 0;

  // Normalize by total weight to get 0-100 score
  return Math.min(100, Math.max(0, (score / totalWeight) * 100));
}