// Core types for Degen Radar

export interface SignalValue {
    value: number | null;
    timestamp: number; // Unix timestamp in milliseconds
    source: string;
    available: boolean;
    metadata?: Record<string, unknown>;
}

export interface Signals {
    momentum: SignalValue;
    liquidity: SignalValue;
    holders: SignalValue;
    walletFlow: SignalValue;
    attention: SignalValue;
}

export interface PatternEvidence {
    description: string;
    contributingSignals: (keyof Signals)[];
    signalValues: Partial<Record<keyof Signals, number>>;
}

export interface RiskFlag {
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    signal: keyof Signals | 'general';
}

export type ConvergenceStrength = 'strong' | 'moderate' | 'weak' | 'none';

export type SignalName = keyof Signals;

export interface Convergence {
    status: ConvergenceStrength;
    supportingSignals: SignalName[];
    contradictingSignals: SignalName[];
    unavailableSignals: SignalName[];
    reason: string;
}

export interface PatternAnalysis {
    name: string | null;
    reason: string;
    confidence: ConvergenceStrength;
    supportingSignals: SignalName[];
    contradictingSignals: SignalName[];
}

export interface ResearchSummary {
    headline: string;
    interpretation: string;
    limitations: string[];
}

export interface RadarResult {
    id: string;
    token: string;
    tokenAddress: string;
    chain: 'solana';
    timestamp: number;
    radarScore: number;

    pattern: string | null;

    signals: {
        momentum: SignalValue;
        liquidity: SignalValue;
        holders: SignalValue;
        walletFlow: SignalValue;
        attention: SignalValue;
    };

    convergence: Convergence;

    patternAnalysis: PatternAnalysis;

    researchSummary: ResearchSummary;

    evidence: PatternEvidence[];

    riskFlags: RiskFlag[];

    sourceData: {
        observationWindowHours: number;
        processedAt: number;
        apiSourcesUsed: string[];
    };

    discoveredAt: number;
}

export interface ActorInput {
    tokenAddresses: string[]; // Solana token addresses to analyze
    maxTokens?: number; // Maximum number of tokens to process
    observationWindowHours?: number; // Hours to look back for signal calculation
    minSignalAvailability?: number; // Minimum percentage of signals that must be available (0-1)
    enabledSignalCategories?: (
        | 'momentum'
        | 'liquidity'
        | 'holders'
        | 'walletFlow'
        | 'attention'
    )[];
    trackedWalletAddresses?: string[]; // Optional wallet addresses to track for flow
    attentionSources?: (
        | 'twitter'
        | 'reddit'
        | 'telegram'
        | 'news'
    )[]; // Attention sources to monitor
}