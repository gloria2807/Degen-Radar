// Signal normalization layer - converts raw signals to 0-100 scores

import { CONFIG } from '../config/index.js';
import type { Signals } from '../types/index.js';

/**
 * Normalizes raw signal values to 0-100 scores
 */
export function normalizeSignals(rawSignals: Signals): Signals {
    const normalized: Signals = {
        momentum: { ...rawSignals.momentum },
        liquidity: { ...rawSignals.liquidity },
        holders: { ...rawSignals.holders },
        walletFlow: { ...rawSignals.walletFlow },
        attention: { ...rawSignals.attention },
    };

    // Normalize momentum (percentage change, can be negative)
    if (rawSignals.momentum.available && rawSignals.momentum.value !== null) {
        // For momentum, we want to detect significant changes (both up and down)
        // We'll use absolute value for scoring but keep sign in metadata
        const absChange = Math.abs(rawSignals.momentum.value);
        normalized.momentum.value = normalizeValue(absChange, {
            low: CONFIG.MOMENTUM_THRESHOLDS.LOW,
            medium: CONFIG.MOMENTUM_THRESHOLDS.MEDIUM,
            high: CONFIG.MOMENTUM_THRESHOLDS.HIGH,
        });
        normalized.momentum.metadata = {
            ...rawSignals.momentum.metadata,
            originalValue: rawSignals.momentum.value,
            isPositive: rawSignals.momentum.value >= 0,
        };
    }

    // Normalize liquidity (higher is better)
    if (rawSignals.liquidity.available && rawSignals.liquidity.value !== null) {
        normalized.liquidity.value = normalizeValue(rawSignals.liquidity.value, {
            low: CONFIG.LIQUIDITY_THRESHOLDS.LOW,
            medium: CONFIG.LIQUIDITY_THRESHOLDS.MEDIUM,
            high: CONFIG.LIQUIDITY_THRESHOLDS.HIGH,
        });
    }

    if (rawSignals.holders.available && rawSignals.holders.value !== null) {
        normalized.holders.value = normalizeValue(rawSignals.holders.value, {
            low: 100,
            medium: 1000,
            high: 10000,
        });

        normalized.holders.metadata = {
            ...rawSignals.holders.metadata,
            originalValue: rawSignals.holders.value,
        };
    }

    // Normalize wallet flow (net flow, can be negative)
    if (rawSignals.walletFlow.available && rawSignals.walletFlow.value !== null) {
        // Similar to momentum, we care about magnitude of flow
        const absFlow = Math.abs(rawSignals.walletFlow.value);
        normalized.walletFlow.value = normalizeValue(
            absFlow,
            { low: 0.01, medium: 0.05, high: 0.2 }, // As percentage of volume
        );
        normalized.walletFlow.metadata = {
            ...rawSignals.walletFlow.metadata,
            originalValue: rawSignals.walletFlow.value,
            isPositive: rawSignals.walletFlow.value > 0,
        };
    }

    // Normalize attention (score or count, higher is better)
    if (rawSignals.attention.available && rawSignals.attention.value !== null) {
        // Assuming attention is already a 0-100 score or similar metric
        normalized.attention.value = Math.min(100, Math.max(0, rawSignals.attention.value));
    }

    return normalized;
}

/**
 * Normalizes a value to a 0-100 scale based on thresholds
 */
function normalizeValue(
    value: number | null,
    thresholds: { low: number; medium: number; high: number },
    reverse = false,
): number | null {
    if (value === null) return null;

    // For metrics where higher is better (like liquidity)
    if (!reverse) {
        if (value >= thresholds.high) return 100;
        if (value >= thresholds.medium)
            return 50 + ((value - thresholds.medium) / (thresholds.high - thresholds.medium)) * 50;
        if (value >= thresholds.low) return ((value - thresholds.low) / (thresholds.medium - thresholds.low)) * 50;
        return 0;
    }
    // For metrics where lower is better (like risk)

    if (value <= thresholds.low) return 100;
    if (value <= thresholds.medium)
        return 50 + ((thresholds.medium - value) / (thresholds.medium - thresholds.low)) * 50;
    if (value <= thresholds.high) return ((thresholds.high - value) / (thresholds.high - thresholds.medium)) * 50;
    return 0;
}
